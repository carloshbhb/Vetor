import {
  getAffiliateFreshnessSummary,
  getAffiliatePerformance,
  type AffiliateSourceType,
} from "@/lib/affiliate-links";
import SalesPanel from "./SalesPanel";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<AffiliateSourceType, string> = {
  review: "Review",
  comparison_product: "Comparativo",
  product_link: "Product link",
  manual: "Manual",
};

export default async function MonetizationPage() {
  const supabase = getSupabaseServiceKeyClient();
  const [data, freshness, salesResult] = await Promise.all([
    getAffiliatePerformance(30),
    getAffiliateFreshnessSummary(),
    supabase
      ? supabase.from("affiliate_sales")
          .select("id,marketplace,external_order_id,source_reference,product_title,quantity,sold_at,reported_at,sale_amount,commission_amount,currency,order_status,attribution_status,attribution_source,attribution_confidence,video_id,review_slug,source_system,notes")
          .order("reported_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const formatSource = (value: AffiliateSourceType) => SOURCE_LABEL[value] || "Manual";

  return (
    <div>
      <header className="mb-7 rounded-2xl border border-border bg-[var(--surface)] p-6 lg:p-7 shadow-sm">
        <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Conversão</span>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Monetização</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Identifique produtos, páginas e campanhas que geram cliques nos links de afiliado. Cliques indicam intenção comercial; compras e comissões continuam sendo confirmadas pelo marketplace.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-border bg-[var(--surface2)] px-3 py-1.5 text-xs font-semibold">{data.analyticsConfigured ? "GA4 configurado" : "GA4 aguardando Measurement ID"}</span>
          <span className="inline-flex items-center rounded-full border border-border bg-[var(--surface2)] px-3 py-1.5 text-xs font-semibold">{freshness.neverChecked} nunca conferidos · {freshness.stale} vencidos</span>
        </div>
      </header>

      <SalesPanel initialSales={(salesResult.data || []) as any[]} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-7">
        {[
          ["Links ativos", data.activeLinks],
          ["Links registrados", data.totalLinks],
          ["Cliques totais", data.allTimeClicks],
          ["Cliques últimos 30 dias", data.periodClicks],
          ["Precisam conferência", freshness.needsCheck],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[var(--surface)] border border-border rounded-2xl p-5 shadow-sm">
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

      <section className="mb-4 overflow-hidden rounded-xl border border-border bg-[var(--surface)]">
        <div className="border-b border-border px-5 py-4"><h2 className="font-heading font-bold">Canais que geram cliques</h2><p className="mt-1 text-xs text-[var(--muted)]">Origem identificada nos novos redirecionamentos de compra.</p></div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.byClickSource.map((item) => <div key={item.source + item.medium} className="flex items-center justify-between gap-3 text-sm"><span>{item.source} · {item.medium}</span><strong className="text-[var(--amber)]">{item.clicks}</strong></div>)}
          {!data.byClickSource.length && <p className="text-sm text-[var(--muted)]">Os canais aparecerão após os próximos cliques rastreados.</p>}
        </div>
      </section>

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
