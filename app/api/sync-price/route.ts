import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

// Helper to extract first balanced JSON object from string
function extractFirstJSON(str: string, startIdx: number): string | null {
  let braceCount = 0;
  let inString = false;
  let stringChar: string | null = null;
  let escaped = false;
  
  for (let i = startIdx; i < str.length; i++) {
    const char = str[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if ((char === '"' || char === "'") && !escaped) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (stringChar === char) {
        inString = false;
        stringChar = null;
      }
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return str.substring(startIdx, i + 1);
        }
      }
    }
  }
  return null;
}

// Recursively traverse JSON to find product cards (polycards)
interface ScrapedProduct {
  title: string;
  price: number;
  oldPrice: number | null;
}

function collectPolycards(obj: any, products: ScrapedProduct[]) {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj.polycards)) {
    for (const card of obj.polycards) {
      if (card.components && Array.isArray(card.components)) {
        let title = '';
        let price: number | null = null;
        let oldPrice: number | null = null;
        for (const comp of card.components) {
          if (comp.type === 'title' && comp.title && comp.title.text) {
            title = comp.title.text;
          }
          if (comp.type === 'price' && comp.price) {
            if (comp.price.current_price && comp.price.current_price.value !== undefined) {
              price = comp.price.current_price.value;
            }
            if (comp.price.previous_price && comp.price.previous_price.value !== undefined) {
              oldPrice = comp.price.previous_price.value;
            }
          }
        }
        if (title && price !== null) {
          products.push({ title, price, oldPrice });
        }
      }
    }
  }

  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      collectPolycards(obj[key], products);
    }
  }
}

// Word-overlap matching algorithm
function findBestMatch(products: ScrapedProduct[], targetName: string): ScrapedProduct | null {
  if (!products || products.length === 0) return null;
  const cleanTarget = targetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  let bestMatch: ScrapedProduct | null = null;
  let maxOverlap = 0;

  for (const p of products) {
    const cleanTitle = p.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const targetWords = cleanTarget.split(/\s+/).filter(w => w.length > 2);
    
    let overlap = 0;
    for (const tw of targetWords) {
      if (cleanTitle.includes(tw)) {
        overlap++;
      }
    }

    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestMatch = p;
    }
  }

  return maxOverlap > 0 ? bestMatch : null;
}

export async function POST(req: Request) {
  try {
    const { affiliateUrl, product } = await req.json();
    if (!affiliateUrl) {
      return NextResponse.json({ error: 'Por favor, insira o Link de Afiliado primeiro.' }, { status: 400 });
    }

    let scrapedPrice: string | null = null;
    let scrapedPriceOld: string | null = null;
    let scrapeMethod = 'Unknown';

    try {
      // 1. Fetch the affiliate URL page (following redirects)
      const res = await fetch(affiliateUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (res.ok) {
        const html = await res.text();
        
        // --- 1A. Try parsing the __NORDIC_RENDERING_CTX__ context (storefronts & modern ML product pages) ---
        const nordicMatch = html.match(/<script id="__NORDIC_RENDERING_CTX__"[^>]*>([\s\S]*?)<\/script>/);
        if (nordicMatch) {
          const scriptContent = nordicMatch[1].trim();
          const jsonStart = scriptContent.indexOf('{');
          if (jsonStart !== -1) {
            const jsonText = extractFirstJSON(scriptContent, jsonStart);
            if (jsonText) {
              try {
                const parsed = JSON.parse(jsonText);
                const productsList: ScrapedProduct[] = [];
                collectPolycards(parsed, productsList);

                if (productsList.length > 0 && product) {
                  // Find the product card that matches the target product best
                  const bestMatch = findBestMatch(productsList, product);
                  if (bestMatch) {
                    scrapedPrice = `R$ ${bestMatch.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    if (bestMatch.oldPrice !== null) {
                      scrapedPriceOld = `R$ ${bestMatch.oldPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    }
                    scrapeMethod = 'Nordic Context Match';
                  }
                }
              } catch (jsonErr) {
                console.warn('Nordic Context JSON Parse Error:', jsonErr);
              }
            }
          }
        }

        // --- 1B. Fallback: Parse standard single-product itemprop/metadata tags ---
        if (!scrapedPrice) {
          const mlPriceMatch = html.match(/itemprop="price"\s+content="([^"]+)"/) || html.match(/"price":\s*(\d+(\.\d+)?)/);
          if (mlPriceMatch) {
            const rawPrice = parseFloat(mlPriceMatch[1]);
            if (!isNaN(rawPrice) && rawPrice > 0) {
              scrapedPrice = `R$ ${rawPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              scrapeMethod = 'Real-time Scraper (itemprop)';
            }
          }
        }
        
        // --- 1C. Fallback: Generic OpenGraph product price tags ---
        if (!scrapedPrice) {
          const ogPrice = html.match(/property="og:price:amount"\s+content="([^"]+)"/) || 
                          html.match(/property="product:price:amount"\s+content="([^"]+)"/) ||
                          html.match(/name="twitter:data1"\s+value="([^"]+)"/);
          if (ogPrice) {
            const cleanVal = ogPrice[1].replace(/[^\d.,]/g, '').replace(',', '.');
            const rawPrice = parseFloat(cleanVal);
            if (!isNaN(rawPrice) && rawPrice > 0) {
              scrapedPrice = `R$ ${rawPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              scrapeMethod = 'Real-time Scraper (OpenGraph)';
            }
          }
        }
      }
    } catch (scrapingErr) {
      console.warn('Scraping warning (blocked or redirect issue):', scrapingErr);
    }

    // 2. Fallback to Gemini 2 Flash if scraping was blocked or failed to extract a price
    if (!scrapedPrice && product) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Você é um monitor de preços do e-commerce brasileiro.
Com base no seu conhecimento de mercado atualizado para o ano atual, estime o preço de mercado atual realista (à vista em Reais R$) do produto "${product}".
Retorne APENAS um objeto JSON com o formato exato abaixo, sem blocos de código markdown ou explicações:
{ "price": "R$ X.XXX,XX", "old_price": "R$ X.XXX,XX" }`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        });

        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ 
            success: true, 
            price: data.price, 
            priceOld: data.old_price,
            method: 'Gemini AI Research' 
          });
        }
      }
    }

    if (scrapedPrice) {
      // Calculate a realistic priceOld as +15% if it was not scraped
      if (!scrapedPriceOld) {
        const clean = scrapedPrice.replace(/[^\d.,]/g, '');
        const noThousands = clean.replace(/\./g, '');
        const standardDecimal = noThousands.replace(',', '.');
        const numericVal = parseFloat(standardDecimal) || 0;
        const oldVal = numericVal > 0 ? numericVal * 1.15 : 0;
        scrapedPriceOld = oldVal > 0 ? `R$ ${oldVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : scrapedPrice;
      }

      return NextResponse.json({ 
        success: true, 
        price: scrapedPrice, 
        priceOld: scrapedPriceOld,
        method: scrapeMethod
      });
    }

    throw new Error('Não foi possível obter o preço. Preencha manualmente.');
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar' }, { status: 500 });
  }
}
