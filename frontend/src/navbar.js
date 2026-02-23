import React, { useState, useEffect, useRef } from "react";
import "./css/navbar.css";
import ThemeToggle from "./ThemeToggle";
import Logo3D from "./Logo3D";

const Navbar = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="nav nav--3d">
      <Logo3D asLink variant="nav" showTagline={true} linkClassName="nav-brand" />
      <div className="nav-right">
        <div className="nav-theme-wrap">
          <ThemeToggle />
        </div>
        <span className="nav-divider" aria-hidden="true" />
        <div className="nav-user" ref={dropdownRef}>
          <button type="button" className="user-trigger" onClick={toggleMenu} aria-expanded={menuOpen} aria-haspopup="true">
            <img
              src={
                user?.images?.length > 0
                  ? user.images[0].url
                  : "https://www.gravatar.com/avatar?d=mp&s=200"
              }
              alt="Profile"
              className="user-avatar"
            />
            {user?.display_name && <span className="user-name">{user.display_name}</span>}
          </button>
          {menuOpen && (
            <div className="dropdown">
              <button type="button" onClick={onLogout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
