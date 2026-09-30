"use client";

import { useEffect, useRef } from "react";

export default function NoiseOverlay({ opacity = 0.03 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate noise pattern once
    const noiseCanvas = document.createElement("canvas");
    noiseCanvas.width = 512;
    noiseCanvas.height = 512;
    const noiseCtx = noiseCanvas.getContext("2d")!;
    const imageData = noiseCtx.createImageData(512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.random() * 255;
      data[i] = val;     // R
      data[i + 1] = val; // G
      data[i + 2] = val; // B
      data[i + 3] = 255; // A
    }
    noiseCtx.putImageData(imageData, 0, 0);

    let frame = 0;
    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = opacity;
      
      // Draw tiled noise
      for (let x = 0; x < canvas.width; x += 512) {
        for (let y = 0; y < canvas.height; y += 512) {
          ctx.drawImage(noiseCanvas, x, y);
        }
      }
      
      // Subtle drift
      if (frame % 60 === 0) {
        ctx.globalAlpha = opacity * 0.5;
        ctx.translate(Math.random() * 0.5, Math.random() * 0.5);
      }
      
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
      style={{ mixBlendMode: "overlay" }}
      aria-hidden="true"
    />
  );
}