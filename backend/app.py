import os
import pickle
import time
import threading
from collections import defaultdict
from functools import wraps

from flask import Flask, redirect, request, session, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
import mysql.connector
import pandas as pd
import traceback
from sklearn.neighbors import NearestNeighbors
from spotipy.cache_handler import CacheHandler

load_dotenv()

IS_PRODUCTION = os.getenv("FLASK_ENV") == "production"
FRONTEND_ORIGIN = os.getenv("FRONTEND_URI", "http://localhost:3000").rstrip("/")

_ALLOWED_ORIGIN_SCHEMES = ("http://", "https://")
def _is_safe_redirect_origin(url):
    if not url or len(url) > 2048:
        return False
    return url.startswith(_ALLOWED_ORIGIN_SCHEMES) and " " not in url and "\n" not in url


def _require_env(*keys):
    missing = [k for k in keys if not os.getenv(k)]
    if missing and IS_PRODUCTION:
        raise RuntimeError(f"Missing required env: {', '.join(missing)}")


def _safe_frontend_redirect(path=""):
    path = path or "/"
    if not path.startswith("/"):
        path = "/" + path
    if _is_safe_redirect_origin(FRONTEND_ORIGIN):
        return f"{FRONTEND_ORIGIN.rstrip('/')}{path}"
    return "http://localhost:3000/"


class SessionCacheHandler(CacheHandler):
    def __init__(self, session_key="token_info"):
        self.session_key = session_key

    def get_cached_token(self):
        return session.get(self.session_key)

    def save_token_to_cache(self, token_info):
        session[self.session_key] = token_info


_require_env("FLASK_SECRET_KEY")

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY") or "dev-secret-change-in-production"
app.config["SESSION_COOKIE_SECURE"] = IS_PRODUCTION
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["JSON_SORT_KEYS"] = False

_safe_origins = [FRONTEND_ORIGIN] if _is_safe_redirect_origin(FRONTEND_ORIGIN) else True
CORS(
    app,
    supports_credentials=True,
    origins=_safe_origins,
    allow_headers=["Content-Type"],
)

_db = None
_cursor = None


def _get_cursor():
    global _db, _cursor
    if _cursor is None:
        _db = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST"),
            user=os.getenv("MYSQL_USER"),
            password=os.getenv("MYSQL_PASSWORD"),
            database=os.getenv("MYSQL_DATABASE"),
        )
        _cursor = _db.cursor()
    return _cursor


def _get_db():
    _get_cursor()
    return _db

sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI"),
    scope="user-read-email user-read-private user-top-read",
    cache_handler=SessionCacheHandler(),
    show_dialog=True,
)

df_full = None
df_knn = None
knn_model = None
track_by_id = None
artist_features_by_id = None

_dataset_lock = threading.Lock()
_dataset_ready = False
_dataset_loading = False

FEATURE_COLS = ["tempo", "energy", "valence", "danceability", "acousticness", "liveness"]

# Rate limiting: (timestamp, count) per IP
_rate_store = defaultdict(lambda: (0, 0))
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 120


LOAD_COLS = ["track_uri", "artist_uri", "track_name", "artist_name"] + FEATURE_COLS
DATASET_CACHE = "dataset_cache.pkl"
PRECOMPUTED_DIR = "precomputed"
PRECOMPUTED_ARTIFACTS = ["artist_features_by_id.pkl", "track_by_id.pkl", "df_knn.parquet", "knn_model.pkl"]


def _extract_ids_vectorized(series, prefix="track"):
    """Vectorized Spotify ID extraction from URIs/URLs."""
    s = series.astype(str).str.strip()
    is_url = s.str.contains("spotify.com", na=False)
    ids = pd.Series(index=s.index, dtype=object)
    ids[is_url] = s[is_url].str.rstrip("/").str.split("/").str[-1]
    ids[~is_url] = s[~is_url].str.replace(f"spotify:{prefix}:", "", regex=False)
    ids = ids.where(ids.str.len() == 22)
    return ids


