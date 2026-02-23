import React, { useState, useEffect } from "react";

const STORAGE_KEY = "theme";

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute("data-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0d0d0d" : "#f5f5f5");
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="theme-toggle-wrap">
      <button
        type="button"
        className="theme-toggle"
        data-theme={theme}
        onClick={toggle}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="theme-toggle-track">
          <span className="theme-toggle-thumb">
            {theme === "dark" ? "🌙" : "☀️"}
          </span>
        </span>
        <span className="theme-toggle-label">
          {theme === "dark" ? "Dark" : "Light"}
        </span>
      </button>
    </div>
  );
};

export default ThemeToggle;
