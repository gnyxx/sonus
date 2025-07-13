import React, { useEffect, useState, useRef } from "react";
import "../css/dashboard.css";
import Spinner from "../spinner";

const Dashboard = ({ setUser }) => {
  const [stats, setStats] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(true);

  const hasRun = useRef(false);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/me`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error("Unauthorized");

      setUser(data);
      setDisplayName(data.display_name);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      setLoadingTracks(true);

      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/user-stats`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!data.error) {
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoadingStats(false);
      setLoadingTracks(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoadingRecs(true);
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/recommendations`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!data.error && data.recommended) {
        setRecommendations(data.recommended);
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    fetchUser();
    fetchStats();
    fetchRecommendations();
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <h1>Welcome {displayName}</h1>

        <section>
          <h2>📊 Your Music Stats</h2>
          {loadingStats ? (
            <Spinner />
          ) : stats ? (
            <div className="stats">
              <p><strong>Track Count:</strong> {stats.track_count}</p>
              <p><strong>Average Tempo:</strong> {stats.tempo_avg} BPM</p>
              <p><strong>Tempo Range:</strong> {stats.tempo_range[0]} - {stats.tempo_range[1]} BPM</p>
              <p><strong>Energy Avg:</strong> {stats.energy_avg}</p>
              <p><strong>Valence Avg:</strong> {stats.valence_avg}</p>
              <p><strong>Danceability Avg:</strong> {stats.danceability_avg}</p>
            </div>
          ) : (
            <p>No stats found.</p>
          )}
        </section>

        <section>
          <h2>🎧 Your Top Tracks</h2>
          {loadingTracks ? (
            <Spinner />
          ) : stats?.tracks?.length > 0 ? (
            <ul className="track-list">
              {stats.tracks.map((track, index) => (
                <li key={index}>
                  <strong>{track.track_name}</strong> by {track.artist_name}
                  <br />
                  Tempo: {track.tempo}, Energy: {track.energy}, Valence: {track.valence}
                </li>
              ))}
            </ul>
          ) : (
            <p>No top tracks available.</p>
          )}
        </section>

        <section>
          <h2>🤖 Recommendations</h2>
          {loadingRecs ? (
            <Spinner />
          ) : recommendations.length > 0 ? (
            <ul className="track-list">
              {recommendations.map((track, index) => (
                <li key={index}>
                  <strong>{track.track_name}</strong> by {track.artist_name}<br />
                  Tempo: {Math.round(track.tempo)} | Energy: {track.energy.toFixed(2)} | Valence: {track.valence.toFixed(2)}
                </li>
              ))}
            </ul>
          ) : (
            <p>No recommendations found.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
