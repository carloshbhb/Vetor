import type { FAQItem } from '@/lib/types';

export default function FAQAccordion({ faq }: { faq: FAQItem[] }) {
  return (
    <div className="faq-list">
      {faq.map((item, i) => (
        <details 
          key={i} 
          itemScope 
          itemProp="mainEntity" 
          itemType="https://schema.org/Question"
        >
          <summary itemProp="name">{item.question}</summary>
          <div 
            className="faq-answer" 
            itemScope 
            itemProp="acceptedAnswer" 
            itemType="https://schema.org/Answer"
          >
            <p itemProp="text">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
