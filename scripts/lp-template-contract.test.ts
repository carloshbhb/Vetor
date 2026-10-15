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
  'id="resumo"',
  'id="criterios"',
  'id="desempenho"',
  'id="preco"',
  'id="comparativo"',
  'id="publico"',
  "Conclusão:",
  'id="faq"',
  'id="leia-tambem"',
];
let previousIndex = -1;
for (const marker of orderedMarkers) {
  const index = template.indexOf(marker);
  assert(index >= 0, "Falta a seção obrigatória do modelo: " + marker);
  assert(index > previousIndex, "A ordem do modelo foi alterada perto de: " + marker);
  previousIndex = index;
}

const requiredTemplateClasses = [
  "siteHeader", "nav", "hero", "heroGrid", "verdict", "adSlot",
  "contentWrap", "layout", "article", "toc", "quickSummary", "factGrid",
  "callout", "compareWrap", "tag", "whoGrid", "faq", "related",
  "sidebar", "sideCard", "footerGrid", "footerLinks", "mobileCta",
];
for (const className of requiredTemplateClasses) {
  assert(template.includes("styles." + className), "Classe estrutural ausente no template: " + className);
  assert(styles.includes("." + className), "Regra CSS ausente para a classe estrutural: " + className);
}

for (const token of [
  "--bg: #071018", "--bg-2: #0d1722", "--surface: #ffffff",
  "--surface-2: #f5f7f9", "--brand: #ffe600", "--brand-2: #f6ce00",
  "--max: 1180px", "padding: 56px 0 76px",
  "grid-template-columns: minmax(0,1.32fr) minmax(300px,.68fr)",
  "@media (max-width: 980px)", "@media (max-width: 720px)",
]) {
  assert(styles.includes(token), "Token ou breakpoint de referência ausente: " + token);
}

assert(template.includes('data-template="landing-page"'), "O template não marca a página para evitar chrome global duplicado.");
assert(template.includes("imageUrl && <img"), "A imagem principal do produto não é renderizada no veredito.");
assert(template.includes("<CookiePreferencesControl />"), "O rodapé LP precisa manter acesso às preferências de cookies.");
assert(route.includes('review.content_type === "lp"'), "A rota não encaminha LPs ao template dedicado.");
assert(route.includes("<LandingPageTemplate review={review} />"), "O template dedicado não é usado na renderização.");
assert(!template.includes('id="resumo}>'), "Foi encontrada a marcação JSX inválida que causou falha de build.");
assert(
  globalCss.includes('body:has([data-template="landing-page"]) > .site-header') &&
    globalCss.includes('body:has([data-template="landing-page"]) > footer'),
  "As páginas LP não escondem o header/footer global duplicado."
);
assert(!template.includes("displaySpecs"), "Variável obsoleta de ficha técnica voltou ao template.");

console.log("[lp-template-contract] OK: estrutura, ordem, classes, tokens visuais e roteamento LP conferidos.");
