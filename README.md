# SONUS

A music recommendation web app that analyzes your Spotify listening habits and suggests new tracks.

## Screenshots

See the [Screenshots](Screenshots/) folder for app screenshots.

## Features

- Spotify OAuth login
- Music stats (tempo, energy, valence, danceability)
- Top tracks analysis
- AI-powered insights based on your taste
- Personalized recommendations via KNN on audio features
- Recommendations page – discover new tracks based on your taste and rule based insights
- Theme toggle – dark/light mode

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL
- Spotify Developer account
- Dataset: `spotify_tracks_cleaned_final.csv` in `backend/` (from [Kaggle](https://www.kaggle.com/datasets) or add manually)

📁 **Note:** The `spotify_tracks_cleaned_final.csv` file is **excluded** from this repo due to size limits.

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials (never commit .env)
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local: REACT_APP_BACKEND_URL=http://localhost:8888
npm install
npm start
```

Default frontend URL: `http://localhost:3000` (CRA). Set `FRONTEND_URI` in backend `.env` to match for CORS.

### Spotify App

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI: `http://localhost:8888/callback` (or your production URL)
3. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in backend `.env`

### Database

Create the `sonus` database and users table:

```sql
CREATE DATABASE sonus;
USE sonus;
CREATE TABLE users (
  spotify_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);
```

### Optional: Precompute Dataset

For faster startup with the full dataset, run once:

```bash
cd backend
python precompute_dataset.py
```

The app will then load from `precomputed/` instead of reprocessing the CSV on each start.

## Spotify App Restrictions

Due to Spotify's authorization rules, only users in your app's access list can log in. To let others try the app:

1. Add them as users in your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) app settings.
2. They can then log in with their Spotify account.

## Production

Set in backend `.env`:

- `FLASK_ENV=production`
- `FLASK_SECRET_KEY` – strong random key (min 32 chars)
- `FRONTEND_URI` – your frontend URL (e.g. `https://app.example.com`)

Use HTTPS. Session cookies are `Secure`, `HttpOnly`, `SameSite=Lax` in production.

## Security

- Rate limiting on API endpoints
- CORS restricted to frontend origin
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- HSTS in production
- OAuth state validation
- Safe redirect validation

See [SECURITY.md](SECURITY.md) for credentials handling and pre-push checklist.
