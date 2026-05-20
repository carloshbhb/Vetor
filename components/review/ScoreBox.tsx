'use client';

import { useEffect, useRef } from 'react';
import type { ScoreBar } from '@/lib/types';

interface ScoreBoxProps {
  overallScore: number;
  bars: ScoreBar[];
}

export default function ScoreBox({ overallScore, bars }: ScoreBoxProps) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>('.bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.pct + '%';
          });
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getStars = (score: number) => {
    const starsOutofFive = Math.round(score / 2);
    const filledStars = '★'.repeat(Math.max(0, Math.min(5, starsOutofFive)));
    const emptyStars = '☆'.repeat(Math.max(0, Math.min(5, 5 - starsOutofFive)));
    return filledStars + emptyStars;
  };

  return (
    <div className="score-strip" role="region" aria-label="Pontuação geral">
      <div>
        <div className="score-label">Nota Vetor Blog</div>
        <div className="score-number">{overallScore.toFixed(1)}</div>
        <div className="score-stars" aria-label={`${overallScore.toFixed(1)} de 10`}>
          {getStars(overallScore)}
        </div>
      </div>
      <div className="score-bars" role="list" ref={barsRef}>
        {bars.map(bar => (
          <div className="bar-row" role="listitem" key={bar.label}>
            <span className="bar-label">{bar.label}</span>
            <div className="bar-track">
              <div 
                className="bar-fill" 
                style={{ width: '0%' }} 
                data-pct={bar.pct} 
              />
            </div>
            <span className="bar-val">{bar.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
