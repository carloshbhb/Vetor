'use client';

import { useEffect } from 'react';
import type { ReviewSection } from '@/lib/types';

interface ReviewTOCProps {
  sections: ReviewSection[];
  hasSpecs: boolean;
  hasCompare: boolean;
  hasProsCons: boolean;
  hasFAQ: boolean;
}

export default function ReviewTOC({ sections, hasSpecs, hasCompare, hasProsCons, hasFAQ }: ReviewTOCProps) {
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
  }, [sections]);

  return (
    <div className="toc-card" role="navigation" aria-label="Sumário do artigo">
      <div className="toc-title">Sumário</div>
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
  );
}
