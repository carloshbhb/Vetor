'use client';

import { Section } from '../FormUI';
import { KVArrayField } from '../ArrayField';

interface SpecsSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
}

export default function SpecsSection({ form, set }: SpecsSectionProps) {
  return (
    <Section title="4. Ficha Técnica">
      <KVArrayField
        label="Especificações"
        values={form.specs}
        onChange={specs => set('specs', specs)}
      />
    </Section>
  );
}
