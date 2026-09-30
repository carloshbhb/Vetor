"use client";

import { useEffect, useRef, useState } from "react";

interface AdSlotProps {
  slotId: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle" | "fluid";
  className?: string;
  style?: React.CSSProperties;
}

export default function AdSlot({ slotId, format = "auto", className = "", style }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adsLoaded, setAdsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadAds = async () => {
      try {
        if (!window.adsbygoogle) {
          const script = document.createElement("script");
          script.async = true;
          script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX";
          script.crossOrigin = "anonymous";
          document.head.appendChild(script);
          await new Promise((resolve) => (script.onload = resolve));
        }

        if (containerRef.current) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setAdsLoaded(true);
        }
      } catch {
        setError(true);
      }
    };

    const timer = setTimeout(loadAds, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (error) return null;

  const formatStyles: Record<string, React.CSSProperties> = {
    auto: { display: "block" },
    horizontal: { display: "block", minWidth: "320px", maxWidth: "728px", margin: "0 auto" },
    vertical: { display: "block", minWidth: "160px", maxWidth: "300px", margin: "0 auto" },
    rectangle: { display: "inline-block", width: "300px", height: "250px" },
    fluid: { display: "block", minWidth: "320px", maxWidth: "100%" },
  };

  return (
    <div ref={containerRef} className={className} style={{ ...formatStyles[format], ...style }}>
      <ins
        className="adsbygoogle"
        style={formatStyles[format]}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

declare global {
  interface Window {
    adsbygoogle: Array<{}>;
  }
}