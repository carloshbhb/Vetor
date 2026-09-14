import type { ReviewSection } from "@/lib/types";

type ReviewContentProps = {
  sections: ReviewSection[];
};

export default function ReviewContent({ sections }: ReviewContentProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="article-body">
      {sections.map((section, index) => (
        <div key={section.id} id={section.id}>
          <h2 className="font-display tracking-wide" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", lineHeight: 1, letterSpacing: "0.02em", margin: `${index === 0 ? 0 : 48}px 0 18px` }}>
            {section.heading}
          </h2>
          <div
            className="text-[0.98rem] font-light leading-[1.85]"
            style={{ color: "#9AA8C4" }}
            dangerouslySetInnerHTML={{
              __html: section.content
                .split("\n\n")
                .map((para) => {
                  const trimmed = para.trim();
                  if (!trimmed) return "";
                  if (trimmed.startsWith("> ")) {
                    return `<div class="callout"><p>${trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p></div>`;
                  }
                  if (trimmed.startsWith("![") && trimmed.includes("](")) {
                    const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
                    if (match) {
                      return `<figure class="article-img"><img src="${match[2]}" alt="${match[1]}" loading="lazy" /><figcaption>${match[1]}</figcaption></figure>`;
                    }
                  }
                  return `<p>${trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
                })
                .filter(Boolean)
                .join("")
            }}
          />
        </div>
      ))}
    </div>
  );
}