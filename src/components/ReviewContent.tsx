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
          <h2>{section.heading}</h2>
          <div
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
