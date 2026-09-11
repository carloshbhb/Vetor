import { fetchMLProduct, resolveProductImage, buildAffiliateUrl } from '@/lib/mercadolivre';
import { getLightweightReviews } from '@/lib/db';
import { generateText } from '@/lib/ai';

export interface DiscoveryResult {
  product: string;
  category: string;
  price: string;
  priceOld: string;
  imageUrl: string;
  affiliateUrl: string;
  marketplace: string;
  source: 'ai' | 'fallback' | 'manual';
}

const CATEGORIES = [
  'Robôs Aspiradores', 'Fones de Ouvido', 'Casa Inteligente',
  'Wearables / Smartbands', 'Notebooks', 'Tablets',
  'Câmeras de Segurança', 'Eletroportáteis', 'Acessórios para Games',
];

const fallbackProducts: Record<string, string[]> = {
  'Wearables / Smartbands': [
    'Xiaomi Mi Band 9', 'Xiaomi Redmi Watch 5', 'Huawei Band 9',
    'Samsung Galaxy Watch 7', 'Apple Watch SE 2024', 'Amazfit Bip 5',
    'Samsung Galaxy Fit 3', 'Huawei Watch GT 4',
    'Xiaomi Watch S3', 'Amazfit Active Edge Smartwatch',
    'Samsung Galaxy Watch 6', 'Apple Watch Series 9',
    'Huawei Watch Fit 3', 'Xiaomi Smart Band 8 Pro',
    'Amazfit Band 7', 'Amazfit GTS 4 Mini',
  ],
  'Acessórios para Games': [
    'PlayStation DualSense Edge', 'Nintendo Switch Pro Controller',
    'Teclado Mecânico Keychron K2', 'Controle Gamesir G7 SE',
    'Headset HyperX Cloud III', 'Mouse Logitech G305',
    'Cadeira Gamer DT3sports', 'Webcam Logitech C920',
    'Monitor Gamer LG UltraGear 27', 'Teclado Mecânico Redragon Kumara',
    'Mouse Gamer Razer DeathAdder', 'Headset Gamer JBL Quantum 100',
    'Controle Xbox Wireless', 'Cadeira Gamer ThunderX3',
    'Mousepad Gamer HyperX Fury S', 'Webcam Logitech C270',
  ],
  'Fones de Ouvido': [
    'Sony WF-1000XM5', 'JBL Wave Flex', 'AirPods Pro 2',
    'QCY T13', 'Samsung Galaxy Buds FE', 'JBL Tune Buds',
    'Nothing Ear (2)', 'Edifier NeoBuds Pro 2',
    'Sony WH-1000XM5', 'JBL Tune 770NC',
    'Edifier W820NB', 'QCY HT05',
    'Samsung Galaxy Buds 3 Pro', 'Soundcore R50i',
    'Xiaomi Redmi Buds 5', 'JBL Endurance Race',
  ],
  'Robôs Aspiradores': [
    'Robô Aspirador Xiaomi S20', 'Robô Aspirador Kabum Smart 700',
    'Robô Aspirador Eufy G10', 'Robô Aspirador Dreame D10s',
    'Robô Aspirador ILIFE V5s Pro', 'Robô Aspirador Robot L10s',
    'Robô Aspirador Xiaomi X20', 'Robô Aspirador Dreame L10s Ultra',
    'Robô Aspirador Eufy X8 Pro', 'Robô Aspirador Wap Robot W300',
    'Robô Aspirador Electrolux ERB30', 'Robô Aspirador Mondial RB-01',
  ],
  'Casa Inteligente': [
    'Amazon Echo Dot 5ª Geração', 'Lâmpada Inteligente Philips Hue',
    'Fechadura Eletrônica Intelbras FR 101', 'Tomada Inteligente TP-Link Kasa',
    'Alexa Echo Pop', 'Sensor de Porta Intelbras',
    'Amazon Echo Show 5', 'Tomada Inteligente Intelbras EWS 101',
    'Sensor de Presença Intelbras ESP 360', 'Interruptor Inteligente Sonoff TX',
    'Lâmpada Inteligente Elgin Smart', 'Sensor de Porta e Janela Intelbras',
    'Alexa Echo Studio', 'Smart Plug Positivo Casa Inteligente',
  ],
  'Notebooks': [
    'Acer Nitro V 15', 'Lenovo IdeaPad 3i', 'Samsung Galaxy Book 4',
    'Dell Inspiron 15', 'ASUS VivoBook 15', 'HP 15-dy',
    'MacBook Air M3', 'Lenovo ThinkPad E14',
    'Notebook Acer Aspire 5 A515', 'MacBook Pro M3 14',
    'Notebook Dell G15 5530', 'Notebook Asus TUF Gaming F15',
    'Samsung Galaxy Book 5 360', 'Notebook HP Victus 15',
    'Chromebook Acer Spin 311', 'Notebook Lenovo Legion Slim 5',
  ],
  'Tablets': [
    'Samsung Galaxy Tab S9 FE', 'iPad 10ª Geração', 'Xiaomi Pad 6',
    'Samsung Galaxy Tab A9', 'Lenovo Tab M11', 'iPad Air M2',
    'iPad 11ª Geração A16', 'Samsung Galaxy Tab S10 FE',
    'Xiaomi Pad 7', 'iPad Air 11 M3',
    'Samsung Galaxy Tab A9 Plus', 'Lenovo Tab P12',
    'Tablet Positivo Vision Tab 10', 'Samsung Galaxy Tab S6 Lite',
  ],
  'Câmeras de Segurança': [
    'Intelbras iM3', 'TP-Link Tapo C200', 'Xiaomi Mi Camera 2K',
    'Intelbras iD2', 'Ezviz C6C', 'Hikvision DS-2CD1043G0E-I',
    'Câmera Intelbras iM4', 'Câmera TP-Link Tapo C510W',
    'Câmera Ezviz H6c', 'Câmera de Segurança Intelbras iM7',
    'Kit Câmeras Intelbras 4CH', 'Câmera Xiaomi Outdoor CW300',
  ],
  'Eletroportáteis': [
    'Air Fryer Mondial Grand Family 5L', 'Air Fryer Oven Philco 12 Litros',
    'Liquidificador Philips Série 5000', 'Liquidificador Mondial Turbo Power',
    'Cafeteira Espresso Nespresso Essenza Mini', 'Cafeteira Filtrada Electrolux Efficient',
    'Torradeira Elétrica Oster', 'Batedeira Planetária Arno SX80',
    'Aspirador de Pó Vertical Philco Ciclone', 'Ventilador de Coluna Mondial Super Turbo',
  ],
};

