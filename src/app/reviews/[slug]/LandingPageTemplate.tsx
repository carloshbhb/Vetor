import ReviewContent from "@/components/ReviewContent";
import { getProductLinkByLandingPageSlug } from "@/lib/product-links";
import type { Review, ReviewSection, ReviewSpec } from "@/lib/types";
import styles from "./LandingPageTemplate.module.css";

function normalizeSections(value: Review["sections"]): ReviewSection[] {
  if (!Array.isArray(value)) return [];
  return value.filter((section) =>
    Boolean(section) && typeof section.heading === "string" && typeof section.content === "string"
  );
}

function normalizeSpecs(value: Review["specs"]): ReviewSpec[] {
  if (!Array.isArray(value)) return [];
  return value.filter((spec) =>
    Boolean(spec) && typeof spec.label === "string" && typeof spec.value === "string" && spec.label.trim() && spec.value.trim()
  );
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePrice(value: string): string {
  return value?.trim() || "Consulte o preço";
}

export default async function LandingPageTemplate({ review }: { review: Review }) {
  const linkedProduct = await getProductLinkByLandingPageSlug(review.slug);
  const specs = normalizeSpecs(review.specs);
  const sections = normalizeSections(review.sections);
  const highlights = specs.filter((spec) => spec.highlight).slice(0, 3);
  const cards = (highlights.length >= 3
    ? highlights
    : [...highlights, ...specs.filter((item) => !highlights.some((chosen) => chosen.label === item.label))]
  ).slice(0, 3);
  const compareTable = review.compare_table;
  const compareColumns = Array.isArray(compareTable?.columns)
    ? compareTable.columns.filter((item) => typeof item === "string" && item.trim())
    : [];
  const compareRows = Array.isArray(compareTable?.rows) ? compareTable.rows : [];
  const pros = Array.isArray(review.pros) ? review.pros.filter((item) => typeof item === "string" && item.trim()).slice(0, 6) : [];
  const cons = Array.isArray(review.cons) ? review.cons.filter((item) => typeof item === "string" && item.trim()).slice(0, 6) : [];
  const faq = Array.isArray(review.faq) ? review.faq.filter((item) => item?.question && item?.answer) : [];
  const linkedPrice = linkedProduct?.price != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(linkedProduct.price)
    : "";
  const price = normalizePrice(linkedPrice || review.price_new);
  const purchaseUrl = [linkedProduct?.affiliate_url, review.affiliate_url]
    .find((value) => typeof value === "string" && value.trim())?.trim() || "";
  const scoreValue = Number(review.verdict_score ?? review.hero_overall_score);
  const score = Number.isFinite(scoreValue) && scoreValue >= 0 && scoreValue <= 10
    ? scoreValue.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "—";
  const verdict = safeText(review.verdict_text, "Compare os recursos, as limitações e o preço atual com suas necessidades antes de decidir.");
  const bestFor = pros[0] || "Quem considera os recursos e o preço apresentados";
  const caution = cons[0] || "Confirme os detalhes e as condições atuais no anúncio";
  const displayCards = cards.length > 0 ? cards : [
    { label: "Categoria", value: safeText(review.category, "Não informada") },
    { label: "Preço consultado", value: price },
    { label: "Avaliação", value: score === "—" ? "Sem nota informada" : score + "/10" },
  ];
  const displayCompareColumns = compareColumns.length >= 3
    ? compareColumns.slice(0, 4)
    : ["Critério", review.product, "Alternativa a avaliar"];
  const comparisonValue = (pattern: RegExp, productIndex: number, fallback: string): string => {
    const row = compareRows.find((item) => pattern.test(String(item.feature || "")));
    const value = row?.values?.[productIndex];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };
  const displayComparisonProducts = displayCompareColumns.slice(1, 4).map((name, productIndex) => ({
    name,
    isCurrent: productIndex === 0,
    indication: comparisonValue(/indica|público|perfil|para quem/i, productIndex, "Não informado"),
    highlight: comparisonValue(/destaque|benefício|vantagem|recurso principal/i, productIndex, "Consulte as especificações confirmadas"),
    limitation: comparisonValue(/limita|atenção|desvantagem|ponto negativo|contra/i, productIndex, "Não informado"),
    price: comparisonValue(/preço|valor/i, productIndex, productIndex === 0 ? price : "Consulte a loja"),
  }));
  const displaySections = sections.length > 0 ? sections : [{
    id: "analise-geral",
    heading: "Análise do produto",
    tocEmoji: "•",
    tocLabel: "Análise do produto",
    content: "<p>Esta página ainda não possui uma análise detalhada validada. Consulte a ficha técnica e confirme as informações diretamente com o fabricante ou vendedor antes de comprar.</p>",
  } as ReviewSection];
  const displayPros = pros.length > 0 ? pros : ["Ficha técnica organizada para facilitar a comparação", "Preço e disponibilidade podem ser conferidos na loja"];
  const displayCons = cons.length > 0 ? cons : ["Alguns dados podem exigir confirmação no anúncio", "Compare as condições atuais antes de comprar"];
  const displayFaq = faq.length > 0 ? faq : [
    { question: "O que devo conferir antes de comprar?", answer: "Confirme o modelo exato, a ficha técnica, a garantia, o preço final, o frete e as condições informadas pelo vendedor." },
    { question: "O preço exibido é definitivo?", answer: "Não. Preços, estoque e condições comerciais podem mudar. Confira o valor final na página da loja antes de concluir a compra." },
    { question: "Como comparar este produto com alternativas?", answer: "Compare características equivalentes, limitações, compatibilidade, garantia e preço total usando dados confirmados para cada modelo." },
  ];

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>
      <header className={styles.siteHeader}>
        <div className={styles.container}>
          <div className={styles.nav}>
            <a href="/" className={styles.brand} aria-label="Vetor.blog, página inicial">Vetor<span>.</span>blog</a>
            <nav className={styles.navLinks} aria-label="Navegação principal">
              <a href="/reviews/">Reviews</a>
              <a href="/comparativos/">Comparativos</a>
              <a href="/guias/">Guias</a>
              <a href="/ofertas/">Ofertas</a>
            </nav>
            <a className={styles.headerCta} href="#veredito">Ver análise</a>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className={styles.hero}>
          <div className={styles.container}>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              <a href="/">Início</a><span aria-hidden="true">›</span>
              <a href="/reviews/">Reviews</a><span aria-hidden="true">›</span>
              <span aria-current="page">{review.product}</span>
            </nav>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}>Análise Vetor</span>
                <h1>{review.product} vale a pena? Review completo, preço e alternativas</h1>
                <p className={styles.heroLead}>{safeText(review.hero_lead, "Confira os principais recursos, pontos de atenção, preço e alternativas para decidir se este produto faz sentido para você.")}</p>
                <div className={styles.meta}>
                  <span>Atualizado em {review.updated_at ? new Date(review.updated_at).toLocaleDateString("pt-BR") : "data não informada"}</span>
                  <span aria-hidden="true">•</span>
                  <span>Equipe Vetor.blog</span>
                </div>
                <div className={styles.disclosure}>
                  <strong>Transparência:</strong> esta página pode conter links de afiliado. Se você comprar por um desses links, o Vetor.blog pode receber uma comissão, sem custo adicional para você. Isso não altera a análise editorial.
                </div>
              </div>
              <aside className={styles.verdict} id="veredito" aria-label="Resumo da avaliação">
                <span className={styles.verdictLabel}>Veredito rápido</span>
                <div className={styles.score}><strong>{score}</strong><span>/ 10</span></div>
                <div className={styles.stars} aria-label={score === "—" ? "Nota não informada" : "Nota editorial: " + score + " de 10"}>★★★★★</div>
                <h2>{safeText(review.verdict_label, "Resumo da avaliação")}</h2>
                <p>{verdict}</p>
                <div className={styles.priceLine}><span>Preço consultado</span><strong>{price}</strong></div>
                {purchaseUrl ? (
                  <a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Ver preço na loja ↗</a>
                ) : (
                  <span className={styles.ctaDisabled}>Oferta ainda não configurada</span>
                )}
                <div className={styles.micro}>Preço e disponibilidade podem mudar.</div>
              </aside>
            </div>
          </div>
        </section>

        <div className={styles.container}>
          <div className={styles.adSlot} aria-label="Publicidade">
            <div><small>Publicidade</small><strong>Espaço para anúncio responsivo</strong></div>
          </div>
        </div>

        <section className={styles.contentWrap}>
          <div className={styles.container}>
            <div className={styles.layout}>
              <article className={styles.article}>
                <nav className={styles.toc} aria-label="Índice da landing page">
                  <strong>Nesta página</strong>
                  <ol>
                    <li><a href="#resumo">Resumo da análise</a></li>
                    <li><a href="#criterios">O que analisamos</a></li>
                    <li><a href="#desempenho">Experiência e desempenho</a></li>
                    <li><a href="#preco">Preço e custo-benefício</a></li>
                    <li><a href="#comparativo">Comparativo com alternativas</a></li>
                    <li><a href="#publico">Para quem vale a pena</a></li>
                    <li><a href="#faq">Perguntas frequentes</a></li>
                  </ol>
                </nav>

                <section id="resumo">
                  <h2>{review.product} é bom? Resumo da análise</h2>
                  <p><strong>{review.product}</strong> — {verdict}</p>
                  <div className={styles.quickSummary}>
                    <div className={styles.pros}>
                      <h3>✓ Pontos positivos</h3>
                      <ul>{displayPros.slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                    <div className={styles.cons}>
                      <h3>✕ Pontos de atenção</h3>
                      <ul>{displayCons.slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>
                  </div>
                  <div className={styles.factGrid}>
                    <div className={styles.fact}><span>Melhor para</span><strong>{bestFor}</strong></div>
                    <div className={styles.fact}><span>Destaque</span><strong>{displayCards[0]?.value || "Consulte a ficha técnica"}</strong></div>
                    <div className={styles.fact}><span>Ponto de atenção</span><strong>{caution}</strong></div>
                  </div>
                </section>

                <section id="criterios">
                  <h2>O que analisamos neste review</h2>
                  <p>Para chegar à avaliação, consideramos os pontos que mais influenciam a decisão de compra nesta categoria:</p>
                  <ul>
                    <li><strong>Qualidade e recursos:</strong> o que o produto realmente oferece, com base nos dados disponíveis.</li>
                    <li><strong>Facilidade de uso:</strong> configuração, compatibilidade e experiência esperada no uso diário.</li>
                    <li><strong>Desempenho:</strong> recursos e limitações relevantes para a finalidade do produto.</li>
                    <li><strong>Preço:</strong> valor consultado em relação aos recursos e às alternativas.</li>
                    <li><strong>Concorrência:</strong> comparação com alternativas relevantes da mesma categoria.</li>
                    <li><strong>Pós-compra:</strong> garantia, suporte e condições informadas pelo fabricante ou vendedor.</li>
                  </ul>
                  <div className={styles.callout}>
                    <strong>Como interpretar esta análise</strong>
                    <p>Não tratamos características ausentes como recursos confirmados. Confirme modelo, garantia, compatibilidade e condições da oferta antes de comprar.</p>
                  </div>
                </section>

                <section id="desempenho">
                  <h2>Experiência de uso: onde {review.product} se destaca</h2>
                  <div className={styles.analysis}><ReviewContent sections={displaySections} /></div>
                </section>

                <div className={styles.adSlot} aria-label="Publicidade dentro do conteúdo">
                  <div><small>Publicidade</small><strong>Espaço para anúncio responsivo dentro do conteúdo</strong></div>
                </div>

                <section id="preco">
                  <h2>{review.product} vale o preço?</h2>
                  <p>O valor exibido é uma referência da consulta e pode mudar conforme loja, vendedor, frete, estoque e promoções.</p>
                  <p>{verdict}</p>
                  {purchaseUrl ? <a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Conferir preço atualizado ↗</a> : <p>Consulte as lojas disponíveis para confirmar preço e condições antes de comprar.</p>}
                </section>

                <section id="comparativo">
                  <h2>{review.product} vs. alternativas: qual a diferença?</h2>
                  <p>{safeText(compareTable?.caption, "Compare características equivalentes e use somente dados confirmados para cada modelo.")}</p>
                  <div className={styles.compareWrap} role="region" aria-label="Comparativo com alternativas" tabIndex={0}>
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Modelo</th>
                          <th scope="col">Indicação</th>
                          <th scope="col">Destaque</th>
                          <th scope="col">Limitação</th>
                          <th scope="col">Preço</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayComparisonProducts.map((item, index) => (
                          <tr key={item.name + index}>
                            <td><strong>{item.name}</strong>{item.isCurrent && <><br /><span className={styles.tag}>Analisado</span></>}</td>
                            <td>{item.indication}</td>
                            <td>{item.highlight}</td>
                            <td>{item.limitation}</td>
                            <td>{item.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section id="publico">
                  <h2>Para quem {review.product} vale a pena?</h2>
                  <div className={styles.whoGrid}>
                    <div className={styles.whoCard}><h3>Vale considerar se você...</h3><ul>{displayPros.slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                    <div className={styles.whoCard}><h3>Talvez não seja ideal se você...</h3><ul>{displayCons.slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                  </div>
                </section>

                <section className={styles.finalVerdict}>
                  <h2>Conclusão: {review.product} vale a pena?</h2>
                  <p><strong>{safeText(review.verdict_label, "Resumo")}: </strong>{verdict}</p>
                  <p>Compare os dados confirmados, o preço final e as condições da loja antes de tomar a decisão.</p>
                  {purchaseUrl && <a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Ver oferta disponível ↗</a>}
                </section>

                <section id="faq">
                  <h2>Perguntas frequentes sobre {review.product}</h2>
                  <div className={styles.faq}>{displayFaq.map((item, index) => <details key={index}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
                </section>

                <section id="leia-tambem">
                  <h2>Leia também</h2>
                  <div className={styles.related}>
                    <a href="/comparativos/">
                      <small>Comparativos</small>
                      <strong>Compare {review.product} com alternativas relevantes</strong>
                    </a>
                    <a href="/guias/">
                      <small>Guia de compra</small>
                      <strong>Veja guias para escolher produtos da categoria</strong>
                    </a>
                    <a href="/reviews/">
                      <small>Reviews</small>
                      <strong>Confira outras análises do Vetor.blog</strong>
                    </a>
                  </div>
                </section>
              </article>

              <aside className={styles.sidebar} aria-label="Conteúdo complementar">
                <div className={styles.sideCard}>
                  <h3>Sobre esta análise</h3>
                  <p>O Vetor.blog publica reviews e comparativos com foco em clareza, utilidade e decisão de compra.</p>
                  <div className={styles.sideLinks}>
                    <a href="/como-avaliamos/">Como avaliamos</a>
                    <a href="/politica-editorial/">Política editorial</a>
                    <a href="/afiliados/">Política de afiliados</a>
                  </div>
                </div>
                <div className={styles.adSlot} aria-label="Publicidade lateral" style={{ minHeight: 280, margin: 0 }}>
                  <div><small>Publicidade</small><strong>Espaço para anúncio lateral responsivo</strong></div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      {purchaseUrl && <div className={styles.mobileCta}><a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Conferir preço atualizado ↗</a></div>}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div><a href="/" className={styles.brand}>Vetor<span>.</span>blog</a><p>Informação clara para uma compra consciente. Esta página pode conter links de afiliado; a comissão não altera a análise editorial.</p></div>
            <nav className={styles.footerLinks} aria-label="Links do rodapé"><a href="/sobre/">Sobre</a><a href="/contato/">Contato</a><a href="/privacidade/">Privacidade</a><a href="/termos/">Termos</a></nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
