const STOP_WORDS = new Set([
  "para", "com", "como", "mais", "menos", "sobre", "de", "da", "do", "das", "dos",
  "uma", "um", "the", "and", "for", "new", "novo", "nova", "hoje", "brasil",
  "brasileiro", "brasileira", "ate", "esta", "estao", "fica", "ficou", "pode",
  "podem", "apos", "ainda", "muito", "muita", "muitos", "muitas", "entre",
  "segundo", "saiba", "veja", "confira", "entenda", "detalhes", "sobre",
  "e", "ou", "no", "na", "nos", "nas", "em", "por", "ao", "aos",
]);

type AliasGroup = {
  terms: string[];
  productTerms: string[];
};

// These are explicit use-case relationships, not generic word co-occurrences.
// Keep them narrow: a topic only qualifies when the Social List has a product
// in a category that can genuinely serve the audience interested in that story.
const TOPIC_CATEGORY_ALIASES: AliasGroup[] = [
  {
    terms: ["jato", "jato executivo", "aeronave", "aviao", "aeroporto", "viagem", "voo"],
    productTerms: ["fone", "headset", "earbuds", "powerbank", "carregador", "adaptador"],
  },
  {
    terms: ["futebol", "corinthians", "campinense", "treze", "copa paraiba", "copa do mundo", "campeonato"],
    productTerms: ["tv", "televisao", "televisores", "soundbar", "projetor", "streaming"],
  },
  {
    terms: ["home office", "trabalho remoto", "escritorio em casa"],
    productTerms: ["notebook", "webcam", "monitor", "microfone", "headset"],
  },
  {
    terms: ["inteligencia artificial", "chatgpt", "ia generativa"],
    productTerms: ["smartphone", "notebook", "tablet", "computador"],
  },
  {
    terms: ["show", "festival", "turne", "musica ao vivo"],
    productTerms: ["fone", "headset", "earbuds", "caixa de som", "soundbar"],
  },
];

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: unknown): string[] {
  return [...new Set(normalize(value).split(/\s+/).filter((word) =>
    word.length >= 3 && !STOP_WORDS.has(word)
  ))];
}

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;
  return (" " + text + " ").includes(" " + normalizedTerm + " ");
}

export function scoreTrendProductRelevance(input: {
  topicTitle: string;
  newsTitles?: string[];
  productTitle: string;
  productCategory?: string;
}): number {
  const topicTitle = normalize(input.topicTitle);
  const newsText = normalize((input.newsTitles || []).join(" "));
  const productTokens = new Set([
    ...tokens(input.productTitle),
    ...tokens(input.productCategory),
  ]);
  if (!topicTitle || productTokens.size === 0) return 0;

  const directMatches = tokens(input.topicTitle).filter((token) => productTokens.has(token));
  const topicAndNews = [topicTitle, newsText].filter(Boolean).join(" ");
  const aliasMatches = new Set<string>();
  for (const group of TOPIC_CATEGORY_ALIASES) {
    if (!group.terms.some((term) => containsTerm(topicAndNews, term))) continue;
    for (const term of group.productTerms) {
      for (const token of tokens(term)) {
        if (productTokens.has(token)) aliasMatches.add(token);
      }
    }
  }

  // A headline overlap can support an already meaningful connection, but can
  // never create one by itself. This prevents filler words such as "até",
  // "pode" or "mais" from pairing unrelated news and products.
  const newsMatches = tokens(newsText).filter((token) =>
    productTokens.has(token) && !directMatches.includes(token)
  );

  if (directMatches.length === 0 && aliasMatches.size === 0) return 0;
  return directMatches.length * 6 + aliasMatches.size * 6 + Math.min(newsMatches.length, 2);
}
