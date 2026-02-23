import React from "react";
import { Link } from "react-router-dom";
import { useTilt } from "./utils/useTilt";

const Logo3D = ({ asLink = false, variant = "nav", showTagline = true, linkClassName = "" }) => {
  const { ref, style, onMouseMove, onMouseLeave } = useTilt({
    maxTilt: variant === "hero" ? 18 : 14,
    perspective: 600,
    smoothing: 0.18,
  });

  const isHero = variant === "hero";
  const content = (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`logo-3d logo-3d--${variant}`}
      style={style}
    >
      <span className="logo-3d__text" style={{ fontFamily: "Monfem" }}>
        SONUS
      </span>
      {showTagline && (
        <span className="logo-3d__tagline">
          Your music, understood{isHero ? "." : ""}
        </span>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link to="/dashboard" className={`logo-3d-link ${linkClassName}`.trim()}>
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo3D;
