import Image from "next/image";
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

function normalizePrice(value: string): string {
  if (!value) return "Consulte o preço";
  return value;
}

export default async function LandingPageTemplate({ review }: { review: Review }) {
  const linkedProduct = await getProductLinkByLandingPageSlug(review.slug);
  const specs = normalizeSpecs(review.specs);
  const sections = normalizeSections(review.sections);
  const highlights = specs.filter((spec) => spec.highlight).slice(0, 3);
  const cards = highlights.length >= 3
    ? highlights
    : [
        ...highlights,
        ...specs.filter((spec) => !highlights.some((item) => item.label === spec.label)),
      ].slice(0, 3);
  const compareTable = review.compare_table;
  const compareColumns = Array.isArray(compareTable?.columns) ? compareTable.columns.filter((item) => typeof item === "string") : [];
  const compareRows = Array.isArray(compareTable?.rows) ? compareTable.rows : [];
  const pros = Array.isArray(review.pros) ? review.pros.filter(Boolean).slice(0, 6) : [];
  const cons = Array.isArray(review.cons) ? review.cons.filter(Boolean).slice(0, 6) : [];
  const faq = Array.isArray(review.faq) ? review.faq.filter((item) => item?.question && item?.answer) : [];
  const linkedPrice = linkedProduct?.price != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(linkedProduct.price)
    : "";
  const price = normalizePrice(linkedPrice || review.price_new);
  const purchaseUrl = [linkedProduct?.affiliate_url, review.affiliate_url]
    .find((value) => typeof value === "string" && value.trim())?.trim() || "";
  const imageUrl = linkedProduct?.image_url?.trim() || review.image_url?.trim() || "";

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.brand}>Vetor.blog</a>
          <span className={styles.headerLabel}>Landing page de produto</span>
        </div>
      </header>

      <main className={styles.container}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <a href="/">Início</a><span aria-hidden="true">/</span>
          <a href="/reviews/">Reviews</a><span aria-hidden="true">/</span>
          <span aria-current="page">{review.product}</span>
        </nav>

        <section className={styles.hero} aria-labelledby="lp-title">
          <div className={styles.heroCopy}>
            <span className={styles.badge}>{review.category || "Análise de produto"}</span>
            <h1 id="lp-title">{review.product}: ficha técnica, recursos e avaliação</h1>
            <p className={styles.heroLead}>{review.hero_lead || "Consulte as especificações disponíveis, compare alternativas e confira os pontos importantes antes da compra."}</p>
            <div className={styles.priceBlock}>
              <div>
                <span className={styles.priceCaption}>Preço consultado</span>
                <strong className={styles.price}>{price}</strong>
              </div>
              {purchaseUrl ? (
                <a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">
                  Conferir oferta <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span className={styles.ctaDisabled}>Oferta ainda não configurada</span>
              )}
            </div>
            <p className={styles.priceNote}>O preço e a disponibilidade podem variar de acordo com a loja, o vendedor e o momento da consulta.</p>
          </div>
          <div className={styles.heroMedia}>
            {imageUrl ? (
              <Image src={imageUrl} alt={review.product} width={620} height={480} priority unoptimized className={styles.productImage} />
            ) : (
              <div className={styles.imagePlaceholder} role="img" aria-label={`Imagem de ${review.product} indisponível`}>Imagem indisponível</div>
            )}
          </div>
        </section>

        {cards.length > 0 && (
          <section className={styles.section} aria-labelledby="lp-highlights">
            <h2 id="lp-highlights" className={styles.sectionTitle}>Destaques principais</h2>
            <div className={styles.highlightGrid}>
              {cards.map((spec) => (
                <article key={spec.label} className={styles.highlightCard}>
                  <h3>{spec.label}</h3>
                  <p>{spec.value}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {specs.length > 0 && (
          <section className={styles.section} aria-labelledby="lp-specs">
            <h2 id="lp-specs" className={styles.sectionTitle}>Ficha técnica completa</h2>
            <div className={styles.tableWrap} role="region" aria-label="Ficha técnica" tabIndex={0}>
              <table className={styles.table}>
                <thead><tr><th scope="col">Especificação</th><th scope="col">{review.product}</th></tr></thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.label}><th scope="row">{spec.label}</th><td>{spec.value}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {sections.length > 0 && (
          <section className={styles.section} aria-labelledby="lp-analysis">
            <h2 id="lp-analysis" className={styles.sectionTitle}>Análise detalhada</h2>
            <div className={styles.analysis}><ReviewContent sections={sections} /></div>
          </section>
        )}

        {(pros.length > 0 || cons.length > 0) && (
          <section className={styles.section} aria-labelledby="lp-pros-cons">
            <h2 id="lp-pros-cons" className={styles.sectionTitle}>Pontos fortes e limitações</h2>
            <div className={styles.prosConsGrid}>
              {pros.length > 0 && <article className={styles.proCard}>
                <h3>Pontos fortes</h3>
                <ul>{pros.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </article>}
              {cons.length > 0 && <article className={styles.consCard}>
                <h3>Pontos de atenção</h3>
                <ul>{cons.map((item, index) => <li key={index}>{item}</li>)}</ul>
              </article>}
            </div>
          </section>
        )}

        {compareColumns.length >= 3 && compareRows.length > 0 && (
          <section className={styles.section} aria-labelledby="lp-compare">
            <h2 id="lp-compare" className={styles.sectionTitle}>Comparativo com alternativas</h2>
            <p className={styles.sectionIntro}>{compareTable?.caption || "Compare as características disponíveis antes de escolher."}</p>
            <div className={styles.tableWrap} role="region" aria-label="Comparativo de produtos" tabIndex={0}>
              <table className={styles.table}>
                <thead><tr>{compareColumns.map((column, index) => <th scope="col" key={index}>{column}</th>)}</tr></thead>
                <tbody>
                  {compareRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <th scope="row">{row.feature}</th>
                      {(Array.isArray(row.values) ? row.values : []).slice(0, compareColumns.length - 1).map((value, index) => (
                        <td key={index} className={row.winner === index ? styles.winner : undefined}>{value}{row.winner === index ? " ✓" : ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {faq.length > 0 && (
          <section className={styles.section} aria-labelledby="lp-faq">
            <h2 id="lp-faq" className={styles.sectionTitle}>Perguntas frequentes</h2>
            <div className={styles.faqList}>
              {faq.map((item, index) => <details key={index} className={styles.faqItem}>
                <summary>{item.question}</summary><p>{item.answer}</p>
              </details>)}
            </div>
          </section>
        )}

        <section className={styles.finalCta} aria-labelledby="lp-final-cta">
          <h2 id="lp-final-cta">Vale a pena comprar o {review.product}?</h2>
          <p>{review.verdict_text || "Compare a ficha técnica, as limitações e o preço atualizado com o que você precisa."}</p>
          {purchaseUrl && <a className={styles.cta} href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener">Ver oferta disponível ↗</a>}
        </section>

        <aside className={styles.disclosure} aria-label="Aviso de afiliados">
          O Vetor.blog pode receber comissão por compras feitas por links de afiliados, sem custo adicional para você. Isso não altera a análise editorial.
        </aside>
      </main>

      <footer className={styles.footer}>© {new Date().getFullYear()} Vetor.blog · Informação clara para uma compra consciente.</footer>
    </div>
  );
}
