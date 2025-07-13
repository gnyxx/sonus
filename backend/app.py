import os
from flask import Flask, redirect, request, session, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
import mysql.connector
import pandas as pd
import traceback
from sklearn.neighbors import NearestNeighbors
from spotipy.cache_handler import MemoryCacheHandler
from spotipy.cache_handler import CacheHandler

class SessionCacheHandler(CacheHandler):
    def __init__(self, session_key='token_info'):
        self.session_key = session_key

    def get_cached_token(self):
        return session.get(self.session_key)

    def save_token_to_cache(self, token_info):
        session[self.session_key] = token_info

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
CORS(app, supports_credentials=True)

db = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DATABASE")
)
cursor = db.cursor()

sp_oauth = SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIFY_REDIRECT_URI"),
    scope="user-read-email user-read-private user-top-read",
    cache_handler=SessionCacheHandler(),
    show_dialog=True
)

df_full = None

def load_dataset():
    global df_full
    print("📁 Loading and preprocessing Kaggle dataset...")
    df_full = pd.read_csv("spotify_tracks_cleaned_final.csv")
    df_full["track_clean"] = df_full["track_name"].str.lower().str.strip()
    df_full["artist_clean"] = df_full["artist_name"].str.lower().str.strip()
    df_full.dropna(subset=["tempo", "energy", "valence", "danceability"], inplace=True)
    print(f"✅ Loaded {len(df_full)} tracks into memory.")

def get_spotify_client():
    token_info = session.get("token_info")
    if not token_info:
        print("⚠️ No token info in session.")
        return None
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info["refresh_token"])
        session["token_info"] = token_info
    return Spotify(auth=token_info["access_token"])


def get_matched_tracks(sp, log=False):
    top_tracks = sp.current_user_top_tracks(limit=50)["items"]
    track_list = []

    for t in top_tracks:
        track_clean = t["name"].lower().strip()
        artist_clean = t["artists"][0]["name"].lower().strip()
        if log:
            print(f"🎵 Checking: {track_clean} - {artist_clean}")
        track_list.append({
            "track_clean": track_clean,
            "artist_clean": artist_clean
        })

    user_df = pd.DataFrame(track_list)
    matched = user_df.merge(df_full, on=["track_clean", "artist_clean"], how="inner")

    if log:
        for _, row in matched.iterrows():
            print(f"✅ Match found: {row['track_name']}")

    return matched


@app.route("/login")
def login():
    session.clear()
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)


@app.route("/callback")
def callback():
    code = request.args.get("code")
    token_info = sp_oauth.get_access_token(code, as_dict=True)
    session["token_info"] = token_info
    session.modified = True
    sp = Spotify(auth=token_info["access_token"])
    user = sp.current_user()
    spotify_id = user["id"]
    name = user.get("display_name") or "Unknown"
    email = user.get("email")

    try:
        cursor.execute(
            "INSERT IGNORE INTO users (spotify_id, name, email) VALUES (%s, %s, %s)",
            (spotify_id, name, email)
        )
        db.commit()
        print(f"✅ User saved: {spotify_id}")
    except Exception as e:
        print("❌ DB Error:", e)

    return redirect(os.getenv("FRONTEND_URI") + "/dashboard")


@app.route("/me")
def me():
    sp = get_spotify_client()
    if not sp:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(sp.current_user())


@app.route("/user-stats")
def user_stats():
    sp = get_spotify_client()
    print("🎧 Stats for:", sp.current_user()["id"])
    if not sp:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        matched = get_matched_tracks(sp, log=True)

        if matched.empty:
            return jsonify({"error": "No matching tracks"}), 404

        matched = matched.copy()
        matched["tempo"] = pd.to_numeric(matched["tempo"], errors="coerce").round().astype("Int64")
        matched["energy"] = matched["energy"].round(2)
        matched["valence"] = matched["valence"].round(2)
        matched["danceability"] = matched["danceability"].round(2)

        stats = {
            "track_count": len(matched),
            "tempo_avg": round(float(matched["tempo"].mean()), 1),
            "tempo_range": [int(matched["tempo"].min()), int(matched["tempo"].max())],
            "energy_avg": round(float(matched["energy"].mean()), 2),
            "valence_avg": float(matched["valence"].mean()),
            "danceability_avg": round(float(matched["danceability"].mean()), 2),
            "tracks": matched[[
                "track_name", "artist_name", "tempo", "energy", "valence", "danceability"
            ]].to_dict(orient="records")
        }

        return jsonify(stats)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/recommendations")
def recommend_songs():
    sp = get_spotify_client()
    if not sp:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        matched = get_matched_tracks(sp, log=False)

        if matched.empty:
            return jsonify({"error": "No matches for recommendations"}), 404

        feature_cols = ["tempo", "energy", "valence", "danceability", "acousticness", "liveness"]
        df_knn = df_full.drop_duplicates(subset=["track_name", "artist_name"]).dropna(subset=feature_cols)

        knn = NearestNeighbors(n_neighbors=5, metric="euclidean")
        knn.fit(df_knn[feature_cols])

        distances, indices = knn.kneighbors(matched[feature_cols])
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
                        "tempo": row["tempo"],
                        "energy": row["energy"],
                        "valence": row["valence"],
                        "danceability": row["danceability"]
                    })

        return jsonify({"recommended": recommended})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/logout")
def logout():
    session.clear()
    session.modified = True
    return jsonify({"message": "Logged out"}), 200


if __name__ == "__main__":
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true": 
        load_dataset()
    app.run(port=8888, debug=True)
