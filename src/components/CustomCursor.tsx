"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const followerPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

    const cursor = cursorRef.current;
    const follower = followerRef.current;
    if (!cursor || !follower) return;

    setVisible(true);

    const handleMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseenter", () => setVisible(true));
    document.addEventListener("mouseleave", () => setVisible(false));

    // Smooth follower animation
    const animate = () => {
      if (!follower) return;
      followerPos.current.x += (mousePos.current.x - followerPos.current.x) * 0.15;
      followerPos.current.y += (mousePos.current.y - followerPos.current.y) * 0.15;
      follower.style.transform = `translate(${followerPos.current.x}px, ${followerPos.current.y}px)`;
      requestAnimationFrame(animate);
    };
    animate();

    // Magnetic elements
    const cleanupMagnetic: Array<() => void> = [];
    const magneticElements = document.querySelectorAll<HTMLElement>("[data-magnetic]");
    magneticElements.forEach((el) => {
      const handleMagneticMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.3;
        const deltaY = (e.clientY - centerY) * 0.3;
        el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.02)`;
        el.style.transition = "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)";
      };
      const handleMagneticLeave = () => {
        el.style.transform = "translate(0, 0) scale(1)";
        el.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
      };
      el.addEventListener("mousemove", handleMagneticMove);
      el.addEventListener("mouseleave", handleMagneticLeave);
      cleanupMagnetic.push(() => {
        el.removeEventListener("mousemove", handleMagneticMove);
        el.removeEventListener("mouseleave", handleMagneticLeave);
        el.style.transform = "";
      });
    });

    return () => {
      document.removeEventListener("mousemove", handleMove);
      cleanupMagnetic.forEach((cleanup) => cleanup());
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] w-3 h-3 rounded-full border border-ink/40 bg-ink/10 mix-blend-difference transition-opacity duration-200"
        style={{ willChange: "transform" }}
      />
      <div
        ref={followerRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] w-8 h-8 rounded-full border border-blue/30 bg-blue/5 mix-blend-difference transition-opacity duration-200"
        style={{ willChange: "transform" }}
      />
      <style jsx global>{`
        @media (hover: hover) and (pointer: fine) {
          html { cursor: none; }
          a, button, [role="button"], input, textarea, select, [data-magnetic] {
            cursor: none !important;
          }
          [data-magnetic] {
            will-change: transform;
          }
        }
      `}</style>
    </>
  );
}