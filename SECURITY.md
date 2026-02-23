# Security Guide

This document helps you keep Sonus secure when developing and deploying, especially before pushing to GitHub.

## Sensitive Data (Never Commit)

- **Spotify credentials**: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- **Database**: `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- **Flask**: `FLASK_SECRET_KEY`
- **`.env`** files (backend and frontend) — use `.env.example` as a template only

## Before Pushing to GitHub

1. **Verify no secrets are staged**:
   ```bash
   git status
   # Ensure backend/.env and frontend/.env (or .env.local) do NOT appear
   git diff --cached
   # Review staged changes for accidental credential additions
   ```

2. **Confirm `.env.example` files have placeholders only** — no real IDs, secrets, or passwords.

3. **If you ever committed a secret by mistake**:
   - Rotate the credential immediately (Spotify Dashboard, MySQL password, etc.)
   - Use `git filter-branch` or BFG Repo-Cleaner to remove it from history
   - Never rely on "I'll remove it in the next commit" — it stays in history

4. **Database**: MySQL data lives on your server. Do not commit dumps (`.sql`), backups, or local DB files — they are in `.gitignore`.

## Environment Setup

- Copy `backend/.env.example` → `backend/.env` and fill with your real credentials (never commit `.env`)
- Copy `frontend/.env.example` → `frontend/.env.local` and set `REACT_APP_BACKEND_URL` (never commit `.env.local`)

## Production

- Set `FLASK_ENV=production`
- Use a strong `FLASK_SECRET_KEY` (32+ chars, random)
- Use HTTPS
- Restrict CORS to your frontend origin
- Keep dependencies updated
