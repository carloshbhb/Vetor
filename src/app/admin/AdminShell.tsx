"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string; description: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { label: "Dashboard", href: "/admin", description: "Resumo operacional do site", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { label: "Reviews", href: "/admin/reviews", description: "Publicação e manutenção", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
      { label: "Artigos Virais", href: "/admin/viral", description: "Conteúdo comparativo", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
      { label: "Vídeos", href: "/admin/videos", description: "Fila de produção", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 001.555-.832l3.197-2.132a1 1 0 000-1.664z" },
      { label: "Gerar Conteúdo", href: "/admin/generate", description: "Pipeline automático", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Links de Afiliado", href: "/admin/afiliados", description: "Fonte central de ofertas", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 005.656-5.656l-1.1 1.1" },
      { label: "Monetização", href: "/admin/monetizacao", description: "Cliques e desempenho", icon: "M12 8c-2.21 0-4 1.34-4 3s1.79 3 4 3 4 1.34 4 3-1.79 3-4 3m0-16v2m0 14v2m8-9a8 8 0 11-16 0 8 8 0 0116 0z" },
    ],
  },
  {
    label: "SEO & inteligência",
    items: [
      { label: "Oportunidades SEO", href: "/admin/oportunidades", description: "Fila orientada por GSC", icon: "M4 19V5m0 14h16M8 16l3-4 3 2 5-7" },
      { label: "Radar de Mercado", href: "/admin/mercado", description: "Demanda e tendências", icon: "M3 12h4l2-7 4 14 2-7h6" },
    ],
  },
];

const sectionInfo: Record<string, { area: string; objective: string; workflow: string; source: string }> = {
  "/admin": { area: "Visão geral", objective: "Entender rapidamente o estado do Vetor e entrar na próxima tarefa de gestão.", workflow: "Monitorar inventário → identificar pendências → abrir a área responsável.", source: "Reviews, artigos e categorias" },
  "/admin/reviews": { area: "Conteúdo", objective: "Publicar, revisar e remover reviews sem misturar guias ou comparativos.", workflow: "Revisar status → publicar rascunhos → abrir página pública → corrigir quando necessário.", source: "API /api/admin/reviews" },
  "/admin/viral": { area: "Conteúdo", objective: "Gerenciar artigos comparativos/virais e acompanhar o inventário publicado.", workflow: "Revisar artigos → validar produtos vinculados → remover somente quando necessário.", source: "Viral articles" },
  "/admin/videos": { area: "Produção", objective: "Controlar a fila real de vídeos e atuar apenas nos itens que precisam de processamento.", workflow: "Adicionar produto → processar fila → revisar falhas → abrir vídeo concluído.", source: "video_queue" },
  "/admin/generate": { area: "Produção", objective: "Acionar o pipeline automático de geração com retorno claro de sucesso ou falha de qualidade.", workflow: "Executar geração → validar resposta → revisar conteúdo criado antes de escalar.", source: "API /api/admin/generate" },
  "/admin/afiliados": { area: "Comercial", objective: "Manter uma fonte única para todos os destinos de afiliado publicados no site.", workflow: "Cadastrar/editar oferta → testar saúde → acompanhar cliques → usar /go/ nas páginas.", source: "public.affiliate_links" },
  "/admin/ml": { area: "Comercial · Mercado Livre", objective: "Encontrar anúncios relevantes e mais vendidos sem substituir automaticamente o link de afiliado.", workflow: "Conectar conta → pesquisar anúncios → revisar matches → enviar aprovados para a fila.", source: "affiliate_link_ml_matches" },
  "/admin/ml/fila": { area: "Comercial · Mercado Livre", objective: "Registrar o link oficial de afiliado e aplicar o destino aprovado à Central.", workflow: "Abrir anúncio → gerar link oficial → colar → marcar como aplicado.", source: "affiliate_link_ml_matches + affiliate_links" },
  "/admin/oportunidades": { area: "SEO", objective: "Transformar dados do Search Console em uma fila editorial priorizada e mensurável.", workflow: "Ler sinal → abrir ação → executar melhoria → marcar status → medir impacto.", source: "Search Console + histórico SEO" },
  "/admin/mercado": { area: "Inteligência SEO", objective: "Descobrir novas oportunidades combinando demanda, tendência, intenção e aderência ao catálogo.", workflow: "Executar coleta → ordenar scores → validar relevância → transformar em conteúdo.", source: "GSC + Autocomplete + Trends" },
  "/admin/monetizacao": { area: "Comercial", objective: "Entender quais produtos, páginas e campanhas estão gerando intenção de compra.", workflow: "Analisar cliques → localizar páginas fortes → conferir links → priorizar otimizações.", source: "Cliques /go/ + dados de afiliados" },
};

