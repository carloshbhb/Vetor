import {
  getAffiliateFreshnessSummary,
  getAffiliatePerformance,
  type AffiliateSourceType,
} from "@/lib/affiliate-links";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<AffiliateSourceType, string> = {
  review: "Review",
  comparison_product: "Comparativo",
  product_link: "Product link",
  manual: "Manual",
};

export default async function MonetizationPage() {
  const [data, freshness] = await Promise.all([
    getAffiliatePerformance(30),
    getAffiliateFreshnessSummary(),
  ]);

  const formatSource = (value: AffiliateSourceType) => SOURCE_LABEL[value] || "Manual";

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--amber)] font-bold">
          Stage 9 · Conversão
        </p>
        <h1 className="font-display text-3xl mt-1">Monetização</h1>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-3xl">
          Painel operacional para identificar produtos e páginas que levam leitores aos links de afiliado.
          Cliques são sinais de intenção comercial; compras e comissões continuam dependentes do marketplace.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold">
            {data.analyticsConfigured ? "GA4 configurado" : "GA4 aguardando Measurement ID"}
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold">
            {freshness.neverChecked} nunca conferidos · {freshness.stale} vencidos
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-7">
        {[
          ["Links ativos", data.activeLinks],
          ["Links registrados", data.totalLinks],
          ["Cliques totais", data.allTimeClicks],
          ["Cliques últimos 30 dias", data.periodClicks],
          ["Precisam conferência", freshness.needsCheck],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[var(--surface)] border border-border rounded-xl p-5">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-2xl font-display text-[var(--amber)] mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <section className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-bold">Produtos que mais geram cliques</h2>
            <p className="text-xs text-[var(--muted)] mt-1">Janela de 30 dias</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border text-[var(--muted)]">
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-5 py-3 text-right">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {data.topLinks.map((item) => (
                  <tr key={item.slug} className="border-b border-border/70">
                    <td className="px-5 py-3">
                      <p className="font-medium truncate max-w-[360px]">{item.name}</p>
                      <p className="text-[10px] text-[var(--muted)] mt-1">/go/{item.slug}/</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{formatSource(item.sourceType)}</td>
                    <td className="px-5 py-3 text-right font-bold">{item.clicks}</td>
                  </tr>
                ))}
                {!data.topLinks.length && (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-[var(--muted)]">
                      Ainda não há cliques registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-bold">Origem dos cliques</h2>
            <p className="text-xs text-[var(--muted)] mt-1">Janela de 30 dias</p>
          </div>
          <div className="p-5">
            {data.bySourceType.length ? (
              <div className="space-y-3">
                {data.bySourceType.map((item) => (
                  <div key={item.sourceType} className="flex items-center justify-between gap-4">
                    <span className="text-sm">{formatSource(item.sourceType)}</span>
                    <strong className="text-[var(--amber)]">{item.clicks}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Ainda não há dados de cliques.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-bold">Campanhas UTM</h2>
            <p className="text-xs text-[var(--muted)] mt-1">Janela de 30 dias</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border text-[var(--muted)]">
                  <th className="px-5 py-3">Campanha</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Medium</th>
                  <th className="px-5 py-3 text-right">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {data.byCampaign.map((item) => (
                  <tr key={item.campaign + item.source + item.medium} className="border-b border-border/70">
                    <td className="px-5 py-3 font-medium">{item.campaign}</td>
                    <td className="px-4 py-3 text-xs">{item.source || "—"}</td>
                    <td className="px-4 py-3 text-xs">{item.medium || "—"}</td>
                    <td className="px-5 py-3 text-right font-bold">{item.clicks}</td>
                  </tr>
                ))}
                {!data.byCampaign.length && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-[var(--muted)]">
                      Ainda não há cliques com parâmetros UTM.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-bold">Páginas que enviam para ofertas</h2>
            <p className="text-xs text-[var(--muted)] mt-1">Referer registrado · últimos 30 dias</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border text-[var(--muted)]">
                  <th className="px-5 py-3">Página</th>
                  <th className="px-5 py-3 text-right">Cliques</th>
                </tr>
              </thead>
              <tbody>
                {data.byPage.map((item) => (
                  <tr key={item.path} className="border-b border-border/70">
                    <td className="px-5 py-3 font-mono text-xs">{item.path}</td>
                    <td className="px-5 py-3 text-right font-bold">{item.clicks}</td>
                  </tr>
                ))}
                {!data.byPage.length && (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-[var(--muted)]">
                      Ainda não há páginas com cliques.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
