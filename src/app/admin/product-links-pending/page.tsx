"use client";

import { useEffect, useState } from "react";

interface ProductLink {
  id: string;
  product_name: string;
  category: string;
  affiliate_url?: string | null;
  product_url?: string;
  image_url?: string;
  marketplace?: string;
  priority?: number;
  source?: string;
  status?: string;
  has_review?: boolean;
  review_slug?: string | null;
}

export default function ProductLinksPendingPage() {
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/admin/product-links-pending/?page=${page}&limit=${ITEMS_PER_PAGE}`,
          { credentials: "same-origin" }
        );
        if (res.status === 401) {
          setError("Não autorizado. Faça login novamente.");
          setLinks([]);
        } else if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Erro ao carregar product links aguardando afiliado.");
        } else {
          const data = await res.json();
          setLinks(Array.isArray(data?.data) ? data.data : []);
          setError("");
        }
      } catch {
        setError("Erro ao carregar product links aguardando afiliado.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page]);

  // total available on server; keep client paging consistent with the
  // items actually rendered for this page.
  const totalPages = Math.max(1, Math.ceil(links.length / ITEMS_PER_PAGE));

  return (
    <div>
      <header className="mb-7 rounded-2xl border border-border bg-[var(--surface)] p-6 lg:p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--blue-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--blue)]">Conteúdo Pendente</span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Products Aguardando Link de Afiliado</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Estes produtos estão prontos para gerar landing pages e precisam de links de afiliado válidos.</p>
          </div>
          <div className="rounded-xl border border-border bg-[var(--surface2)] px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Total</p>
            <p className="mt-1 font-display text-2xl font-black">{links.length}</p>
          </div>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-[var(--muted)]">Carregando products...</div>
        </div>
      )}

      {error && (
        <div>
          <h1 className="font-display text-3xl mb-6">Products Pendente</h1>
          <div className="bg-[var(--red)]/10 border border-[var(--red)]/20 text-[var(--red)] rounded-xl p-4 text-sm">
            {error}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--surface2)]">
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Produto</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Categoria</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Link de Afiliado</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Source</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">LP (rascunho)</th>
                <th className="text-right px-4 py-3 font-heading font-bold text-[var(--text)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-border hover:bg-[var(--surface2)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text)]">{link.product_name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-[var(--surface2)] text-xs text-[var(--muted)] px-2 py-0.5 rounded-full">
                      {link.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {link.affiliate_url ? (
                      <span className="text-[var(--green)]">✅ Preenchido</span>
                    ) : (
                      <span className="text-[var(--amber)]">❌ Ausente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[var(--surface2)] text-xs text-[var(--muted)] px-2 py-0.5 rounded-full">
                      {link.source}
                    </span>
                  </td>
                                     <td className="px-4 py-3">
                     {link.review_slug ? (
                       <a
                         href={`/reviews/${link.review_slug}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-xs text-[var(--amber)] hover:underline"
                       >
                         Abrir LP
                       </a>
                     ) : (
                       <span className="text-xs text-[var(--muted)]">—</span>
                     )}
                   </td>
                   <td className="px-4 py-3 text-right">
                     <button
                       onClick={() => handleGenerateLandingPage(link.id, link.product_name)}
                       className="text-xs text-[var(--blue)] hover:underline"
                     >
                       Gerar Landing Page
                     </button>
                   </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {links.length === 0 && (
          <div className="text-center py-10 text-[var(--muted)]">
            Nenhum product link pendente encontrado.
          </div>
        )}
      </div>
    </div>
  );

  async function handleGenerateLandingPage(productId: string, productName: string) {
    if (!confirm(`Gerar landing page para "${productName}"? Esta criará um rascunho e marcará o product como com review.`)) return;

    try {
      const res = await fetch(`/api/admin/generate-landing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, productName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao gerar landing page.");
        return;
      }

      alert("Landing page gerada com sucesso!");
      // Recarregar a lista
      const updated = await fetch(`/api/admin/product-links-pending/?page=0&limit=${ITEMS_PER_PAGE}`, { credentials: "same-origin" });
      if (updated.ok) {
        const payload = await updated.json();
        setLinks(Array.isArray(payload?.data) ? payload.data : []);
      }
    } catch {
      alert("Erro ao gerar landing page.");
    }
  }
}