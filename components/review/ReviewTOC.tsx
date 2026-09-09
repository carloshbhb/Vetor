'use client';

import { useEffect, useState } from 'react';
import type { ReviewSection } from '@/lib/types';

interface ReviewTOCProps {
  sections: ReviewSection[];
  hasSpecs: boolean;
  hasCompare: boolean;
  hasProsCons: boolean;
  hasFAQ: boolean;
}

export default function ReviewTOC({ sections, hasSpecs, hasCompare, hasProsCons, hasFAQ }: ReviewTOCProps) {
  const [showToc, setShowToc] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const update = (e: MediaQueryList | MediaQueryListEvent) => {
      setIsMobile(e.matches);
      // Default: collapsed on mobile, expanded on desktop
      setShowToc(!e.matches);
    };
    update(mq);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const headings = document.querySelectorAll('.article-body h2[id]');
    const links = document.querySelectorAll('.toc-list a');
    if (!headings.length || !links.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'));
          const active = document.querySelector(`.toc-list a[href="#${e.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });

    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [sections, showToc]);

  return (
    <div className="toc-card" role="navigation" aria-label="Sumário do artigo">
      <button
        type="button"
        className="toc-toggle"
        onClick={() => setShowToc((v) => !v)}
        aria-expanded={showToc}
        aria-controls="toc-content"
      >
        <span className="toc-title" style={{ marginBottom: 0 }}>Sumário</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`toc-chevron ${showToc ? 'toc-chevron-open' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        id="toc-content"
        className={`toc-content ${showToc ? 'toc-content-open' : ''}`}
      >
        <ul className="toc-list">
          {sections.map((sec) => (
            <li key={sec.id}>
              <a href={`#${sec.id}`}>• {sec.heading}</a>
            </li>
          ))}
          {hasSpecs && <li><a href="#ficha-tecnica">• Ficha Técnica</a></li>}
          {hasCompare && <li><a href="#comparativo">• Comparativo Direto</a></li>}
          {hasProsCons && <li><a href="#pros-contras">• Prós e Contras</a></li>}
          <li><a href="#veredicto">• Veredicto Final</a></li>
          {hasFAQ && <li><a href="#faq">• Perguntas Frequentes</a></li>}
        </ul>
      </div>
    </div>
  );
}
