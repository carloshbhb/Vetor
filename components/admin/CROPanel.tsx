'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';

interface CROCheck {
  label: string;
  pass: boolean;
}

interface CROPanelProps {
  croChecks: CROCheck[];
}

export default function CROPanel({ croChecks }: CROPanelProps) {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-5 space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="font-syne font-bold text-sm text-text flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
          </svg>
          CRO (CONVERSÃO & AFILIADO)
        </h3>
      </div>

      <div className="space-y-2.5">
        {croChecks.map((check, i) => (
          <div key={i} className="flex items-start gap-2.5 text-xs">
            {check.pass ? (
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0 mt-0.5 bg-bg2" />
            )}
            <span className={check.pass ? 'text-text2' : 'text-text-muted'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50/50 border border-emerald-500/10 rounded-xl p-3.5 text-emerald-950 text-xs">
        <div className="flex gap-2 font-bold mb-1 items-center">
          <Sparkles size={14} className="text-emerald-700" />
          <span>Alta Conversão</span>
        </div>
        Certifique-se de que os Prós/Contras e a tabela comparativa estão atrativos para elevar as vendas via link de afiliado.
      </div>
    </div>
  );
}
