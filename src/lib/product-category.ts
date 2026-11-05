/**
 * Categoria editorial de um produto.
 *
 * O rótulo de origem do afiliado ("Lista Social", "Mercado Livre Frete Grátis")
 * não é uma categoria editorial: se virar categoria de review, cria hubs finos
 * sem intenção de busca. A inferência é compartilhada entre o gerador diário e
 * a normalização de drafts já gravados.
 */
import { canonicalProductName } from "@/lib/product-name";

/** Rótulos que descrevem a origem do link, não a categoria editorial. */
export const SOURCE_LABEL_CATEGORIES = new Set([
  "lista social",
  "mercado livre frete gratis",
  "mercado livre frete grátis",
]);

export function isSourceLabelCategory(value: unknown): boolean {
  return SOURCE_LABEL_CATEGORIES.has(String(value || "").trim().toLowerCase());
}

export function inferProductCategory(name: string, title: string, fallback: string | null): string {
  const value = canonicalProductName(`${name || ""} ${title || ""}`);

  if (/\b(robot vacuum|robo aspirador|mi robot vacuum|aspirador robo)\b/i.test(value)) return 'Robôs Aspiradores';
  if (/\b(redmi note|smartphone|celular|iphone|galaxy a\d)\b/i.test(value)) return 'Smartphones';
  if (/\b(intelbras im\d+|camera de seguranca|camera wifi)\b/i.test(value)) return 'Câmeras de Segurança';
  if (/\b(m track|m audio|interface de audio|interface audio|microfone|mesa de som)\b/i.test(value)) return 'Áudio Profissional';
  if (/\b(notebook|laptop|inspiron|vivobook|ideapad)\b/i.test(value)) return 'Notebooks';
  if (/\b(fritadeira|air fryer|pfr\d+)\b/i.test(value)) return 'Eletroportáteis';
  if (/\b(fone|headset|earphone|airpod|buds)\b/i.test(value)) return 'Fones de Ouvido';
  if (/\b(tablet|ipad|galaxy tab)\b/i.test(value)) return 'Tablets';
  if (/\b(smartwatch|smart band|relogio|watch)\b/i.test(value)) return 'Wearables / Smartbands';
  if (/\b(casa inteligente|smart light|alexa|echo dot|ecovacs|roborock)\b/i.test(value)) return 'Casa Inteligente';
  if (/\b(console|playstation|ps5|xbox|nintendo|gamepad|joystick|controle|headset gamer|monitor gamer|teclado gamer|mouse gamer)\b/i.test(value)) {
    return 'Acessórios para Games';
  }

  const normalizedFallback = String(fallback || '').trim();
  // Um rótulo de origem nunca vira categoria editorial.
  if (!normalizedFallback || isSourceLabelCategory(normalizedFallback)) return 'Geral';
  return normalizedFallback;
}