def rate_limit(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        ip = request.remote_addr or "unknown"
        now = time.time()
        start, count = _rate_store[ip]
        if now - start > RATE_LIMIT_WINDOW:
            _rate_store[ip] = (now, 1)
        else:
            count += 1
            if count > RATE_LIMIT_MAX:
                return jsonify({"error": "Too many requests"}), 429
            _rate_store[ip] = (start, count)
        return f(*args, **kwargs)

    return decorated


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


def _load_from_csv():
    df = pd.read_csv(
        "spotify_tracks_cleaned_final.csv",
        usecols=LOAD_COLS,
    )
    df.dropna(subset=FEATURE_COLS, inplace=True)
    df["tempo"] = pd.to_numeric(df["tempo"], errors="coerce")
    df["track_id"] = _extract_ids_vectorized(df["track_uri"], "track")
    df["artist_id"] = _extract_ids_vectorized(df["artist_uri"], "artist")
    df = df[df["track_id"].notna() & df["artist_id"].notna()]
    return df


def _ensure_dataset(timeout=120):
    """Block until dataset is ready (or timeout). Returns True if ready."""
    global _dataset_loading
    if _dataset_ready:
        return True
    with _dataset_lock:
        if _dataset_ready:
            return True
        if not _dataset_loading:
            _dataset_loading = True
            threading.Thread(target=load_dataset, daemon=True).start()
    deadline = time.time() + timeout
    while not _dataset_ready and time.time() < deadline:
        time.sleep(0.2)
    return _dataset_ready


def _load_from_precomputed(backend_dir):
    """Load full-dataset artifacts from precomputed/ (from running precompute_dataset.py)."""
    global df_knn, knn_model, track_by_id, artist_features_by_id, _dataset_ready, _dataset_loading
    precomputed_dir = os.path.join(backend_dir, PRECOMPUTED_DIR)
    if not all(os.path.exists(os.path.join(precomputed_dir, a)) for a in PRECOMPUTED_ARTIFACTS):
        return False
    csv_path = os.path.join(backend_dir, "spotify_tracks_cleaned_final.csv")
    try:
        with open(os.path.join(precomputed_dir, "source_mtime.txt")) as f:
            source_mtime = float(f.read().strip())
    except Exception:
        source_mtime = 0
    if os.path.exists(csv_path) and os.path.getmtime(csv_path) > source_mtime:
        return False
    with open(os.path.join(precomputed_dir, "artist_features_by_id.pkl"), "rb") as f:
        artist_features_by_id = pickle.load(f)
    with open(os.path.join(precomputed_dir, "track_by_id.pkl"), "rb") as f:
        track_by_id = pickle.load(f)
    df_knn = pd.read_parquet(os.path.join(precomputed_dir, "df_knn.parquet"))
    with open(os.path.join(precomputed_dir, "knn_model.pkl"), "rb") as f:
        knn_model = pickle.load(f)
    _dataset_ready = True
    _dataset_loading = False
    print(f"Loaded precomputed: {len(track_by_id)} tracks, {len(artist_features_by_id)} artists, KNN ready.")
    return True


def load_dataset():
    global df_full, df_knn, knn_model, track_by_id, artist_features_by_id, _dataset_loading
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(backend_dir, "spotify_tracks_cleaned_final.csv")
    cache_path = os.path.join(backend_dir, DATASET_CACHE)

    if _load_from_precomputed(backend_dir):
        return

    parquet_path = cache_path.replace(".pkl", ".parquet")
    try:
        if os.path.exists(parquet_path) and os.path.getmtime(parquet_path) >= os.path.getmtime(csv_path):
            df_full = pd.read_parquet(parquet_path)
        elif os.path.exists(cache_path) and os.path.getmtime(cache_path) >= os.path.getmtime(csv_path):
            with open(cache_path, "rb") as f:
                df_full = pickle.load(f)
        else:
            df_full = _load_from_csv()
            try:
                df_full.to_parquet(parquet_path, index=False)
            except Exception:
                with open(cache_path, "wb") as f:
                    pickle.dump(df_full, f, protocol=4)
    except Exception:
        df_full = _load_from_csv()

    df_artist = df_full.groupby("artist_id", as_index=False)[FEATURE_COLS].mean()
    df_artist["artist_id"] = df_artist["artist_id"].astype(str)
    raw_artist = df_artist.set_index("artist_id")[FEATURE_COLS].to_dict("index")
    artist_features_by_id = {
        aid: {k: float(v) for k, v in row.items()}
        for aid, row in raw_artist.items()
    }

    df_first = df_full.drop_duplicates(subset=["track_id"], keep="first").copy()
    df_first["acousticness"] = df_first["acousticness"].fillna(0.5)
    df_first["liveness"] = df_first["liveness"].fillna(0.2)
    track_cols = ["track_name", "artist_name"] + FEATURE_COLS
    df_first["track_id"] = df_first["track_id"].astype(str)
    raw_track = df_first.set_index("track_id")[track_cols].to_dict("index")
    track_by_id = {
        tid: {k: float(v) if k in FEATURE_COLS else v for k, v in row.items()}
        for tid, row in raw_track.items()
    }

    df_knn = df_full.drop_duplicates(subset=["track_name", "artist_name"]).dropna(
        subset=FEATURE_COLS
    )
    knn_model = NearestNeighbors(n_neighbors=5, metric="euclidean")
    knn_model.fit(df_knn[FEATURE_COLS].values)
    global _dataset_ready
    _dataset_ready = True
    _dataset_loading = False
    print(f"Loaded {len(df_full)} tracks, {len(artist_features_by_id)} artists, KNN ready.")


def get_spotify_client():
    token_info = session.get("token_info")
    if not token_info:
        return None
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info["refresh_token"])
        session["token_info"] = token_info
    return Spotify(auth=token_info["access_token"])


