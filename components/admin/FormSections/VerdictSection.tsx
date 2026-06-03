'use client';

import { Label, Input, Textarea, Section } from '../FormUI';

interface VerdictSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
}

export default function VerdictSection({ form, set }: VerdictSectionProps) {
  return (
    <Section title="7. Veredito Final">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nota Final</Label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={10} step={0.1}
              value={form.verdict.score}
              onChange={e => set('verdict', { ...form.verdict, score: parseFloat(e.target.value) })}
              className="flex-1 accent-blue" />
            <span className="font-bebas text-3xl text-blue w-12 text-center">{form.verdict.score.toFixed(1)}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Label de Categoria</Label>
          <Input value={form.verdict.label}
            onChange={e => set('verdict', { ...form.verdict, label: e.target.value })}
            placeholder="EXCELENTE CUSTO-BENEFÍCIO" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Texto do Veredito</Label>
          <Textarea rows={3} value={form.verdict.text}
            onChange={e => set('verdict', { ...form.verdict, text: e.target.value })}
            placeholder="Conclusão e recomendação definitiva..." />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Recomendação de Perfil</Label>
          <Input value={form.verdict.note}
            onChange={e => set('verdict', { ...form.verdict, note: e.target.value })}
            placeholder="Recomendado para usuários..." />
        </div>
      </div>
    </Section>
  );
}
