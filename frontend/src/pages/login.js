import React from "react";
import "../css/login.css";

const Login = () => {
  const handleLogin = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/login`;
  };

  return (
    <div className="login-container">
      <div className="login-title" style= {{ fontFamily: 'Monfem' }}>SONUS</div>
      <div className="login-card-wrapper">
        <div className="login-card">
          <h2>Log in with Spotify</h2>
          <button onClick={handleLogin} className="login-button">
            ၊၊||၊   
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
