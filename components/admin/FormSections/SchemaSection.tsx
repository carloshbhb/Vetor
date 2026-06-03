'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Label, Input, Section } from '../FormUI';

interface SchemaSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
}

export default function SchemaSection({ form, set }: SchemaSectionProps) {
  return (
    <Section title="9. Schema.org & Monetização" desc="Configurações de SEO Avançado.">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Estrelas (1–5)</Label>
          <Input type="number" min={1} max={5} step={0.1}
            value={form.schemaRating.ratingValue}
            onChange={e => set('schemaRating', { ...form.schemaRating, ratingValue: parseFloat(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Nº Avaliações Google</Label>
          <Input type="number" min={10}
            value={form.schemaRating.reviewCount}
            onChange={e => set('schemaRating', { ...form.schemaRating, reviewCount: parseInt(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Habilitar AdSense</Label>
          <button
            type="button"
            onClick={() => set('adsEnabled', !form.adsEnabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${form.adsEnabled ? 'bg-green-bg border-green/30 text-green' : 'bg-bg2 border-border text-text-muted'}`}
          >
            {form.adsEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
            {form.adsEnabled ? 'Anúncios Ativos' : 'Sem Anúncios'}
          </button>
        </div>
      </div>
    </Section>
  );
}
