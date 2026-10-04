import { NextResponse } from "next/server";
import { getCategory, getProductWithPictures } from "@/lib/mercadolivre-api";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const productUrl = typeof body.product_url === "string" ? body.product_url.trim() : "";
    let parsed: URL;
    try {
      parsed = new URL(productUrl);
    } catch {
      return NextResponse.json({ error: "Cole uma URL válida de produto do Mercado Livre." }, { status: 400 });
    }

    const host = parsed.hostname.toLowerCase();
    const isMercadoLivreHost = ["mercadolivre.com.br", "mercadolibre.com", "meli.la"].some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    if (parsed.protocol !== "https:" || !isMercadoLivreHost) {
      return NextResponse.json({ error: "A busca aceita somente URLs HTTPS do Mercado Livre." }, { status: 400 });
    }

    const itemId = productUrl.match(/MLB-?(\d+)/i)?.[1];
    if (!itemId) {
      return NextResponse.json({ error: "Não encontrei o código MLB. Cole a página do produto, não um link encurtado." }, { status: 400 });
    }

    const product = await getProductWithPictures(`MLB${itemId}`);
    let category = product.category_id || "";
    if (product.category_id) {
      try {
        category = (await getCategory(product.category_id)).name || category;
      } catch {
        // O ID da categoria continua disponível se a consulta complementar falhar.
      }
    }

    return NextResponse.json({
      data: {
        id: product.id,
        name: product.title,
        category,
        product_url: product.permalink,
        image_url: product.pictures?.[0]?.secure_url || product.thumbnail?.replace(/^http:/, "https:"),
        price: product.price,
      },
    });
  } catch (error) {
    console.error("[Affiliate center] Mercado Livre lookup failed:", error);
    return NextResponse.json({ error: "Não foi possível consultar o produto. Confira a autorização da API do Mercado Livre." }, { status: 502 });
  }
}
