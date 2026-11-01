"use client";
import { useMemo, useState } from "react";

type Sale = {
  id:string; marketplace:string; external_order_id:string|null; source_reference:string|null;
  product_title:string; quantity:number; sold_at:string|null; reported_at:string;
  sale_amount:number|null; commission_amount:number|null; currency:string;
  order_status:string; attribution_status:string; attribution_source:string;
  attribution_confidence:number; video_id:string|null; review_slug:string|null;
  source_system:string; notes:string;
};
type Draft = {
  productTitle:string; externalOrderId:string; sourceReference:string; soldAt:string; quantity:string;
  saleAmount:string; commissionAmount:string; orderStatus:string; attributionStatus:string;
  attributionSource:string; attributionConfidence:string; videoId:string; reviewSlug:string; notes:string;
};
const EMPTY:Draft = {
  productTitle:"",externalOrderId:"",sourceReference:"",soldAt:"",quantity:"1",saleAmount:"",
  commissionAmount:"",orderStatus:"pending",attributionStatus:"pending_verification",
  attributionSource:"unknown",attributionConfidence:"0",videoId:"",reviewSlug:"",notes:"",
};
function money(value:number|null,currency="BRL") {
  return value===null||!Number.isFinite(Number(value))?"—":new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(Number(value));
}
function displayDate(value:string|null) {
  if(!value)return "Não informada";
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"Inválida":d.toLocaleString("pt-BR");
}
function localDate(value:string|null) {
  if(!value)return "";
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"":new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
export default function SalesPanel({initialSales}:{initialSales:Sale[]}) {
  const [sales,setSales]=useState(initialSales);
  const [draft,setDraft]=useState<Draft>(EMPTY);
  const [editing,setEditing]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const totals=useMemo(()=>({
    count:sales.length,
    pending:sales.filter(s=>s.attribution_status==="pending_verification").length,
    commission:sales.filter(s=>s.order_status==="approved").reduce((n,s)=>n+Number(s.commission_amount||0),0),
  }),[sales]);
  function set<K extends keyof Draft>(key:K,value:Draft[K]) { setDraft(x=>({...x,[key]:value})); }
  function edit(s:Sale) {
    setEditing(s.id);
    setDraft({
      productTitle:s.product_title,externalOrderId:s.external_order_id||"",sourceReference:s.source_reference||"",
      soldAt:localDate(s.sold_at),quantity:String(s.quantity||1),
      saleAmount:s.sale_amount===null?"":String(s.sale_amount),
      commissionAmount:s.commission_amount===null?"":String(s.commission_amount),
      orderStatus:s.order_status,attributionStatus:s.attribution_status,attributionSource:s.attribution_source,
      attributionConfidence:String(s.attribution_confidence||0),videoId:s.video_id||"",reviewSlug:s.review_slug||"",notes:s.notes||"",
    });
    setMessage("Editando registro existente.");setError(null);
  }
  function clear(){setEditing(null);setDraft(EMPTY);setMessage(null);setError(null);}
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(null);setError(null);
    try {
      const response=await fetch("/api/admin/affiliate-sales/",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          id:editing,productTitle:draft.productTitle,externalOrderId:draft.externalOrderId,
          sourceReference:draft.sourceReference,soldAt:draft.soldAt?new Date(draft.soldAt).toISOString():null,
          quantity:Number(draft.quantity||1),saleAmount:draft.saleAmount===""?null:Number(draft.saleAmount),
          commissionAmount:draft.commissionAmount===""?null:Number(draft.commissionAmount),
          orderStatus:draft.orderStatus,attributionStatus:draft.attributionStatus,
          attributionSource:draft.attributionSource,attributionConfidence:Number(draft.attributionConfidence||0),
          videoId:draft.videoId,reviewSlug:draft.reviewSlug,notes:draft.notes,
          sourceSystem:"marketplace_portal",marketplace:"Mercado Livre",
        }),
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||!payload.data)throw new Error(payload.error||"Não foi possível salvar a venda.");
      setSales(current=>[payload.data,...current.filter(s=>s.id!==payload.data.id)]);
      setMessage(editing?"Venda atualizada.":"Venda registrada sem presumir a origem.");
      setEditing(null);setDraft(EMPTY);
    } catch(cause) {
      setError(cause instanceof Error?cause.message:"Erro ao registrar a venda.");
    } finally {setBusy(false);}
  }
  const field="rounded-lg border border-border bg-[var(--surface2)] px-3 py-2 text-sm font-normal";
  return <section className="mb-7 overflow-hidden rounded-2xl border border-border bg-[var(--surface)] shadow-sm">
    <div className="border-b border-border px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-heading text-lg font-bold">Vendas e comissões</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Registre os dados do painel/relatório oficial. Atribua a um canal somente quando houver evidência.</p></div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-border px-3 py-1">{totals.count} registros</span>
          <span className="rounded-full border border-border px-3 py-1">{totals.pending} aguardando origem</span>
          <span className="rounded-full border border-border px-3 py-1">{money(totals.commission)} em comissões aprovadas</span>
        </div>
      </div>
    </div>
    <form onSubmit={submit} className="grid gap-3 border-b border-border p-5 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1 text-xs font-semibold">Produto vendido<input required value={draft.productTitle} onChange={e=>set("productTitle",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">Data/hora da venda<input type="datetime-local" value={draft.soldAt} onChange={e=>set("soldAt",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">ID do pedido<input value={draft.externalOrderId} onChange={e=>set("externalOrderId",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">Referência única do relatório<input value={draft.sourceReference} onChange={e=>set("sourceReference",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">Quantidade<input type="number" min="1" step="1" value={draft.quantity} onChange={e=>set("quantity",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">Valor da venda (R$)<input type="number" min="0" step="0.01" value={draft.saleAmount} onChange={e=>set("saleAmount",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">Comissão (R$)<input type="number" min="0" step="0.01" value={draft.commissionAmount} onChange={e=>set("commissionAmount",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">Status do pedido<select value={draft.orderStatus} onChange={e=>set("orderStatus",e.target.value)} className={field}>
        <option value="reported_unverified">Informada, não verificada</option><option value="pending">Em processamento</option><option value="approved">Aprovada</option><option value="rejected">Rejeitada</option><option value="cancelled">Cancelada</option><option value="returned">Devolvida</option>
      </select></label>
      <label className="grid gap-1 text-xs font-semibold">Situação da atribuição<select value={draft.attributionStatus} onChange={e=>set("attributionStatus",e.target.value)} className={field}>
        <option value="pending_verification">Aguardando confirmação</option><option value="unknown">Desconhecida</option><option value="attributed">Atribuída</option><option value="unattributed">Não atribuída</option>
      </select></label>
      <label className="grid gap-1 text-xs font-semibold">Canal atribuído<select value={draft.attributionSource} onChange={e=>set("attributionSource",e.target.value)} className={field}>
        <option value="unknown">Ainda não identificado</option><option value="website_review">Review no Vetor</option><option value="youtube_video">YouTube</option><option value="other">Outro</option><option value="user_reported">Informado manualmente</option>
      </select></label>
      <label className="grid gap-1 text-xs font-semibold">Confiança da atribuição (%)<input type="number" min="0" max="100" value={draft.attributionConfidence} onChange={e=>set("attributionConfidence",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">ID do vídeo<input value={draft.videoId} onChange={e=>set("videoId",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold">Slug do review<input value={draft.reviewSlug} onChange={e=>set("reviewSlug",e.target.value)} className={field}/></label>
      <label className="grid gap-1 text-xs font-semibold md:col-span-2 xl:col-span-4">Observações (sem dados pessoais do comprador)<textarea rows={2} value={draft.notes} onChange={e=>set("notes",e.target.value)} className={field}/></label>
      <div className="flex flex-wrap items-center gap-2 md:col-span-2 xl:col-span-4">
        <button type="submit" disabled={busy} className="rounded-lg bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{busy?"Salvando...":editing?"Atualizar venda":"Registrar venda"}</button>
        {editing&&<button type="button" onClick={clear} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Cancelar</button>}
        {message&&<span className="text-xs text-[var(--muted)]">{message}</span>}{error&&<span role="alert" className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="border-b border-border text-left text-xs text-[var(--muted)]"><th className="px-5 py-3">Produto</th><th className="px-4 py-3">Data</th><th className="px-4 py-3 text-right">Venda</th><th className="px-4 py-3 text-right">Comissão</th><th className="px-4 py-3">Atribuição</th><th className="px-5 py-3 text-right">Ação</th></tr></thead>
      <tbody>{sales.map(s=><tr key={s.id} className="border-b border-border/70 align-top">
        <td className="px-5 py-3"><p className="max-w-[360px] font-medium">{s.product_title}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{s.marketplace} · {s.quantity} un.</p></td>
        <td className="px-4 py-3 text-xs">{displayDate(s.sold_at)}</td><td className="px-4 py-3 text-right">{money(s.sale_amount,s.currency)}</td><td className="px-4 py-3 text-right">{money(s.commission_amount,s.currency)}</td>
        <td className="px-4 py-3 text-xs"><strong>{s.attribution_status==="attributed"?"Atribuída":s.attribution_status==="unattributed"?"Não atribuída":"Pendente"}</strong><p className="mt-1 text-[var(--muted)]">{s.order_status} · {s.attribution_source}</p>{s.video_id&&<p>{s.video_id}</p>}</td>
        <td className="px-5 py-3 text-right"><button type="button" onClick={()=>edit(s)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Editar</button></td>
      </tr>)}{!sales.length&&<tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--muted)]">Nenhuma venda registrada.</td></tr>}</tbody>
    </table></div>
  </section>;
}
