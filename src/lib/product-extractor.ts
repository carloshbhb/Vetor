import { JSDOM } from 'jsdom';

export interface ProductData {
  title: string;
  category: string;
  price: string;
  imageUrl: string;
  description?: string;
  specifications?: Record<string, string>;
  marketplace: 'amazon' | 'shopee' | 'mercadolivre' | 'unknown';
  url: string;
}

const MARKETPLACE_PATTERNS = {
  amazon: /amazon\.(com\.br|com)/i,
  shopee: /shopee\.(com\.br|com)/i,
  mercadolivre: /mercadolivre\.com\.br|mercadolibre\./i,
};

function detectMarketplace(url: string): ProductData['marketplace'] {
  for (const [marketplace, pattern] of Object.entries(MARKETPLACE_PATTERNS)) {
    if (pattern.test(url)) {
      return marketplace as ProductData['marketplace'];
    }
  }
  return 'unknown';
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  return response.text();
}

function extractAmazonData(dom: JSDOM, url: string): Partial<ProductData> {
  const document = dom.window.document;

  const title = document.querySelector('#productTitle')?.textContent?.trim() ||
    document.querySelector('h1 span')?.textContent?.trim() ||
    'Produto Amazon';

  const price = document.querySelector('.a-price .a-offscreen')?.textContent?.trim() ||
    document.querySelector('#priceblock_ourprice')?.textContent?.trim() ||
    document.querySelector('#priceblock_dealprice')?.textContent?.trim() ||
    'Preço não disponível';

  const imageUrl = document.querySelector('#landingImage')?.getAttribute('src') ||
    document.querySelector('#imgBlkFront')?.getAttribute('src') ||
    document.querySelector('.imgTagWrapper img')?.getAttribute('src') ||
    '';

  const specs: Record<string, string> = {};
  document.querySelectorAll('#prodDetails tr, .a-keyvalue tr').forEach((row: Element) => {
    const th = row.querySelector('th');
    const td = row.querySelector('td');
    if (th && td) {
      specs[th.textContent?.trim() || ''] = td.textContent?.trim() || '';
    }
  });

  return { title, price, imageUrl, specifications: specs, url, marketplace: 'amazon' };
}

function extractShopeeData(dom: JSDOM, url: string): Partial<ProductData> {
  const document = dom.window.document;

  const title = document.querySelector('[data-testid="pdp-title"]')?.textContent?.trim() ||
    document.querySelector('.pdp-title')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    'Produto Shopee';

  const price = document.querySelector('[data-testid="pdp-price"]')?.textContent?.trim() ||
    document.querySelector('.pdp-price')?.textContent?.trim() ||
    document.querySelector('.product-price')?.textContent?.trim() ||
    'Preço não disponível';

  const imageUrl = document.querySelector('[data-testid="pdp-image"]')?.getAttribute('src') ||
    document.querySelector('.pdp-image img')?.getAttribute('src') ||
    document.querySelector('.product-image img')?.getAttribute('src') ||
    '';

  return { title, price, imageUrl, url, marketplace: 'shopee' };
}

function extractMercadoLivreData(dom: JSDOM, url: string): Partial<ProductData> {
  const document = dom.window.document;

  const title = document.querySelector('.ui-pdp-title')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    'Produto Mercado Livre';

  const price = document.querySelector('.andes-money-amount__fraction')?.textContent?.trim() ||
    document.querySelector('.price-tag-fraction')?.textContent?.trim() ||
    'Preço não disponível';

  const imageUrl = document.querySelector('.ui-pdp-image img')?.getAttribute('src') ||
    document.querySelector('.gallery-image img')?.getAttribute('src') ||
    document.querySelector('img[src*="mlstatic"]')?.getAttribute('src') ||
    '';

  const specs: Record<string, string> = {};
  document.querySelectorAll('.ui-pdp-specs__table tr, .specs-table tr').forEach((row: Element) => {
    const th = row.querySelector('th');
    const td = row.querySelector('td');
    if (th && td) {
      specs[th.textContent?.trim() || ''] = td.textContent?.trim() || '';
    }
  });

  return { title, price, imageUrl, specifications: specs, url, marketplace: 'mercadolivre' };
}

