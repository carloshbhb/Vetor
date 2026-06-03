'use client';

import { Section } from '../FormUI';
import { StringArrayField } from '../ArrayField';

interface ProsConsSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
}

export default function ProsConsSection({ form, set }: ProsConsSectionProps) {
  return (
    <Section title="6. Prós & Contras">
      <div className="grid grid-cols-2 gap-6">
        <StringArrayField label="✔ Prós" values={form.pros} onChange={pros => set('pros', pros)} placeholder="Ex: Tela AMOLED" />
        <StringArrayField label="✘ Contras" values={form.cons} onChange={cons => set('cons', cons)} placeholder="Ex: Sem NFC" />
      </div>
    </Section>
  );
}