export function validateProductCategory(product: string, category: string): boolean {
  const productLower = product.toLowerCase();

  const categoryRules: Record<string, { keywords: string[]; excludeKeywords: string[] }> = {
    'Robôs Aspiradores': {
      keywords: ['aspirador', 'robô', 'robo', 'robot', 'vacuum', 'cleaner', 'robo'],
      excludeKeywords: ['geladeira', 'refrigerador', 'freezer', 'air fryer', 'liquidificador'],
    },
    'Fones de Ouvido': {
      keywords: ['fone', 'headphone', 'earphone', 'earbuds', 'airpods', 'buds', 'xm5', 'wh-1000', 'wf-1000', 'jbl', 'qcy', 'tws', 'edifier', 'soundcore', 'tune', 'wave', 'nothing'],
      excludeKeywords: ['aspirador', 'geladeira', 'tv', 'monitor', 'teclado', 'mouse', 'watch', 'band'],
    },
    'Casa Inteligente': {
      keywords: ['inteligente', 'smart', 'alexa', 'echo', 'google home', 'sensor', 'tomada', 'lâmpada', 'lampada'],
      excludeKeywords: ['aspirador', 'geladeira', 'cooktop', 'fogão', 'fogao'],
    },
    'Wearables / Smartbands': {
      keywords: ['watch', 'band', 'smartband', 'smartwatch', 'amazfit', 'pulseira', 'relógio', 'relogio', 'fitbit', 'galaxy fit', 'mi band'],
      excludeKeywords: ['aspirador', 'geladeira', 'fone', 'headphone'],
    },
    'Notebooks': {
      keywords: ['notebook', 'laptop', 'ultrabook', 'macbook', 'ideapad', 'nitro', 'vivobook', 'book', 'chromebook', 'thinkpad', 'inspiron', 'envy', 'pavilion', 'surface laptop'],
      excludeKeywords: ['aspirador', 'geladeira', 'tablet', 'ipad', 'fone', 'galaxy tab'],
    },
    'Tablets': {
      keywords: ['tablet', 'tab', 'pad', 'ipad', 'galaxy tab'],
      excludeKeywords: ['aspirador', 'geladeira', 'notebook', 'macbook', 'laptop', 'fone'],
    },
    'Câmeras de Segurança': {
      keywords: ['câmera', 'camera', 'cctv', 'segurança', 'seguranca', 'ip camera', 'tapo', 'im3', 'id2'],
      excludeKeywords: ['aspirador', 'geladeira', 'fone', 'watch', 'band'],
    },
    'Eletroportáteis': {
      keywords: ['air fryer', 'liquidificador', 'aspirador', 'cafeteira', 'torradeira', 'batedeira', 'ar fryer', 'ventilador'],
      excludeKeywords: ['geladeira', 'refrigerador', 'freezer', 'cooktop', 'fogão', 'fogao', 'lava-louças'],
    },
    'Acessórios para Games': {
      keywords: ['gamer', 'game', 'gaming', 'playstation', 'xbox', 'nintendo', 'switch', 'dualsense', 'controle', 'controller', 'teclado', 'keyboard', 'mouse', 'headset', 'cadeira', 'webcam', 'monitor', 'mousepad', 'joystick'],
      excludeKeywords: ['aspirador', 'geladeira', 'air fryer', 'liquidificador', 'cafeteira', 'lâmpada', 'lampada', 'echo', 'alexa', 'watch', 'mi band', 'galaxy fit', 'tapo', 'intelbras im'],
    },
  };

  const rules = categoryRules[category];
  if (!rules) return true;

  const hasExcludedKeyword = rules.excludeKeywords.some(keyword =>
    productLower.includes(keyword.toLowerCase())
  );
  if (hasExcludedKeyword) return false;

  const hasCategoryKeyword = rules.keywords.some(keyword =>
    productLower.includes(keyword.toLowerCase())
  );
  return hasCategoryKeyword;
}

