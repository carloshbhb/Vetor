import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const template = readFileSync(join(root, "src/app/reviews/[slug]/LandingPageTemplate.tsx"), "utf8");
const styles = readFileSync(join(root, "src/app/reviews/[slug]/LandingPageTemplate.module.css"), "utf8");
const route = readFileSync(join(root, "src/app/reviews/[slug]/page.tsx"), "utf8");
const globalCss = readFileSync(join(root, "src/app/globals.css"), "utf8");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error("[lp-template-contract] " + message);
}

const orderedMarkers = [
  'id="destaques"',
  "Destaques Principais",
  'id="ficha-tecnica"',
  "Ficha Técnica Completa",
  'id="analise-detalhada"',
  "Análise Detalhada",
  'id="comparativo"',
  "Comparativo com Concorrentes",
  '<footer className={styles.footer}>',
];
let previousIndex = -1;
for (const marker of orderedMarkers) {
  const index = template.indexOf(marker);
  assert(index >= 0, "Falta seção ou marcador obrigatório do modelo: " + marker);
  assert(index > previousIndex, "A ordem da referência foi alterada perto de: " + marker);
  previousIndex = index;
}

const requiredClasses = [
  "siteHeader", "nav", "hero", "heroGrid", "heroProduct", "productImage",
  "sectionTitle", "highlightGrid", "highlightCard", "tableWrap", "analysisGrid",
  "analysisCard", "comparisonTable", "footer", "footerGrid", "footerLinks", "mobileCta",
];
for (const className of requiredClasses) {
  assert(template.includes("styles." + className), "Classe estrutural ausente: " + className);
  assert(styles.includes("." + className), "Regra visual ausente: " + className);
}

for (const token of [
  "--navy: #0f172a",
  "--accent: #2563eb",
  "--background: #f8fafc",
  "--surface: #ffffff",
  "padding: 36px 0 58px",
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  "@media (max-width: 980px)",
  "@media (max-width: 720px)",
]) {
  assert(styles.includes(token), "Token visual ou breakpoint da referência ausente: " + token);
}
assert(!styles.includes("#ffe600"), "A identidade antiga amarela voltou ao template.");
assert(
  styles.includes('body:has([data-template="landing-page"]):has([role="dialog"][aria-label="Aviso de cookies"]))'),
  "O CTA móvel não é ocultado enquanto o diálogo de cookies está aberto."
);
assert(template.includes('data-template="landing-page"'), "O template não marca a LP para evitar chrome global duplicado.");
assert(template.includes("section-title"), "A classe .section-title do HTML de referência está ausente.");
assert(template.includes("<CookiePreferencesControl />"), "O rodapé LP precisa manter acesso às preferências de cookies.");
assert(template.includes('className={`${styles.sectionTitle} section-title`}'), "A classe section-title da referência não está aplicada.");
assert(route.includes('review.content_type === "lp"'), "A rota não encaminha LPs ao template dedicado.");
assert(route.includes("<LandingPageTemplate review={review} />"), "O template dedicado não é usado na renderização.");
assert(
  globalCss.includes('body:has([data-template="landing-page"]) > .site-header') &&
    globalCss.includes('body:has([data-template="landing-page"]) > footer'),
  "As páginas LP não escondem o header/footer global duplicado."
);
assert(!template.includes('id="resumo}>'), "Foi encontrada a marcação JSX inválida que causou falha de build.");
assert(!template.includes("displaySpecs"), "Variável obsoleta de ficha técnica voltou ao template.");

console.log("[lp-template-contract] OK: identidade azul/clara, ordem de seções, tabelas, cards responsivos, footer e roteamento LP conferidos.");
