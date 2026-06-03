'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SEOCheck {
  label: string;
  pass: boolean;
  warning: boolean;
}

interface SEOPanelProps {
  seoChecks: SEOCheck[];
  healthScore: number;
  wordCount: number;
  readingTime: number;
}

export default function SEOPanel({ seoChecks, healthScore, wordCount, readingTime }: SEOPanelProps) {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-5 space-y-4">
      <div className="border-b border-border pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-syne font-bold text-sm text-text flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            SEO LIVE ANALYZER
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${healthScore >= 80 ? 'bg-emerald-100 text-emerald-800' : healthScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-bg text-red'}`}>
            {healthScore}%
          </span>
        </div>
        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-bg2 p-3 rounded-xl border border-border text-center">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Palavras</p>
          <p className={`font-bebas text-2xl mt-0.5 ${wordCount >= 800 ? 'text-green' : 'text-text'}`}>{wordCount}</p>
          <span className="text-[9px] text-text-muted">{wordCount >= 800 ? '🟢 Ideal' : '🟡 Pouco texto'}</span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Leitura</p>
          <p className="font-bebas text-2xl text-text mt-0.5">{readingTime} min</p>
          <span className="text-[9px] text-text-muted">Calculado</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">CHECKLIST DE RANQUEAMENTO</p>
        {seoChecks.map((check, i) => (
          <div key={i} className="flex items-start gap-2.5 text-xs">
            {check.pass ? (
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : check.warning ? (
              <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0 mt-0.5 bg-bg2" />
            )}
            <span className={check.pass ? 'text-text2' : 'text-text-muted'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
