import React from "react";

/* Music-inspired: soundwave bars, music notes, vinyl - evenly spread across page */
const soundwaveBars = [
  { w: 4, h: [20, 48], x: "8%", y: "12%", delay: 0 },
  { w: 4, h: [28, 52], x: "12%", y: "12%", delay: 0.15 },
  { w: 4, h: [18, 42], x: "16%", y: "12%", delay: 0.3 },
  { w: 4, h: [24, 44], x: "50%", y: "8%", delay: 0.1 },
  { w: 4, h: [32, 56], x: "54%", y: "8%", delay: 0.25 },
  { w: 4, h: [20, 38], x: "84%", y: "15%", delay: 0.2 },
  { w: 4, h: [26, 50], x: "88%", y: "15%", delay: 0.4 },
  { w: 4, h: [22, 46], x: "92%", y: "15%", delay: 0.5 },
  { w: 4, h: [30, 54], x: "5%", y: "50%", delay: 0.35 },
  { w: 4, h: [16, 40], x: "9%", y: "50%", delay: 0.6 },
  { w: 4, h: [28, 48], x: "90%", y: "52%", delay: 0.45 },
  { w: 4, h: [20, 44], x: "94%", y: "52%", delay: 0.7 },
  { w: 4, h: [24, 42], x: "12%", y: "88%", delay: 0.55 },
  { w: 4, h: [18, 36], x: "50%", y: "92%", delay: 0.65 },
  { w: 4, h: [26, 50], x: "86%", y: "88%", delay: 0.8 },
];

const musicNotes = [
  { char: "♪", x: "22%", y: "28%", size: 28, delay: 0 },
  { char: "♫", x: "78%", y: "32%", size: 36, delay: 0.5 },
  { char: "♪", x: "72%", y: "72%", size: 22, delay: 1 },
  { char: "♫", x: "28%", y: "68%", size: 30, delay: 0.7 },
  { char: "♪", x: "52%", y: "48%", size: 24, delay: 0.3 },
  { char: "♪", x: "8%", y: "78%", size: 20, delay: 1.2 },
  { char: "♫", x: "92%", y: "22%", size: 26, delay: 0.9 },
  { char: "♪", x: "45%", y: "28%", size: 22, delay: 0.4 },
  { char: "♫", x: "58%", y: "75%", size: 28, delay: 0.6 },
];

const vinylDiscs = [
  { size: 48, x: "18%", y: "15%", delay: 0 },
  { size: 40, x: "75%", y: "80%", delay: 2 },
  { size: 44, x: "52%", y: "55%", delay: 1 },
  { size: 36, x: "85%", y: "38%", delay: 1.5 },
  { size: 32, x: "10%", y: "85%", delay: 0.5 },
];

const FloatingShapes = ({ className = "" }) => (
  <div className={`floating-shapes ${className}`} aria-hidden="true">
    {soundwaveBars.map((s, i) => (
      <div
        key={`bar-${i}`}
        className="floating-shapes__wavebar"
        style={{
          width: s.w,
          left: s.x,
          top: s.y,
          animationDelay: `${s.delay}s`,
          "--bar-min": `${s.h[0]}px`,
          "--bar-max": `${s.h[1]}px`,
        }}
      />
    ))}
    {musicNotes.map((s, i) => (
      <span
        key={`note-${i}`}
        className="floating-shapes__note"
        style={{
          left: s.x,
          top: s.y,
          fontSize: s.size,
          animationDelay: `${s.delay}s`,
        }}
      >
        {s.char}
      </span>
    ))}
    {vinylDiscs.map((s, i) => (
      <div
        key={`vinyl-${i}`}
        className="floating-shapes__vinyl"
        style={{
          width: s.size,
          height: s.size,
          left: s.x,
          top: s.y,
          animationDelay: `${s.delay}s`,
        }}
      >
        <span className="floating-shapes__vinyl-inner" />
      </div>
    ))}
  </div>
);

export default FloatingShapes;
