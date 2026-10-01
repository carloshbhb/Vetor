import type { Metadata } from "next";
import Link from "next/link";
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
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Quem escreve" }]} />
            <span className="eyebrow">Equipe editorial</span>
            <h1>Quem escreve</h1>
            <p className="hero-lead">
              Por trás de cada review existe uma redação com critérios claros, notas de 0 a 10 e zero
              influência de patrocínio na pontuação.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="home-card-grid">
              {authors.map((author) => {
                const initials = author.name
                  .split(" ")
                  .map((word) => word[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <Link key={author.slug} className="home-card" href={`/author/${author.slug}`}>
                    <span className="home-card-label">{author.role}</span>
                    <h3>
                      {initials} · {author.name}
                    </h3>
                    <p>{author.tagline}</p>
                    <div className="home-card-bottom">Ver artigos →</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