export async function extractProductData(url: string): Promise<ProductData> {
  try {
    const html = await fetchPage(url);
    const dom = new JSDOM(html);
    const marketplace = detectMarketplace(url);

    let extractedData: Partial<ProductData> = { url, marketplace };

    switch (marketplace) {
      case 'amazon':
        extractedData = extractAmazonData(dom, url);
        break;
      case 'shopee':
        extractedData = extractShopeeData(dom, url);
        break;
      case 'mercadolivre':
        extractedData = extractMercadoLivreData(dom, url);
        break;
      default:
        throw new Error('Marketplace não suportado. Use Amazon, Shopee ou Mercado Livre.');
    }

    const category = inferCategory(extractedData.title || '', extractedData.specifications || {});

    return {
      title: extractedData.title || 'Produto Desconhecido',
      category,
      price: extractedData.price || 'Preço não disponível',
      imageUrl: extractedData.imageUrl || '',
      description: '',
      specifications: extractedData.specifications,
      marketplace,
      url,
    };
  } catch (error) {
    console.error('Error extracting product data:', error);
    throw new Error(`Falha ao extrair dados do produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

function inferCategory(title: string, specs: Record<string, string>): string {
  const titleLower = title.toLowerCase();
  const specText = Object.values(specs).join(' ').toLowerCase();
  const allText = `${titleLower} ${specText}`;

  const categories: Record<string, string[]> = {
    'Smartphones': ['smartphone', 'celular', 'iphone', 'galaxy', 'pixel', 'xiaomi', 'motorola'],
    'Notebooks': ['notebook', 'laptop', 'macbook', 'ultrabook', 'thinkpad', 'xps', 'gaming'],
    'Fones de Ouvido': ['fone', 'headphone', 'earphone', 'airpods', 'buds', 'wh-1000xm', 'wf-1000'],
    'Wearables': ['watch', 'relógio', 'smartwatch', 'band', 'fitbit', 'garmin'],
    'Tablets': ['tablet', 'ipad', 'galaxy tab'],
    'Consoles': ['console', 'playstation', 'xbox', 'nintendo', 'switch'],
    'Monitores': ['monitor', 'tela', 'display'],
    'Periféricos': ['teclado', 'mouse', 'keyboard', 'headset', 'webcam'],
    'Componentes': ['placa de vídeo', 'gpu', 'processador', 'cpu', 'memória ram', 'ssd', 'motherboard'],
    'Áudio': ['caixa de som', 'speaker', 'soundbar', 'microfone'],
    'Casa Inteligente': ['smart home', 'alexa', 'google home', 'lâmpada inteligente', 'tomada inteligente'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => allText.includes(k))) {
      return category;
    }
  }

  return 'Eletrônicos';
}

export async function fetchBestSellers(): Promise<Array<{ product_name: string; product_url: string; category: string }>> {
  try {
    const html = await fetchPage('https://www.mercadolivre.com.br/mais-vendidos');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const results: Array<{ product_name: string; product_url: string; category: string }> = [];
    const seen = new Set<string>();

    const BASE_URL = 'https://www.mercadolivre.com.br';

    const items = document.querySelectorAll('div[data-testid="listing-item"] a, a[href*="/p/MLB"]');
    for (const link of items) {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim() || '';
      if (!href || !text || seen.has(href)) continue;
      if (!href.includes('/p/MLB')) continue;

      let fullUrl: string;
      if (href.startsWith('/')) {
        fullUrl = `${BASE_URL}${href}`;
      } else if (href.startsWith('http')) {
        fullUrl = href;
      } else {
        fullUrl = `${BASE_URL}/${href}`;
      }

      const category = detectCategoryFromText(text);
      seen.add(fullUrl);
      results.push({
        product_name: text.substring(0, 100),
        product_url: fullUrl,
        category: category,
      });
    }

    return results.slice(0, 50);
  } catch (error) {
    console.error('Error fetching best sellers:', error);
    throw new Error('Falha ao buscar mais vendidos');
  }
}

function detectCategoryFromText(text: string): string {
  const t = text.toLowerCase();
  const categories: Record<string, string[]> = {
    'Smartphones': ['smartphone', 'celular', 'iphone', 'galaxy', 'pixel', 'xiaomi', 'motorola'],
    'Notebooks': ['notebook', 'laptop', 'macbook', 'ultrabook', 'thinkpad', 'xps', 'gaming'],
    'Fones de Ouvido': ['fone', 'headphone', 'earphone', 'airpods', 'buds', 'wh-1000xm', 'wf-1000'],
    'Wearables': ['watch', 'relógio', 'smartwatch', 'band', 'fitbit', 'garmin'],
    'Tablets': ['tablet', 'ipad', 'galaxy tab'],
    'Consoles': ['console', 'playstation', 'xbox', 'nintendo', 'switch'],
    'Casa Inteligente': ['smart home', 'alexa', 'google home', 'lâmpada', 'tomada', 'intelbras'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => t.includes(k))) return category;
  }
  return 'Eletrônicos';
}

export function generateAffiliateUrl(originalUrl: string, marketplace: ProductData['marketplace']): string {
  const affiliateTags: Record<string, string> = {
    amazon: 'tag=vetorblog-20',
    shopee: 'affiliate=vetorblog',
    mercadolivre: 'affiliate_id=vetorblog',
  };

  const tag = affiliateTags[marketplace];
  if (!tag) return originalUrl;

  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}${tag}`;
}