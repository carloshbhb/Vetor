import ReviewContent from "@/components/ReviewContent";
import CookiePreferencesControl from "@/components/CookiePreferencesControl";
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

function normalizePrice(value: string | null | undefined): string {
  return value?.trim() || "Consulte o preço";
}

export default async function LandingPageTemplate({ review }: { review: Review }) {
  const linkedProduct = await getProductLinkByLandingPageSlug(review.slug);
  const imageUrl = linkedProduct?.image_url?.trim() || review.image_url?.trim() || "";
  const specs = normalizeSpecs(review.specs);
  const sections = normalizeSections(review.sections);
  const linkedPrice = linkedProduct?.price != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(linkedProduct.price)
    : "";
  const price = normalizePrice(linkedPrice || review.price_new);
  const purchaseUrl = [linkedProduct?.affiliate_url, review.affiliate_url]
    .find((value) => typeof value === "string" && value.trim())?.trim() || "";
  const scoreValue = Number(review.verdict_score ?? review.hero_overall_score);
  const score = Number.isFinite(scoreValue) && scoreValue >= 0 && scoreValue <= 10
    ? scoreValue.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "Não informada";
  const verdict = safeText(review.verdict_text, "Considere os recursos confirmados, as limitações e o preço atual antes de decidir.");
  const displayHighlights: Array<{ label: string; value: string }> = [];
  const chosenSpecs = specs.filter((spec) => spec.highlight).slice(0, 3);
  for (const spec of [...chosenSpecs, ...specs.filter((item) => !chosenSpecs.some((chosen) => chosen.label === item.label))]) {
    if (displayHighlights.length >= 3) break;
    displayHighlights.push({ label: spec.label, value: spec.value });
  }
  const fallbackHighlights = [
    { label: "Categoria", value: safeText(review.category, "Não informada") },
    { label: "Preço consultado", value: price },
    { label: "Avaliação editorial", value: score === "Não informada" ? score : score + "/10" },
  ];
  for (const item of fallbackHighlights) {
    if (displayHighlights.length >= 3) break;
    if (!displayHighlights.some((existing) => existing.label.toLowerCase() === item.label.toLowerCase())) displayHighlights.push(item);
  }

  const displaySections: ReviewSection[] = sections.length > 0 ? sections : [{
    id: "analise-geral",
    heading: "Análise detalhada",
    tocEmoji: "•",
    tocLabel: "Análise detalhada",
    content: "<p>Esta página ainda não possui uma análise detalhada validada. Confira a ficha técnica e confirme as informações com o fabricante ou vendedor antes de comprar.</p>",
  }];
  const groupCount = Math.min(3, displaySections.length);
  const groupSize = Math.ceil(displaySections.length / groupCount);
  const analysisCards = Array.from({ length: groupCount }, (_, index) =>
    displaySections.slice(index * groupSize, (index + 1) * groupSize)
  ).filter((group) => group.length > 0);

  const compareTable = review.compare_table;
  const compareColumns = Array.isArray(compareTable?.columns)
    ? compareTable.columns.filter((item) => typeof item === "string" && item.trim()).slice(0, 5)
    : [];
  const columns = compareColumns.length >= 3
    ? compareColumns
    : ["Critério", review.product, "Alternativa a comparar"];
  const sourceRows = Array.isArray(compareTable?.rows) ? compareTable.rows : [];
  const rows = sourceRows.length > 0 ? sourceRows : [
    { feature: "Preço consultado", values: [price, "Consulte a loja"], winner: -1 },
    { feature: "Recursos", values: ["Consulte a ficha técnica acima", "Confirme os dados do modelo alternativo"], winner: -1 },
    { feature: "Indicação", values: [verdict, "Compare com suas necessidades"], winner: -1 },
  ];
  const tableRows = rows.map((raw) => {
    if (Array.isArray(raw)) {
      const [feature, ...values] = raw;
      return { feature: String(feature ?? "Critério"), values: values.map((value) => String(value ?? "")), winner: -1 };
    }
    return {
      feature: String(raw.feature ?? "Critério"),
      values: Array.isArray(raw.values) ? raw.values.map((value) => String(value ?? "")) : [],
      winner: Number.isInteger(raw.winner) ? Number(raw.winner) : -1,
    };
  });

  return (
    <div className={styles.page} data-template="landing-page">
      <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>
      <header className={styles.siteHeader}>
        <div className={styles.container}>
          <div className={styles.nav}>
            <a href="/" className={styles.brand} aria-label="Vetor.blog, página inicial">Vetor<span>.</span>blog</a>
            <nav className={styles.navLinks} aria-label="Navegação principal">
              <a href="/reviews/">Reviews</a>
              <a href="/comparativos/">Comparativos</a>
              <a href="/melhores/">Melhores produtos</a>
              <a href="/guias/">Guias</a>
            </nav>
            <a className={styles.headerCta} href="#comparativo">Comparar opções</a>
          </div>
        </div>
      </header>

      <main id="conteudo" className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.container}>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              <a href="/">Início</a><span aria-hidden="true">›</span>
              <a href="/reviews/">Landing pages</a><span aria-hidden="true">›</span>
              <span aria-current="page">{review.product}</span>
            </nav>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}>Guia de compra Vetor.blog</span>
                <h1>{review.product}: análise completa, ficha técnica e comparativo</h1>
                <p className={styles.heroLead}>{safeText(review.hero_lead, "Veja os destaques, confira a ficha técnica e compare as informações importantes antes de escolher.")}</p>
                <div className={styles.meta}>
                  <span>Atualizado em {review.updated_at ? new Date(review.updated_at).toLocaleDateString("pt-BR") : "data não informada"}</span>
                  <span aria-hidden="true">•</span>
                  <span>Leitura: {Number.isFinite(Number(review.meta_reading_time)) && Number(review.meta_reading_time) > 0 ? Math.round(Number(review.meta_reading_time)) : 8} min</span>
                </div>
                <p className={styles.disclosure}><strong>Transparência:</strong> esta página pode conter links de afiliado. Uma compra por esses links pode gerar comissão para o Vetor.blog, sem custo adicional para você.</p>
                {purchaseUrl && <a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Consultar oferta na loja ↗</a>}
              </div>
              <aside className={styles.heroProduct} aria-label="Produto em destaque">
                {imageUrl && <img className={styles.productImage} src={imageUrl} alt={review.product} loading="eager" fetchPriority="high" />}
                <div className={styles.heroProductInfo}>
                  <span className={styles.productLabel}>Avaliação Vetor.blog</span>
                  <strong className={styles.score}>{score === "Não informada" ? score : score + "/10"}</strong>
                  <span className={styles.priceLabel}>Preço consultado</span>
                  <strong className={styles.price}>{price}</strong>
                  {purchaseUrl && <a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Ver preço e disponibilidade</a>}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section id="destaques" className={styles.section}>
          <div className={styles.container}>
            <h2 className={`${styles.sectionTitle} section-title`}>Destaques Principais</h2>
            <div className={styles.highlightGrid}>
              {displayHighlights.map((item, index) => (
                <article className={styles.highlightCard} key={item.label + index}>
                  <span className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.label}</h3>
                  <p>{item.value}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="ficha-tecnica" className={styles.section}>
          <div className={styles.container}>
            <h2 className={`${styles.sectionTitle} section-title`}>Ficha Técnica Completa</h2>
            {specs.length > 0 ? (
              <div className={styles.tableWrap} role="region" aria-label="Ficha técnica completa" tabIndex={0}>
                <table>
                  <thead><tr><th scope="col">Especificação</th><th scope="col">Detalhes</th></tr></thead>
                  <tbody>{specs.map((spec, index) => <tr key={spec.label + index}><th scope="row">{spec.label}</th><td>{spec.value}</td></tr>)}</tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyState}>A ficha técnica completa ainda não foi cadastrada. Confirme os dados diretamente com o fabricante ou vendedor.</p>
            )}
          </div>
        </section>

        <section id="analise-detalhada" className={styles.section}>
          <div className={styles.container}>
            <h2 className={`${styles.sectionTitle} section-title`}>Análise Detalhada</h2>
            <div className={styles.analysisGrid}>
              {analysisCards.map((group, index) => (
                <article className={styles.analysisCard} key={group[0]?.id || index}>
                  <ReviewContent sections={group} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="comparativo" className={styles.section}>
          <div className={styles.container}>
            <h2 className={`${styles.sectionTitle} section-title`}>Comparativo com Concorrentes</h2>
            <div className={styles.tableWrap} role="region" aria-label="Tabela comparativa com concorrentes" tabIndex={0}>
              <table className={styles.comparisonTable}>
                <thead><tr>{columns.map((column, index) => <th scope="col" key={column + index}>{column}</th>)}</tr></thead>
                <tbody>
                  {tableRows.map((row, rowIndex) => (
                    <tr key={row.feature + rowIndex}>
                      <th scope="row">{row.feature}</th>
                      {columns.slice(1).map((_, valueIndex) => (
                        <td className={row.winner === valueIndex ? styles.winner : undefined} key={valueIndex}>
                          {row.values[valueIndex] || "Não informado"}
                          {row.winner === valueIndex ? " ✓" : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.comparisonNote}>Confirme especificações, preço final, garantia e disponibilidade de cada modelo antes de comprar.</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <a href="/" className={styles.brand} aria-label="Vetor.blog, página inicial">Vetor<span>.</span>blog</a>
              <p>Análises, fichas técnicas e comparativos para ajudar você a tomar uma decisão de compra informada.</p>
              <p className={styles.footerDisclosure}>Conteúdo editorial independente. Alguns links podem gerar comissão, sem custo adicional para o comprador.</p>
            </div>
            <nav className={styles.footerLinks} aria-label="Links do rodapé">
              <a href="/sobre/">Sobre</a>
              <a href="/contato/">Contato</a>
              <a href="/como-avaliamos/">Como avaliamos</a>
              <a href="/politica-editorial/">Política editorial</a>
              <a href="/afiliados/">Afiliados</a>
              <a href="/privacidade/">Privacidade</a>
              <CookiePreferencesControl />
              <a href="/termos/">Termos</a>
            </nav>
          </div>
        </div>
      </footer>
      {purchaseUrl && <div className={styles.mobileCta}><a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Consultar oferta na loja ↗</a></div>}
    </div>
  );
}
