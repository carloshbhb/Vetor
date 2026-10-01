import { NextResponse } from "next/server";
import { fetchReviewBySlug, fetchViralArticleBySlug } from "@/lib/data";
import { getProductLinkBySlug } from "@/lib/product-links";

export const dynamic = "force-dynamic";

// Redirect 302 para links de afiliado (troca de destino em 1 lugar só).
// Slugs desconhecidos → 404 (nunca home). Sempre noindex.
function redirectTo(url: string) {
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1) review: /go/<review-slug>/
  const review = await fetchReviewBySlug(slug);
  if (review?.affiliate_url) return redirectTo(review.affiliate_url);

  // 2) product_link: /go/<product-link-slug>/
  const productLink = await getProductLinkBySlug(slug);
  if (productLink?.affiliate_url) return redirectTo(productLink.affiliate_url);

  // 3) produto de comparativo: /go/<article-slug>-p<N>/
  const productMatch = slug.match(/^(.+)-p(\d+)$/);
  if (productMatch) {
    const article = await fetchViralArticleBySlug(productMatch[1]);
    const product = article?.products?.[Number(productMatch[2]) - 1];
    if (product?.product_url) return redirectTo(product.product_url);
  }

  return new NextResponse("Link não encontrado", {
    status: 404,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
