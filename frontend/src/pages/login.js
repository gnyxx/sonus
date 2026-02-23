import React from "react";
import { API_BASE } from "../config";
import Logo3D from "../Logo3D";
import FloatingShapes from "../FloatingShapes";
import "../css/login.css";

const FEATURES = [
  { icon: "📊", label: "Listening stats", delay: 0.4 },
  { icon: "🎵", label: "Personal recommendations", delay: 0.55 },
  { icon: "✨", label: "Discover new artists", delay: 0.7 },
];

const Login = () => {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/login`;
  };

  return (
    <div className="login-container login-container--with-shapes">
      <FloatingShapes />
      <div className="login-hero">
        <Logo3D variant="hero" showTagline={true} />
      </div>
      <div className="login-card-wrapper">
        <div className="login-card login-card--3d login-card--popup">
          <div className="login-card__backdrop" aria-hidden="true" />
          <div className="login-card__content">
            <h2 className="login-card__title">Log in with Spotify</h2>
            <p className="login-card-desc">
              Connect your account to see your listening stats and get personalized recommendations.
            </p>
            <button onClick={handleLogin} className="login-button login-button--3d">
              Connect with Spotify
            </button>
          </div>
        </div>
        <ul className="login-features">
          {FEATURES.map((f, i) => (
            <li
              key={i}
              className="login-feature"
              style={{ animationDelay: `${f.delay}s` }}
            >
              <span className="login-feature__icon">{f.icon}</span>
              <span className="login-feature__label">{f.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Login;
