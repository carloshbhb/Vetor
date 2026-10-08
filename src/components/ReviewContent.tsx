import type { ReviewSection } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";

type ReviewContentProps = {
  sections: ReviewSection[];
};

const BOLD = /\*\*(.*?)\*\*/g;
const LIST_MARKER = /^([-*]\s+|\d+\.\s+)/;
const HTML_CONTENT = /<\/?(?:p|h[2-6]|ul|ol|li|blockquote|figure|img|table|div|pre|hr|a)\b/i;

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

function renderMarkdownBlock(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";

  const list = renderList(trimmed);
  if (list) return list;

  if (trimmed.startsWith("### ")) {
    return `<h3>${inline(trimmed.slice(4).trim())}</h3>`;
  }

  if (trimmed.startsWith("#### ")) {
    return `<h4>${inline(trimmed.slice(5).trim())}</h4>`;
  }

  if (trimmed.startsWith("> ")) {
    return `<div class="callout"><p>${inline(trimmed.slice(2))}</p></div>`;
  }

  const image = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/s);
  if (image) {
    return `<figure class="article-img"><img src="${image[2]}" alt="${image[1]}" loading="lazy" decoding="async" width="800" height="450" /><figcaption>${image[1]}</figcaption></figure>`;
  }

  return `<p>${inline(trimmed)}</p>`;
}

function renderSectionContent(content: string): string {
  const source = content.trim();
  if (!source) return "";

  // Alguns reviews já chegam do banco como HTML editorial completo.
  // Nesses casos, sanitizamos o bloco inteiro em vez de embrulhá-lo novamente
  // em <p>, evitando parágrafos vazios/nested markup e preservando figuras,
  // listas, links, tabelas e demais elementos editoriais permitidos.
  if (HTML_CONTENT.test(source)) {
    return sanitizeHtml(source);
  }

  return sanitizeHtml(
    source
      .split(/\n\n+/)
      .map(renderMarkdownBlock)
      .filter(Boolean)
      .join("")
  );
}

export default function ReviewContent({ sections }: ReviewContentProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <>
      {sections.map((section, index) => (
        <section key={section.id} id={section.id} className="review-editorial-section">
          <header className="review-editorial-section-head">
            <span className="review-editorial-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="section-kicker">
                {section.tocEmoji ? `${section.tocEmoji} ` : ""}{section.tocLabel || "Análise Vetor"}
              </div>
              <h2>{section.heading}</h2>
            </div>
          </header>

          <div
            className="review-editorial-body"
            dangerouslySetInnerHTML={{
              __html: renderSectionContent(section.content),
            }}
          />
        </section>
      ))}
    </>
  );
}
