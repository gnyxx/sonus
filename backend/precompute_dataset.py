"""
One-time script to build full-dataset artifacts from the full CSV.
Run from backend dir: python precompute_dataset.py

This processes all ~2.26M rows and saves precomputed/ so the app can load
full data at startup without redoing groupby, drop_duplicates, or KNN fit.
Run again whenever spotify_tracks_cleaned_final.csv is updated.
"""

import os
import pickle
import sys

import pandas as pd
from sklearn.neighbors import NearestNeighbors

LOAD_COLS = ["track_uri", "artist_uri", "track_name", "artist_name", "tempo", "energy", "valence", "danceability", "acousticness", "liveness"]
FEATURE_COLS = ["tempo", "energy", "valence", "danceability", "acousticness", "liveness"]


def _extract_ids_vectorized(series, prefix="track"):
    s = series.astype(str).str.strip()
    is_url = s.str.contains("spotify.com", na=False)
    ids = pd.Series(index=s.index, dtype=object)
    ids[is_url] = s[is_url].str.rstrip("/").str.split("/").str[-1]
    ids[~is_url] = s[~is_url].str.replace(f"spotify:{prefix}:", "", regex=False)
    ids = ids.where(ids.str.len() == 22)
    return ids


def main():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(backend_dir, "spotify_tracks_cleaned_final.csv")
    if not os.path.exists(csv_path):
        print(f"CSV not found: {csv_path}")
        sys.exit(1)

    precomputed_dir = os.path.join(backend_dir, "precomputed")
    os.makedirs(precomputed_dir, exist_ok=True)

    print("Reading full CSV (this may take a few minutes)...")
    df_full = pd.read_csv(csv_path, usecols=LOAD_COLS)
    df_full.dropna(subset=FEATURE_COLS, inplace=True)
    df_full["tempo"] = pd.to_numeric(df_full["tempo"], errors="coerce")
    df_full["track_id"] = _extract_ids_vectorized(df_full["track_uri"], "track")
    df_full["artist_id"] = _extract_ids_vectorized(df_full["artist_uri"], "artist")
    df_full = df_full[df_full["track_id"].notna() & df_full["artist_id"].notna()]
    print(f"  Loaded {len(df_full)} rows.")

    print("Building artist features...")
    df_artist = df_full.groupby("artist_id", as_index=False)[FEATURE_COLS].mean()
    df_artist["artist_id"] = df_artist["artist_id"].astype(str)
    raw_artist = df_artist.set_index("artist_id")[FEATURE_COLS].to_dict("index")
    artist_features_by_id = {aid: {k: float(v) for k, v in row.items()} for aid, row in raw_artist.items()}
    print(f"  {len(artist_features_by_id)} artists.")

    print("Building track lookup...")
    df_first = df_full.drop_duplicates(subset=["track_id"], keep="first").copy()
    df_first["acousticness"] = df_first["acousticness"].fillna(0.5)
    df_first["liveness"] = df_first["liveness"].fillna(0.2)
    track_cols = ["track_name", "artist_name"] + FEATURE_COLS
    df_first["track_id"] = df_first["track_id"].astype(str)
    raw_track = df_first.set_index("track_id")[track_cols].to_dict("index")
    track_by_id = {tid: {k: float(v) if k in FEATURE_COLS else v for k, v in row.items()} for tid, row in raw_track.items()}
    print(f"  {len(track_by_id)} tracks.")

    print("Building KNN matrix and fitting model...")
    df_knn = df_full.drop_duplicates(subset=["track_name", "artist_name"]).dropna(subset=FEATURE_COLS)
    knn_model = NearestNeighbors(n_neighbors=5, metric="euclidean")
    knn_model.fit(df_knn[FEATURE_COLS].values)
    print(f"  KNN fitted on {len(df_knn)} unique tracks.")

    print("Writing precomputed artifacts...")
    with open(os.path.join(precomputed_dir, "artist_features_by_id.pkl"), "wb") as f:
        pickle.dump(artist_features_by_id, f, protocol=4)
    with open(os.path.join(precomputed_dir, "track_by_id.pkl"), "wb") as f:
        pickle.dump(track_by_id, f, protocol=4)
    df_knn.to_parquet(os.path.join(precomputed_dir, "df_knn.parquet"), index=False)
    with open(os.path.join(precomputed_dir, "knn_model.pkl"), "wb") as f:
        pickle.dump(knn_model, f, protocol=4)
    with open(os.path.join(precomputed_dir, "source_mtime.txt"), "w") as f:
        f.write(str(os.path.getmtime(csv_path)))

    print("Done. App will use precomputed/ on next start (full data, fast load).")

if __name__ == "__main__":
    main()
