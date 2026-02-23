import React from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./navbar";
import ThemeToggle from "./ThemeToggle";

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const showNavbar = location.pathname !== "/";

  return (
    <>
      {!showNavbar && <ThemeToggle />}
      {showNavbar && <Navbar user={user} onLogout={onLogout} />}
      <main>{children}</main>
    </>
  );
};

export default Layout;
