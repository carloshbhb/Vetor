import { NextResponse } from "next/server";
import { getProductWithPictures } from "@/lib/mercadolivre-api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RequestPayload = { itemIds?: unknown };
type ProductResponse = {
  itemId: string;
  title: string;
  productUrl: string;
  price: number | null;
  imageUrl: string | null;
};

function normalizeItemId(value: unknown): string | null {
  const normalized = String(value || "").trim().toUpperCase().replace(/-/g, "");
  return /^MLB\d{6,}$/.test(normalized) ? normalized : null;
}

function normalizeHttpsImage(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol)) return null;
    url.protocol = "https:";
    return url.toString().replace("-I.jpg", "-O.jpg");
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== "Bearer " + cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: RequestPayload;
  try {
    payload = await request.json() as RequestPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!Array.isArray(payload.itemIds) || payload.itemIds.length < 1 || payload.itemIds.length > 8) {
    return NextResponse.json({ error: "Informe de 1 a 8 itemIds do Mercado Livre." }, { status: 400 });
  }

  const itemIds = Array.from(new Set(payload.itemIds.map(normalizeItemId).filter((id): id is string => Boolean(id))));
  if (!itemIds.length || itemIds.length !== payload.itemIds.length) {
    return NextResponse.json({ error: "Todos os itemIds devem ter formato MLB válido." }, { status: 400 });
  }

  const results: ProductResponse[] = [];
  const errors: Array<{ itemId: string; error: string }> = [];

  for (const itemId of itemIds) {
    try {
      const product = await getProductWithPictures(itemId);
      const imageUrl =
        normalizeHttpsImage(product.thumbnail) ||
        normalizeHttpsImage(product.pictures?.find((picture) => picture.secure_url)?.secure_url) ||
        normalizeHttpsImage(product.pictures?.[0]?.url);
      const productUrl = String(product.permalink || ("https://produto.mercadolivre.com.br/" + itemId)).trim();
      const price = Number(product.price);

      results.push({
        itemId,
        title: String(product.title || "").trim(),
        productUrl,
        price: Number.isFinite(price) && price > 0 ? price : null,
        imageUrl,
      });
    } catch (error) {
      errors.push({
        itemId,
        error: error instanceof Error ? error.message.slice(0, 200) : "Falha ao consultar detalhes de produto.",
      });
    }
  }

  return NextResponse.json({ results, errors }, { status: 200 });
}
