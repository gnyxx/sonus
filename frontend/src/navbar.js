import React, { useState, useEffect, useRef } from "react";
import "./css/navbar.css";


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
    <nav className="nav">
      <div className="navbar-left">
        <span className="site-name"  style= {{ fontFamily: 'Monfem' }}>SONUS</span>
      </div>
      <div className="nav-user" ref={dropdownRef}>
        <img
          src={
            user?.images?.length > 0
              ? user.images[0].url
              : "https://www.gravatar.com/avatar?d=mp&s=200"
          }
          alt="User Avatar"
          className="user-avatar"
          onClick={toggleMenu}
        />
        {menuOpen && (
          <div className="dropdown">
            <button onClick={onLogout}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
