import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { authors } from "@/data/authors";

export const metadata: Metadata = {
  title: "Quem Escreve — Autores e Redação do vetor.blog",
  description:
    "Conheça a equipe editorial do vetor.blog: quem testa, analisa e escreve os reviews independentes.",
  alternates: { canonical: "/author" },
  openGraph: {
    title: "Quem escreve — vetor.blog",
    description:
      "Conheça a equipe editorial do vetor.blog: quem testa, analisa e escreve os reviews independentes.",
    url: "https://www.vetor.blog/author",
    type: "website",
  },
};

export default function AuthorIndexPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Quem escreve" }]} />
            <span className="sec-label">Equipe editorial</span>
            <h1 className="sec-h">QUEM ESCREVE</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Por trás de cada review existe uma redação com critérios claros, notas de 0 a 10 e zero
              influência de patrocínio na pontuação.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {authors.map((author) => {
                const initials = author.name
                  .split(" ")
                  .map((word) => word[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <Link
                    key={author.slug}
                    href={`/author/${author.slug}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      background: "var(--surface)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 16,
                      padding: 28,
                      textDecoration: "none",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div
                        aria-hidden="true"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: "50%",
                          background: "var(--bg)",
                          border: "1.5px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          color: "var(--blue)",
                          fontFamily: "'Syne',sans-serif",
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div>
                        <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--ink)", marginBottom: 4 }}>
                          {author.name}
                        </h2>
                        <p style={{ fontSize: "0.75rem", color: "var(--blue)", fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                          {author.role}
                        </p>
                      </div>
                    </div>
                    <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "0.9rem", lineHeight: 1.7 }}>
                      {author.tagline}
                    </p>
                    <span style={{ color: "var(--blue)", fontFamily: "'Syne',sans-serif", fontSize: "0.8rem", fontWeight: 700 }}>
                      Ver artigos →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
