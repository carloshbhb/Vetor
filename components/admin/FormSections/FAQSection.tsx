'use client';

import { Section } from '../FormUI';
import { FAQArrayField } from '../ArrayField';

interface FAQSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
}

export default function FAQSection({ form, set }: FAQSectionProps) {
  return (
    <Section title="8. FAQ Otimizado para buscas (Google)">
      <FAQArrayField values={form.faq} onChange={faq => set('faq', faq)} />
    </Section>
  );
}
