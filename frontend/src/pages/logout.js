import React from "react";
import axios from "axios";

const LogoutButton = () => {
  const handleLogout = async () => {
    try {
      await axios.get("http://127.0.0.1:8888/logout", { withCredentials: true });

      window.location.href = "https://accounts.spotify.com/logout?continue=https://www.spotify.com/logout/";
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Logout failed. Try refreshing the page.");
    }
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: "10px 20px",
        backgroundColor: "#1db954",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "16px",
        marginBottom: "20px",
      }}
    >
      🚪 Logout
    </button>
  );
};

export default LogoutButton;
