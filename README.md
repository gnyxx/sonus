# 🎵 Sonus - Spotify Music Analyzer

Sonus is a full-stack web app built with React and Flask that analyzes your Spotify music taste and recommends songs using machine learning. 🎧

## Features

- 🔐 Spotify login with OAuth
- 📊 Stats: tempo, energy, valence, danceability
- 🤖 ML-powered song recommendations (KNN)
- 🔍 Genre and BPM distribution
- 📁 Clean separation of frontend & backend

## Tech Stack

- Frontend: React.js
- Backend: Python + Flask + Spotipy
- ML: Scikit-learn (KNN)
- DB: MySQL
- Dataset: ➡️ [Download Dataset from Google Drive](https://drive.google.com/file/d/12iO5maTWpShuCLXwLrTNpQWj7j0jmtuN/view?usp=sharing)  
           ⬇️ Save it to: `backend/spotify_tracks_cleaned_final.csv`

## Environment Setup

Create a .env file in the backend/ folder with the following contents:
# Spotify Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback

# Flask
FLASK_SECRET_KEY=your_flask_secret_key

# MySQL Database
MYSQL_HOST=localhost
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=your_db_name

# Frontend URI
FRONTEND_URI=http://localhost:5173

## 🚧 New Users Cannot Log In Directly
Due to Spotify’s authorization rules, only users registered by the developer can access this app. If you'd like to try it out:

- Send me your Spotify email address, and I’ll add you to the app’s access list.
- Once added, you’ll be able to log in with your Spotify account.

📁 **Note:** The `spotify_tracks_cleaned_final.csv` file is **excluded** from this repo due to size limits. 
