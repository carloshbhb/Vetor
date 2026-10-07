"use client";

import { useEffect, useState } from "react";

type Opportunity = {
  keyword:string; intent:string; source:string; demandScore:number; trendScore:number;
  commercialScore:number; competitionScore:number; vetorFitScore:number; opportunityScore:number;
  trendDirection:string; impressions:number; clicks:number; ctr:number; position:number|null;
  suggestedRoute:string; sources:string[];
};
type Trend = { term:string; traffic:string; trendPercent:number; source:string; sourceUrl:string };

type MarketData = {
  opportunities:Opportunity[];
  trends:Trend[];
  stored:number;
  searchConsole:{configured:boolean;period:{startDate:string;endDate:string}};
};

export default function MarketIntelligencePage(){
  const [data,setData]=useState<MarketData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [refreshing,setRefreshing]=useState(false);
  const [success,setSuccess]=useState("");

  const load=async()=>{
    setLoading(true);
    setSuccess("");
    try{
      const r=await fetch("/api/admin/market-intelligence",{method:"POST",cache:"no-store",credentials:"same-origin"});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"Falha ao executar a coleta.");
      setData(j);
      setError("");
      setSuccess(`Coleta concluída: ${j.opportunities?.length||0} oportunidades, ${j.trends?.length||0} tendências e ${j.stored||0} registros salvos.`);
    }catch(e){
      setError(e instanceof Error?e.message:"Erro ao executar a coleta.");
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{ void load(); },[]);

  const refresh=async()=>{
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const opportunities=data?.opportunities||[];
  const trends=data?.trends||[];

  if(loading&&!data) return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--line)] border-t-[var(--amber)]"/><p className="font-semibold">Coletando inteligência de mercado...</p><p className="mt-1 text-sm text-[var(--muted)]">Consultando GSC, Autocomplete e Google Trends.</p></div></div>;

  if(error&&!data) return <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-800"><p className="font-bold">Não foi possível carregar o radar</p><p className="mt-1 text-sm">{error}</p><button onClick={refresh} className="mt-4 rounded-xl bg-[#111] px-5 py-3 text-sm font-extrabold text-white">Tentar novamente</button></div>;

  return <div className="max-w-[1500px] mx-auto">
    <header className="mb-7 rounded-2xl border border-border bg-[var(--surface)] p-6 lg:p-7 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Fase 12 · Inteligência SEO</span>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Radar de Mercado</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Cruza Search Console, Google Autocomplete e Google Trends para encontrar oportunidades de conteúdo com maior potencial para o Vetor.</p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="flex min-h-[50px] w-full shrink-0 items-center justify-center rounded-xl bg-[#111111] px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {refreshing ? "Coletando dados..." : "Executar coleta agora"}
        </button>
      </div>
      {success&&<div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{success}</div>}
      {error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
    </header>

    <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["Oportunidades",opportunities.length,"palavras priorizadas"],
        ["Tendências",trends.length,"capturadas no Brasil"],
        ["Search Console",data?.searchConsole.configured?"Ativo":"Não configurado",data?.searchConsole.configured?"fonte disponível":"verificar configuração"],
        ["Registros salvos",data?.stored||0,"nesta coleta"],
      ].map(([label,value,caption])=><div key={String(label)} className="rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
        <p className="mt-2 break-words font-display text-3xl font-black text-[var(--text)]">{value}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{caption}</p>
      </div>)}
    </div>

    <section className="mb-7 overflow-hidden rounded-2xl border border-border bg-[var(--surface)] shadow-sm">
      <div className="border-b border-border p-5 lg:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-heading text-xl font-black">Top oportunidades</h2><p className="mt-1 max-w-3xl text-sm leading-5 text-[var(--muted)]">Ordenadas pelo Opportunity Score. Quanto maior, melhor a combinação entre demanda observada, tendência, intenção comercial, competição e aderência ao catálogo.</p></div>
          {opportunities.length>0&&<span className="text-xs font-bold text-[var(--muted)]">Mostrando até 50</span>}
        </div>
      </div>
      {opportunities.length===0 ? <div className="p-10 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface2)] text-xl">⌕</div><h3 className="font-bold">Nenhuma oportunidade retornada</h3><p className="mx-auto mt-1 max-w-lg text-sm text-[var(--muted)]">A coleta terminou, mas não encontrou keywords priorizadas. Execute novamente ou verifique a configuração do Search Console.</p><button onClick={refresh} disabled={refreshing} className="mt-5 rounded-xl bg-[#111] px-5 py-3 text-sm font-extrabold text-white">{refreshing?"Coletando...":"Executar coleta novamente"}</button></div> :
      <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-sm"><thead><tr className="bg-[var(--surface2)] text-left text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{["Keyword","Score","Demanda","Trend","Comercial","Competição","Fit","Impr.","Posição","Rota"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{opportunities.slice(0,50).map((x,i)=><tr key={x.keyword+i} className="border-t border-border align-top hover:bg-[var(--surface2)]"><td className="max-w-[300px] px-4 py-4"><p className="font-bold text-[var(--text)]">{x.keyword}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{x.intent} · {x.sources.join(", ")}</p></td><td className="px-4 py-4"><span className="inline-flex min-w-11 justify-center rounded-lg bg-[var(--amber-bg)] px-2 py-1 font-black text-[var(--amber)]">{x.opportunityScore}</span></td><td className="px-4 py-4 font-semibold">{x.demandScore}</td><td className="px-4 py-4 font-semibold">{x.trendScore}</td><td className="px-4 py-4 font-semibold">{x.commercialScore}</td><td className="px-4 py-4 font-semibold">{x.competitionScore}</td><td className="px-4 py-4 font-semibold">{x.vetorFitScore}</td><td className="px-4 py-4">{x.impressions}</td><td className="px-4 py-4">{x.position??"—"}</td><td className="max-w-[220px] px-4 py-4 text-xs text-[var(--muted)]">{x.suggestedRoute||"Nova rota"}</td></tr>)}</tbody></table></div>}
      <div className="border-t border-border bg-[var(--surface2)] px-5 py-3 text-xs text-[var(--muted)]">O score é relativo. Não representa volume mensal absoluto de pesquisas.</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)] shadow-sm">
      <div className="border-b border-border p-5 lg:p-6"><h2 className="font-heading text-xl font-black">Tendências de busca no Brasil</h2><p className="mt-1 text-sm text-[var(--muted)]">Google Trends Trending Now · últimas 24 horas.</p></div>
      {trends.length===0 ? <div className="p-10 text-center"><h3 className="font-bold">Nenhuma tendência capturada</h3><p className="mt-1 text-sm text-[var(--muted)]">A coleta não retornou tendências relacionadas ao radar.</p></div> :
      <div className="grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-3">{trends.slice(0,30).map((x,i)=><a key={x.term+i} href={x.sourceUrl||"https://trends.google.com/trending?geo=BR&hl=pt-BR"} target="_blank" rel="noreferrer" className="rounded-xl border border-border p-4 transition hover:-translate-y-0.5 hover:bg-[var(--surface2)]"><div className="flex items-start justify-between gap-3"><p className="font-bold">{x.term}</p><span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-xs font-black text-green-700">+{x.trendPercent}%</span></div><p className="mt-2 text-xs text-[var(--muted)]">{x.traffic} · {x.source}</p></a>)}</div>}
    </section>

    <p className="mt-5 text-xs leading-5 text-[var(--muted)]">O radar não usa Google Ads. A demanda é calculada a partir de sinais relativos disponíveis no Search Console, Autocomplete e Trends; não deve ser interpretada como volume mensal do Keyword Planner.</p>
  </div>;
}
