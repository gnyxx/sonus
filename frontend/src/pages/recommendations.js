import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthData } from "../AuthDataContext";
import { generateInsight } from "../utils/generateInsight";
import FloatingShapes from "../FloatingShapes";
import "../css/dashboard.css";
import Spinner from "../spinner";

const INITIAL_RECS = 10;
const LOAD_MORE_RECS = 5;
const MAX_RECS = 25;

const Recommendations = () => {
  const { user, stats, recommendations, loadingRecs } = useAuthData();
  const insight = useMemo(() => generateInsight(stats, recommendations), [stats, recommendations]);
  const [recommendationsToShow, setRecommendationsToShow] = useState(INITIAL_RECS);

  const displayName = user?.display_name ?? "";
  const visibleRecommendations = recommendations.slice(0, recommendationsToShow);
  const canLoadMore = recommendations.length > recommendationsToShow && recommendationsToShow < MAX_RECS;
  const nextBatchSize = Math.min(LOAD_MORE_RECS, MAX_RECS - recommendationsToShow, recommendations.length - recommendationsToShow);

  return (
    <div className="dashboard page-enter dashboard--with-shapes">
      <FloatingShapes className="floating-shapes--page" />
      <div className="dashboard-content">
        <header className="dashboard-header recommendations-header animate-in">
          <div>
            <h1>Recommendations for {displayName}</h1>
            <Link to="/dashboard" className="back-to-dashboard">← Back to Dashboard</Link>
          </div>
        </header>

        {insight && (
          <section className="ai-insights-section insight-reveal animate-in animate-delay-1">
            <h2 className="insight-title">✨ Insights from your data</h2>
            <div className="ai-insight-content">
              <p className="ai-insight-headline">{insight.headline}</p>
              <ul className="ai-insight-observations">
                {insight.observations.map((obs, i) => (
                  <li key={i} className="insight-obs-item">{obs}</li>
                ))}
              </ul>
              <p className="ai-insight-suggestion">{insight.suggestion}</p>
              <p className="ai-insight-cta">{insight.cta}</p>
            </div>
          </section>
        )}

        <section className="tracks-section recommendations-section full-width animate-in animate-delay-2">
          <h2>🤖 Your Recommendations</h2>
          {loadingRecs ? (
            <Spinner />
          ) : recommendations.length > 0 ? (
            <>
              <ul className="track-list track-grid">
                {visibleRecommendations.map((track, index) => (
                  <li key={index} className="track-item-in">
                    <span className="track-title">{track.track_name}</span>
                    <span className="track-artist">{track.artist_name}</span>
                    <span className="track-meta">Tempo {Math.round(track.tempo)} · E {track.energy.toFixed(2)} · V {track.valence.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              {canLoadMore && (
                <button
                  type="button"
                  className="load-more-recs"
                  onClick={() => setRecommendationsToShow((n) => Math.min(n + LOAD_MORE_RECS, MAX_RECS))}
                >
                  Load {nextBatchSize} more
                </button>
              )}
            </>
          ) : (
            <p>No recommendations found.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Recommendations;
