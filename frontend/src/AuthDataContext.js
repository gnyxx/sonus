import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "./config";

const AuthDataContext = createContext(null);

const AUTH_PATHS = ["/dashboard", "/recommendations"];

export function AuthDataProvider({ children, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  const [user, setLocalUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const isAuthPath = AUTH_PATHS.includes(location.pathname);

  useEffect(() => {
    if (!isAuthPath) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    setLoadingStats(true);
    setLoadingRecs(true);

    const fetchAll = async (retries = 1) => {
      try {
        const res = await fetch(`${API_BASE}/auth-data`, { credentials: "include" });
        const data = await res.json();

        if (res.status === 401) {
          hasFetched.current = false;
          navigate("/");
          return;
        }
        if (res.status === 503 && retries > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          return fetchAll(retries - 1);
        }
        if (data.user) {
          setUser(data.user);
          setLocalUser(data.user);
        }
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.recommended)) setRecommendations(data.recommended);
        if (Array.isArray(data.tracks)) setTracks(data.tracks);
      } catch (err) {
        console.error("Failed to fetch:", err);
        hasFetched.current = false;
        navigate("/");
      } finally {
        setLoadingStats(false);
        setLoadingRecs(false);
      }
    };

    fetchAll();
  }, [isAuthPath, setUser, navigate]);

  const value = useMemo(() => ({
    user,
    stats,
    recommendations,
    tracks,
    loadingStats,
    loadingRecs,
  }), [user, stats, recommendations, tracks, loadingStats, loadingRecs]);

  return (
    <AuthDataContext.Provider value={value}>
      {children}
    </AuthDataContext.Provider>
  );
}

export function useAuthData() {
  const ctx = useContext(AuthDataContext);
  if (!ctx) {
    throw new Error("useAuthData must be used within AuthDataProvider");
  }
  return ctx;
}