export async function discoverProduct(
  options?: { specificProduct?: string; specificCategory?: string }
): Promise<DiscoveryResult> {
  const specificProduct = options?.specificProduct || '';
  const specificCategory = options?.specificCategory || '';

  const reviews = await getLightweightReviews();
  const existingProductNames = reviews.map(r => r.product.toLowerCase());

  const allCategories = Array.from(
    new Set([...Object.keys(fallbackProducts), ...reviews.map(r => r.category).filter(Boolean)])
  );

  let trendingProduct = '';
  let targetCategory = '';
  let attempts = 0;
  const maxAttempts = 12;
  const triedCategories = new Set<string>();
  const rejectedThisRun: string[] = [];
  const exclusionList = reviews
    .map(r => r.product)
    .filter(Boolean)
    .slice(0, 250)
    .join('; ');

  if (specificProduct) {
    trendingProduct = specificProduct;
    targetCategory = specificCategory || 'Casa Inteligente';
  }

  while (attempts < maxAttempts && !trendingProduct) {
    attempts++;

    const availableCategories = allCategories.filter(cat => {
      if (triedCategories.has(cat)) return false;
      const options = fallbackProducts[cat];
      if (!options) return true;
      const available = options.filter(
        p => !existingProductNames.some(ep => ep.includes(p.toLowerCase()) || p.toLowerCase().includes(ep))
      );
      return available.length > 0;
    });

    if (availableCategories.length === 0) break;

    targetCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    triedCategories.add(targetCategory);

    try {
      const trendPrompt = `Você é o Agente de Descoberta de Tráfego do vetor.blog.
Na categoria "${targetCategory}", qual é o produto mais popular e com maior demanda no Brasil em ${new Date().getFullYear()}?
Pense em produtos que estão em alta, com muitas avaliações positivas e boa relação custo-benefício.

IMPORTANTE: O produto DEVE ser da categoria "${targetCategory}". 
- Se a categoria é "Robôs Aspiradores", retorne apenas robôs aspiradores.
- Se a categoria é "Fones de Ouvido", retorne apenas fones de ouvido.
- Se a categoria é "Casa Inteligente", retorne apenas dispositivos de casa inteligente.
- Se a categoria é "Wearables / Smartbands", retorne apenas smartbands ou relógios inteligentes.
- Se a categoria é "Eletroportáteis", retorne apenas eletroportáteis (air fryer, liquidificador, cafeteira, torradeira, batedeira, ventilador).
- Se a categoria é "Acessórios para Games", retorne apenas acessórios gamers (controles, teclados, mouses, headsets, monitores gamer, cadeiras gamer, webcams).
- NÃO retorne produtos de outras categorias (ex: geladeiras, aspiradores de pó, eletrodomésticos grandes).

PROIBIDO repetir qualquer produto desta lista de já publicados (nem variações de nome):
${exclusionList}${rejectedThisRun.length ? `\nTambém proibidos (rejeitados nesta sessão): ${rejectedThisRun.join('; ')}` : ''}

Responda EXCLUSIVAMENTE com o nome exato desse produto (ex: "Sony WH-1000XM5" ou "Samsung Galaxy Fit 3"), sem pontuação, sem aspas e sem explicações.`;

      const text = await generateText({ prompt: trendPrompt });
      trendingProduct = text.trim().replace(/['\"""]/g, '');

      if (reviews.some(r => r.product.toLowerCase().includes(trendingProduct.toLowerCase()))) {
        rejectedThisRun.push(trendingProduct);
        trendingProduct = '';
      }
    } catch {
      // AI discovery failed, will fall back to static list
    }

    if (!trendingProduct) {
      const options = fallbackProducts[targetCategory] || ['Xiaomi Mi Band 9'];
      const available = options.filter(
        p => !existingProductNames.some(ep => ep.includes(p.toLowerCase()) || p.toLowerCase().includes(ep))
      );
      if (available.length === 0) {
        trendingProduct = '';
        continue;
      }
      trendingProduct = available[Math.floor(Math.random() * available.length)];
    }

    if (!trendingProduct || trendingProduct.length > 80 || trendingProduct.includes('\n')) {
      trendingProduct = '';
      continue;
    }

    if (!validateProductCategory(trendingProduct, targetCategory)) {
      rejectedThisRun.push(trendingProduct);
      trendingProduct = '';
      continue;
    }

    if (!specificProduct) {
      const exists = reviews.find(
        r =>
          r.product.toLowerCase().includes(trendingProduct.toLowerCase()) ||
          r.slug === slugify(trendingProduct)
      );
      if (exists) {
        rejectedThisRun.push(trendingProduct);
        trendingProduct = '';
      }
    }
  }

  if (!trendingProduct) {
    throw new Error(`Não foi possível encontrar um produto novo após ${maxAttempts} tentativas.`);
  }

  const source: DiscoveryResult['source'] = attempts > 0 ? 'ai' : 'fallback';

  let mlImageUrl = '';
  let mlPrice = '';
  let mlPriceOld = '';
  let mlAffiliateUrl = buildAffiliateUrl(
    `https://lista.mercadolivre.com.br/${encodeURIComponent(trendingProduct)}`
  );

  try {
    const mlData = await fetchMLProduct(trendingProduct);
    if (mlData) {
      mlImageUrl = mlData.imageUrl || '';
      mlPrice = mlData.price || '';
      mlPriceOld = mlData.priceOld || '';
      mlAffiliateUrl = mlData.affiliateUrl || mlAffiliateUrl;
    }
  } catch {
    // ML enrichment failed, will try image resolution below
  }

  let finalImageUrl = mlImageUrl;
  if (finalImageUrl) {
    const { isImageReachable } = await import('@/lib/mercadolivre');
    if (!(await isImageReachable(finalImageUrl))) {
      finalImageUrl = '';
    }
  }
  if (!finalImageUrl) {
    const retry = await resolveProductImage(trendingProduct);
    finalImageUrl = retry.imageUrl;
  }
  if (!finalImageUrl) {
    throw new Error(`Publicação bloqueada: nenhuma imagem encontrada para "${trendingProduct}".`);
  }

  return {
    product: trendingProduct,
    category: targetCategory,
    price: mlPrice,
    priceOld: mlPriceOld,
    imageUrl: finalImageUrl,
    affiliateUrl: mlAffiliateUrl,
    marketplace: 'Mercado Livre',
    source,
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\breview\b/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-+/g, '-');
}
