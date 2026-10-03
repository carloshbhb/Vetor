import { NextResponse } from "next/server";
import { fetchReviewBySlug, fetchViralArticleBySlug } from "@/lib/data";
import { getProductLinkBySlug } from "@/lib/product-links";
import { getAffiliateLinkBySlug, recordAffiliateClick } from "@/lib/affiliate-links";

export const dynamic = "force-dynamic";

// Redirect 302 para links de afiliado (troca de destino em 1 lugar só).
// Slugs desconhecidos → 404 (nunca home). Sempre noindex.
// Destino precisa ser https:// (nunca javascript:, // ou relativo vindo do banco).
function safeTarget(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!/^https:\/\//i.test(url)) return null;
  return url;
}

function redirectTo(url: string) {
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1) central registry: /go/<slug>/
  // O destino pode ser trocado no painel sem editar o conteúdo editorial.
  const managed = await getAffiliateLinkBySlug(slug);
  if (managed) {
    const managedTarget = safeTarget(managed.destination_url);
    if (managed.status === "active" && managedTarget) {
      const referer = _request.headers.get("referer");
      await recordAffiliateClick(managed.id, referer ? (() => {
        try { return new URL(referer).pathname; } catch { return null; }
      })() : null);
      return redirectTo(managedTarget);
    }

    return new NextResponse("Link de afiliado indisponível", {
      status: 410,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  // 2) fallback para review legado: /go/<review-slug>/
  const review = await fetchReviewBySlug(slug);
  const reviewTarget = safeTarget(review?.affiliate_url);
  if (reviewTarget) return redirectTo(reviewTarget);

  // 3) fallback para product_link legado: /go/<product-link-slug>/
  const productLink = await getProductLinkBySlug(slug);
  const linkTarget = safeTarget(productLink?.affiliate_url);
  if (linkTarget) return redirectTo(linkTarget);

  // 4) produto de comparativo legado: /go/<article-slug>-p<N>/
  const productMatch = slug.match(/^(.+)-p(\d+)$/);
  if (productMatch) {
    const article = await fetchViralArticleBySlug(productMatch[1]);
    const product = article?.products?.[Number(productMatch[2]) - 1];
    const productTarget = safeTarget(product?.product_url);
    if (productTarget) return redirectTo(productTarget);
  }

  return new NextResponse("Link não encontrado", {
    status: 404,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
