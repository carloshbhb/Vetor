"use client";

import { useEffect } from "react";

export default function ProgressBar() {
  useEffect(() => {
    const onScroll = () => {
      const s = document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const bar = document.getElementById("progress-bar");
      if (bar) bar.style.width = (s / h * 100) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <div id="progress-bar" />;
}
