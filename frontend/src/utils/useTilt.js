import { useState, useCallback, useRef, useEffect } from "react";

/** Hook for mouse-follow 3D tilt effect on logo. */
export function useTilt({ maxTilt = 14, perspective = 800, smoothing = 0.18 } = {}) {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const ref = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  const updateTilt = useCallback(() => {
    current.current.x += (target.current.x - current.current.x) * smoothing;
    current.current.y += (target.current.y - current.current.y) * smoothing;
    setTilt({ rotateX: current.current.y, rotateY: current.current.x });
    rafRef.current = requestAnimationFrame(updateTilt);
  }, [smoothing]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateTilt);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateTilt]);

  const onMouseMove = useCallback(
    (e) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      target.current = { x: -y * maxTilt, y: x * maxTilt };
    },
    [maxTilt]
  );

  const onMouseLeave = useCallback(() => {
    target.current = { x: 0, y: 0 };
  }, []);

  const style = {
    transform: `perspective(${perspective}px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
    transformStyle: "preserve-3d",
  };

  return { ref, style, onMouseMove, onMouseLeave };
}
