"use client";

import { useEffect, useRef, useState } from "react";

export type AdFormat = "auto" | "horizontal" | "vertical" | "rectangle" | "fluid";

interface AdSlotProps {
  slotId: string;
  client?: string;
  format?: AdFormat;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export default function AdSlot({ slotId, client, format = "auto", className = "", style, ariaLabel }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adsLoaded, setAdsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const clientId = client || process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!clientId) return;

    const loadAds = async () => {
      try {
        if (!window.adsbygoogle) {
          const script = document.createElement("script");
          script.async = true;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
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
  }, [clientId]);

  if (error || !clientId) return null;

  const formatStyles: Record<string, React.CSSProperties> = {
    auto: { display: "block" },
    horizontal: { display: "block", minWidth: "320px", maxWidth: "728px", margin: "0 auto" },
    vertical: { display: "block", minWidth: "160px", maxWidth: "300px", margin: "0 auto" },
    rectangle: { display: "inline-block", width: "300px", height: "250px" },
    fluid: { display: "block", minWidth: "320px", maxWidth: "100%" },
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...formatStyles[format], ...style }}
      aria-label={ariaLabel}
    >
      <ins
        className="adsbygoogle"
        style={formatStyles[format]}
        data-ad-client={clientId}
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