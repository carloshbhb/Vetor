import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getProductLinkById, markProductLinkReviewed } from "@/lib/product-links";
import { createReview } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const cookieStore = req.cookies;
  const request = new Request("https://www.vetor.blog/admin/product-links-pending/", {
    headers: { cookie: cookieStore.toString() },
  });

  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { productId, productName } = body;

    if (!productId || !productName) {
      return NextResponse.json({ error: "productId e productName são obrigatórios" }, { status: 400 });
    }

    const link = await getProductLinkById(productId);
    if (!link) {
      return NextResponse.json({ error: "Product link não encontrado" }, { status: 404 });
    }

    // Gerar landing page com o super prompt do usuário
    const slug = (productName.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60) || 'landing-page');

    const landingPage = {
      slug,
      status: "draft",
      product: productName,
      category: link.category || "Geral",
      price_new: link.price ? `R$${link.price.toFixed(2)}` : "Consulte o preço",
      meta_title: `${productName} — Vale a Pena? Análise Completa 2026`,
      meta_description: `Descubra se ${productName} vale a compra. Análise de mercado, diferenciais, cards de concorrentes e guia de compra completo no Vetor Blog.`,
      content: `
<h2>O que é ${productName} e para quem ele é indicado?</h2><p>Este artigo analisa ${productName} de forma completa.</p>

<h2>Principais Dores Resolvidas</h2><p>Identificamos as 3 maiores frustrações que levam à busca deste produto.</p>

<h2>Por que o ${productName} Se Destaca</h2><p>Com base na SERP, identificamos lacunas de conteúdo que cobrimos aqui.</p>

<h2>Comparativo — ${productName} vs Concorrentes</h2><p>Cards comparativos com prós, contras e links de afiliado.</p>

<h2>FAQ — Perguntas Frequentes</h2><p>7 perguntas profundas respondidas em formato accordion.</p>
      `.trim(),
      hero_overall_score: 0,
      verdict_score: 0,
      verdict_label: "Análise em andamento",
      verdict_text: "Revisão completa do produto e alternativas de mercado.",
      verdict_note: "Landing page gerada automaticamente pelo pipeline.",
      pros: ["Análise completa de mercado", "Cards comparativos de concorrentes", "SEO otimizado para SERP"],
      cons: ["Requer verificação manual do link de afiliado", "Conteúdo ainda em rascunho"],
      hero_lead: `Análise completa de ${productName} — vale a pena comprar em 2026?`,
      hero_headline_line1: "Análise Completa do",
      hero_headline_line2: productName,
      hero_headline_em: "Vale a Pena?",
      affiliate_url: link.affiliate_url || "",
      image_url: link.image_url || "",
      marketplace: link.marketplace || "mercadolivre",
      faq: [
        { question: "O ${productName} é bom?", answer: "Depende do perfil de uso; consulte a análise completa." },
        { question: "Qual a melhor alternativa?", answer: "Veja os cards comparativos no artigo." },
      ],
      hero_bars: [{ pct: 80, label: "Nota Técnica", value: 8 }],
      specs: [{ label: "Categoria", value: link.category || "Geral", highlight: true }],
      sections: [{ id: "analise", heading: "Análise do Produto", tocEmoji: "📊", tocLabel: "Análise", content: `<h2>Análise de Mercado</h2>` }],
      compare_table: { columns: ["Produto", "Nota", "Ideal para"], rows: [[productName, "Em análise", "Ver análise"]], caption: "Comparativo de alternativas", winnerCol: 1 },
    };

    const result = await createReview(landingPage, { insertOnly: true });

    if (result.error) {
      return NextResponse.json({ error: "Falha ao salvar review: " + result.error }, { status: 500 });
    }

    // Atualizar o product_link: marcar como review criado (mesmo que ainda em draft)
    await markProductLinkReviewed(link.id, landingPage.slug);

    return NextResponse.json({
      success: true,
      slug: landingPage.slug,
      message: `Landing page para "${productName}" gerada como rascunho. Link de afiliado atual: ${link.affiliate_url || "Ausente — adicionar manualmente antes de publicar"}`
    });
  } catch (error) {
    console.error("Error in generate-landing:", error);
    return NextResponse.json({ error: "Erro interno ao gerar landing page" }, { status: 500 });
  }
}