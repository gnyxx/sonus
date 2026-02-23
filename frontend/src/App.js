import React, { useState, useCallback, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout";
import { AuthDataProvider } from "./AuthDataContext";
import Spinner from "./spinner";
import { API_BASE } from "./config";
import "./css/font.css";

const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Recommendations = lazy(() => import("./pages/recommendations"));

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = useCallback(async () => {
    await fetch(`${API_BASE}/logout`, {
      credentials: "include",
    });
    window.location.href = "/";
  }, []);

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <AuthDataProvider setUser={setUser}>
          <Suspense fallback={
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
              <Spinner />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthDataProvider>
      </Layout>
    </Router>
  );
}

export default App;
  