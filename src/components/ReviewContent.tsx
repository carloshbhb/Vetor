import type { ReviewSection } from "@/lib/types";

interface ReviewContentProps {
  sections: ReviewSection[];
}

export default function ReviewContent({ sections }: ReviewContentProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div>
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold mb-4">
            {section.tocEmoji} {section.heading}
          </h2>
          <div className="text-[var(--muted)] leading-relaxed space-y-4">
            {section.content.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