function currentSection(pathname: string) {
  if (pathname.startsWith("/admin/ml/fila")) return sectionInfo["/admin/ml/fila"];
  if (pathname.startsWith("/admin/ml")) return sectionInfo["/admin/ml"];
  const key = Object.keys(sectionInfo)
    .filter((key) => key !== "/admin" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return sectionInfo[key || "/admin"];
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = pathname?.replace(/\/+$/, "") || "";
  const isLoginPage = normalizedPathname === "/admin/login";
  const info = currentSection(normalizedPathname);

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(false);
      setChecking(false);
      return;
    }

    let active = true;
    setChecking(true);

    fetch("/api/admin/auth", { cache: "no-store" })
      .then((res) => {
        if (!active) return;
        if (res.ok) setAuthorized(true);
        else window.location.replace("/admin/login/");
      })
      .catch(() => {
        if (active) window.location.replace("/admin/login/");
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => { active = false; };
  }, [isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="rounded-2xl border border-border bg-[var(--surface)] px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-[var(--amber)]" />
          <p className="text-sm font-semibold">Abrindo painel administrativo…</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-border bg-[var(--surface)] min-h-screen sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <a href="/admin" className="text-xl font-display font-black text-[var(--text)]">vetor.blog</a>
          <p className="text-xs text-[var(--muted)] mt-1">Central de gestão</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--muted)]">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = item.href === "/admin"
                    ? normalizedPathname === "/admin"
                    : normalizedPathname.startsWith(item.href);
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${isActive ? "bg-[var(--amber-bg)] text-[var(--amber)]" : "text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"}`}
                    >
                      <svg className="mt-0.5 w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{item.label}</span>
                        <span className={`mt-0.5 block text-[10px] leading-4 ${isActive ? "text-[var(--amber)]/80" : "text-[var(--muted)]"}`}>{item.description}</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <a href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]">
            ← Voltar ao site
          </a>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="lg:hidden border-b border-border bg-[var(--surface)] px-4 py-3 sticky top-0 z-40">
          <div className="flex items-center gap-2 overflow-x-auto">
            <a href="/admin" className="mr-2 whitespace-nowrap text-lg font-display font-black text-[var(--text)]">vetor.blog</a>
            {navGroups.flatMap((group) => group.items).map((item) => {
              const active = item.href === "/admin" ? normalizedPathname === "/admin" : normalizedPathname.startsWith(item.href);
              return <a key={item.href} href={item.href} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${active ? "bg-[var(--amber-bg)] text-[var(--amber)]" : "text-[var(--muted)]"}`}>{item.label}</a>;
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6 xl:p-8">
          <div className="mx-auto max-w-[1500px]">
            {normalizedPathname !== "/admin/mercado" && (
              <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-[var(--surface)] shadow-sm">
                <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr] lg:p-6">
                  <div>
                    <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--amber)]">{info.area}</span>
                    <p className="mt-3 text-sm font-bold text-[var(--text)]">Objetivo desta área</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{info.objective}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-[var(--surface2)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Fluxo recomendado</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text)]">{info.workflow}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-[var(--surface2)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Fonte de dados</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text)]">{info.source}</p>
                    {normalizedPathname.startsWith("/admin/afiliados") && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href="/admin/ml" className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold">Pesquisar ML</a>
                        <a href="/admin/ml/fila" className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-bold">Fila ML</a>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
