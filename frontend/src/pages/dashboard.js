import React from "react";
import { Link } from "react-router-dom";
import { useAuthData } from "../AuthDataContext";
import FloatingShapes from "../FloatingShapes";
import "../css/dashboard.css";
import Spinner from "../spinner";

const matchTypeLabel = {
  exact: "Exact match",
  artist: "Artist-based",
  unmatched: "Not in dataset",
};

const Dashboard = () => {
  const { user, stats, tracks, loadingStats } = useAuthData();
  const displayName = user?.display_name ?? "";
  const matchedCount = stats?.matched_count ?? 0;
  const totalCount = stats?.total_count ?? (tracks.length || 50);

  return (
    <div className="dashboard page-enter dashboard--with-shapes">
      <FloatingShapes className="floating-shapes--page" />
      <div className="dashboard-content">
        <header className="dashboard-header animate-in">
          <h1>Welcome, {displayName}</h1>
        </header>

        <section className="stats-section animate-in animate-delay-1">
          <h2>📊 Your Music Stats</h2>
          {loadingStats ? (
            <Spinner />
          ) : stats ? (
            <div className="stats-grid">
              {[
                { value: `${stats.matched_count ?? stats.track_count} / ${stats.total_count ?? 50}`, label: "Tracks matched" },
                ...(!stats.error ? [
                  { value: stats.tempo_avg, label: "Avg Tempo (BPM)" },
                  { value: `${stats.tempo_range[0]}–${stats.tempo_range[1]}`, label: "Tempo Range" },
                  { value: stats.energy_avg, label: "Energy" },
                  { value: stats.valence_avg, label: "Valence" },
                  { value: stats.danceability_avg, label: "Danceability" },
                ] : []),
              ].map((item, i) => (
                <div key={i} className="stat-card">
                  <span className="stat-value">{item.value}</span>
                  <span className="stat-label">{item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No stats found.</p>
          )}
        </section>

        <section className="tracks-section top-tracks-section animate-in animate-delay-2">
          <h2>🎧 Top Tracks</h2>
          {totalCount > 0 && (
            <p className="tracks-matched-summary">
              {matchedCount} of {totalCount} matched to dataset
            </p>
          )}
          {loadingStats ? (
            <Spinner />
          ) : tracks.length > 0 ? (
            <ul className="track-list track-grid">
              {tracks.map((track, index) => (
                <li key={index} className={`track-item-in track-match-${track.match_type}`}>
                  <span className="track-title">{track.track_name}</span>
                  <span className="track-artist">{track.artist_name}</span>
                  {track.match_type !== "unmatched" ? (
                    <span className="track-meta">Tempo {track.tempo} · E {track.energy} · V {track.valence}</span>
                  ) : (
                    <span className="track-meta track-meta-unmatched">No features in dataset</span>
                  )}
                  <span className={`track-match-badge track-match-badge-${track.match_type}`} title={matchTypeLabel[track.match_type]}>
                    {matchTypeLabel[track.match_type]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No top tracks available.</p>
          )}
        </section>

        <div className="recommendations-cta animate-in animate-delay-3">
          <Link to="/recommendations" className="cta-button">
            Discover Recommendations →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
