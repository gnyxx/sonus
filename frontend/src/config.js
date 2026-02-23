/**
 * API base URL. Must match backend CORS and be same-origin for credentials.
 * Set REACT_APP_BACKEND_URL in .env or .env.local
 */
export const API_BASE =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8888";
