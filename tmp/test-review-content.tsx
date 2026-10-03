import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReviewContent from "@/components/ReviewContent";
import type { ReviewSection } from "@/lib/types";

function sec(id: string, content: string): ReviewSection {
  return { id, heading: id, content, tocEmoji: "", tocLabel: id };
}

const sections: ReviewSection[] = [
  sec(
    "design",
    "Primeiro paragrafo com **destaque** forte.\n\n- Caixa em aluminio\n- Tela de 2.000 nits\n- Digital Crown\n\nSegundo paragrafo normal."
  ),
  sec("bateria", "Texto com lista ordenada:\n\n1. Carga em 45 minutos\n2. Modo economia"),
  sec("nota", "> **Nota 8,5.** Excelente custo-beneficio."),
];

const html = renderToStaticMarkup(React.createElement(ReviewContent, { sections }));

const checks: Array<[string, boolean]> = [
  ["lista ul gerada", html.includes("<ul>")],
  ["5 itens li", (html.match(/<li>/g) || []).length === 5],
  ["lista ordenada ol", html.includes("<ol>")],
  ["negrito convertido", html.includes("<strong>destaque</strong>")],
  ["callout preservado", html.includes('class="callout"')],
  ["sem p aninhado", !/<p>\s*<p>/.test(html)],
  ["html do input nao escapado", !html.includes("&lt;")],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
}
console.log(failed === 0 ? "RENDER OK" : `RENDER FAIL (${failed})`);
process.exit(failed === 0 ? 0 : 1);
