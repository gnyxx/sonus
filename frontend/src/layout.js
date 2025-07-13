import React from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./navbar";

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const showNavbar = location.pathname !== "/";

  return (
    <>
      {showNavbar && <Navbar user={user} onLogout={onLogout} />}
      <main>{children}</main>
    </>
  );
};

export default Layout;