TOP_TRACKS_LIMIT = 50


def get_tracks_with_features(sp):
    """Fetch top tracks from Spotify and match to dataset. Returns (all_tracks, matched_df).
    all_tracks: list of 50 dicts with track_name, artist_name, match_type, and features when matched.
    matched_df: DataFrame of matched rows only (for stats and recommendations).
    """
    top_tracks = sp.current_user_top_tracks(limit=TOP_TRACKS_LIMIT)["items"]
    rows_matched = []
    all_tracks = []

    for t in top_tracks:
        track_id = t["id"]
        track_name = t["name"]
        artist = t["artists"][0]
        artist_id = artist["id"]
        artist_name = artist["name"]

        row = track_by_id.get(track_id)
        match_type = "exact" if row is not None else None
        if row is None:
            af = artist_features_by_id.get(artist_id)
            if af is not None:
                row = {
                    "track_name": track_name,
                    "artist_name": artist_name,
                    **af,
                }
                match_type = "artist"
        if row is not None:
            rows_matched.append(row)
            all_tracks.append({
                "track_name": row["track_name"],
                "artist_name": row["artist_name"],
                "match_type": match_type,
                "tempo": int(round(float(row["tempo"]))),
                "energy": round(float(row["energy"]), 2),
                "valence": round(float(row["valence"]), 2),
                "danceability": round(float(row["danceability"]), 2),
            })
        else:
            all_tracks.append({
                "track_name": track_name,
                "artist_name": artist_name,
                "match_type": "unmatched",
                "tempo": None,
                "energy": None,
                "valence": None,
                "danceability": None,
            })

    matched_df = pd.DataFrame(rows_matched) if rows_matched else pd.DataFrame()
    return all_tracks, matched_df


@app.route("/login")
@rate_limit
def login():
    session.clear()
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)


@app.route("/callback")
def callback():
    code = request.args.get("code")
    if not code or not isinstance(code, str) or len(code) > 500:
        return redirect(_safe_frontend_redirect("/"))
    try:
        token_info = sp_oauth.get_access_token(code, as_dict=True)
    except Exception:
        return redirect(_safe_frontend_redirect("/"))
    session["token_info"] = token_info
    session.modified = True
    sp = Spotify(auth=token_info["access_token"])
    user = sp.current_user()
    spotify_id = user["id"]
    name = user.get("display_name") or "Unknown"
    email = user.get("email")

    try:
        cur = _get_cursor()
        cur.execute(
            "INSERT IGNORE INTO users (spotify_id, name, email) VALUES (%s, %s, %s)",
            (spotify_id, name, email),
        )
        _get_db().commit()
    except Exception as e:
        if not IS_PRODUCTION:
            print("DB Error:", str(e)[:200])

    return redirect(_safe_frontend_redirect("/dashboard"))


