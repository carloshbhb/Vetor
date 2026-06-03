'use client';

import { Section } from '../FormUI';
import { SectionsField } from '../ArrayField';

interface SectionsSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
}

export default function SectionsSection({ form, set }: SectionsSectionProps) {
  return (
    <Section title="5. Conteúdo das Seções" desc="Escreva os tópicos do seu artigo em Markdown.">
      <SectionsField
        values={form.sections}
        onChange={sections => set('sections', sections)}
      />
    </Section>
  );
}
