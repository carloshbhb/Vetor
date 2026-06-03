'use client';

import { Label, Input, Textarea, Section } from '../FormUI';
import { ScoreBarsField } from '../ArrayField';

interface HeroSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
}

export default function HeroSection({ form, set }: HeroSectionProps) {
  return (
    <Section title="3. Hero & Notas" desc="Títulos condensados e notas de atributos para o radar.">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Linha 1 do Título</Label>
          <Input value={form.hero.headlineLine1}
            onChange={e => set('hero', { ...form.hero, headlineLine1: e.target.value })}
            placeholder="SAMSUNG GALAXY FIT3" />
        </div>
        <div className="space-y-1.5">
          <Label>Linha 2 do Título</Label>
          <Input value={form.hero.headlineLine2}
            onChange={e => set('hero', { ...form.hero, headlineLine2: e.target.value })}
            placeholder="VALE A PENA EM 2026?" />
        </div>
        <div className="space-y-1.5">
          <Label>Destaque Azul</Label>
          <Input value={form.hero.headlineEm}
            onChange={e => set('hero', { ...form.hero, headlineEm: e.target.value })}
            placeholder="GALAXY FIT3" />
        </div>
        <div className="space-y-1.5">
          <Label>Nota Geral (0–10)</Label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={10} step={0.1}
              value={form.hero.overallScore}
              onChange={e => set('hero', { ...form.hero, overallScore: parseFloat(e.target.value) })}
              className="flex-1 accent-blue" />
            <span className="font-bebas text-3xl text-blue w-12 text-center">{form.hero.overallScore.toFixed(1)}</span>
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Lead (Abertura)</Label>
          <Textarea rows={3} value={form.hero.lead}
            onChange={e => set('hero', { ...form.hero, lead: e.target.value })}
            placeholder="2–3 frases de impacto..." />
        </div>
      </div>
      <ScoreBarsField
        values={form.hero.bars}
        onChange={bars => set('hero', { ...form.hero, bars })}
      />
    </Section>
  );
}
