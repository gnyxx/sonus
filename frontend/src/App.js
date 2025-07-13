import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Layout from "./layout";
import "./css/App.css";
import './css/font.css';


function App() {
  const [user, setUser] = useState(null);

  const handleLogout = async () => {
    await fetch(`${process.env.REACT_APP_BACKEND_URL}/logout`, {
      credentials: "include",
    });
    window.location.href = "/";
  };

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard setUser={setUser} />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
  