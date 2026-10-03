import type { ReviewSection } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";

type ReviewContentProps = {
  sections: ReviewSection[];
};

const BOLD = /\*\*(.*?)\*\*/g;
const LIST_MARKER = /^([-*]\s+|\d+\.\s+)/;

function inline(text: string): string {
  return text.replace(BOLD, "<strong>$1</strong>");
}

function isListItem(line: string): boolean {
  return LIST_MARKER.test(line.trim());
}

function listTag(lines: string[]): "ul" | "ol" {
  return /^\d+\.\s+/.test(lines[0].trim()) ? "ol" : "ul";
}

function renderList(block: string): string | null {
  const lines = block.split("\n").filter((line) => line.trim());
  if (!lines.length || !lines.every((line) => isListItem(line))) return null;

  const tag = listTag(lines);
  const items = lines
    .map((line) => `<li>${inline(line.trim().replace(LIST_MARKER, ""))}</li>`)
    .join("");

  return `<${tag}>${items}</${tag}>`;
}

function renderBlock(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";

  const list = renderList(trimmed);
  if (list) return list;

  if (trimmed.startsWith("> ")) {
    return `<div class="callout"><p>${inline(trimmed.slice(2))}</p></div>`;
  }

  if (trimmed.startsWith("![") && trimmed.includes("](")) {
    const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return `<figure class="article-img"><img src="${match[2]}" alt="${match[1]}" loading="lazy" decoding="async" width="800" height="450" /><figcaption>${match[1]}</figcaption></figure>`;
    }
  }

  return `<p>${inline(trimmed)}</p>`;
}

export default function ReviewContent({ sections }: ReviewContentProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <>
      {sections.map((section) => (
        <div key={section.id} id={section.id}>
          <h2>{section.heading}</h2>
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(
                section.content
                  .split("\n\n")
                  .map(renderBlock)
                  .filter(Boolean)
                  .join("")
              ),
            }}
          />
        </div>
      ))}
    </>
  );
}