def _stats_from_matched(matched, total_count=TOP_TRACKS_LIMIT):
    """Build user-stats payload from a matched DataFrame (caller rounds if needed)."""
    matched = matched.copy()
    matched["tempo"] = matched["tempo"].round()
    matched["energy"] = matched["energy"].round(2)
    matched["valence"] = matched["valence"].round(2)
    matched["danceability"] = matched["danceability"].round(2)
    matched_count = len(matched)
    return {
        "track_count": matched_count,
        "matched_count": matched_count,
        "total_count": total_count,
        "tempo_avg": round(float(matched["tempo"].mean()), 1),
        "tempo_range": [int(matched["tempo"].min()), int(matched["tempo"].max())],
        "energy_avg": round(float(matched["energy"].mean()), 2),
        "valence_avg": round(float(matched["valence"].mean()), 2),
        "danceability_avg": round(float(matched["danceability"].mean()), 2),
        "tracks": matched[
            ["track_name", "artist_name", "tempo", "energy", "valence", "danceability"]
        ].to_dict(orient="records"),
    }


def _recommendations_from_matched(matched):
    """Build recommendations list from matched user tracks (uses global knn_model, df_knn)."""
    distances, indices = knn_model.kneighbors(matched[FEATURE_COLS].values)
    recommended = []
    seen = set()
    matched_set = set(zip(matched["track_name"], matched["artist_name"]))
    for idx_list in indices:
        for idx in idx_list:
            row = df_knn.iloc[idx]
            key = (row["track_name"], row["artist_name"])
            if key not in seen and key not in matched_set:
                seen.add(key)
                recommended.append({
                    "track_name": row["track_name"],
                    "artist_name": row["artist_name"],
                    "tempo": float(row["tempo"]),
                    "energy": float(row["energy"]),
                    "valence": float(row["valence"]),
                    "danceability": float(row["danceability"]),
                })
                if len(recommended) >= 25:
                    break
        if len(recommended) >= 25:
            break
    return recommended[:25]


@app.route("/auth-data")
@rate_limit
def auth_data():
    """Single endpoint: user + stats + recommendations with one Spotify fetch and one KNN run."""
    if not _ensure_dataset():
        return jsonify({"error": "Dataset not ready; try again shortly"}), 503
    sp = get_spotify_client()
    if not sp:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        user = sp.current_user()
        all_tracks, matched = get_tracks_with_features(sp)
        if matched.empty:
            return jsonify({
                "user": user,
                "stats": {
                    "error": "No matching tracks",
                    "matched_count": 0,
                    "total_count": TOP_TRACKS_LIMIT,
                    "tracks": [],
                },
                "recommended": [],
                "tracks": all_tracks,
            }), 200
        stats = _stats_from_matched(matched)
        recommended = _recommendations_from_matched(matched)
        return jsonify({
            "user": user,
            "stats": stats,
            "recommended": recommended,
            "tracks": all_tracks,
        })
    except Exception as e:
        if not IS_PRODUCTION:
            traceback.print_exc()
        err_msg = str(e) if not IS_PRODUCTION else "Internal server error"
        return jsonify({"error": err_msg}), 500


@app.route("/logout")
@rate_limit
def logout():
    session.clear()
    session.modified = True
    return jsonify({"message": "Logged out"}), 200


if __name__ == "__main__":
    # Start dataset load only in the process that serves requests:
    # - With reloader (debug=True): only the child has WERKZEUG_RUN_MAIN=true → load once.
    # - Without reloader (debug=False / production): no child → start here (only process).
    using_reloader = not IS_PRODUCTION
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not using_reloader:
        threading.Thread(target=load_dataset, daemon=True).start()
    app.run(
        port=int(os.getenv("PORT", 8888)),
        debug=not IS_PRODUCTION,
    )
