'use client';

import { useState } from 'react';
import { Loader2, Search, ShoppingCart } from 'lucide-react';
import { Label, Input, Textarea, Section } from '../FormUI';

interface ProductSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
  setForm: (fn: (prev: any) => any) => void;
  slugify: (s: string) => string;
  isTitleOk: boolean;
  isDescOk: boolean;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ProductSection({ form, set, setForm, slugify, isTitleOk, isDescOk, showToast }: ProductSectionProps) {
  const [mlEnriching, setMlEnriching] = useState(false);
  const [mlSource, setMlSource] = useState<string | null>(null);
  const [syncingPrice, setSyncingPrice] = useState(false);

  async function handleMLEnrich() {
    if (!form.product && !form.affiliateUrl) {
      showToast('Preencha o Nome do Produto ou o Link de Afiliado primeiro.', 'error');
      return;
    }
    setMlEnriching(true);
    setMlSource(null);
    try {
      const res = await fetch('/api/ml-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: form.product || undefined,
          affiliateUrl: form.affiliateUrl || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setForm((f: any) => ({
        ...f,
        product: f.product || json.title || f.product,
        priceNew: json.price || f.priceNew,
        priceOld: json.priceOld || f.priceOld,
        imageUrl: json.imageUrl || f.imageUrl,
        affiliateUrl: json.affiliateUrl || f.affiliateUrl,
      }));

      setMlSource(json.source || 'Mercado Livre');
      showToast(`Dados reais extraídos via ${json.source}! Imagem, preço e link atualizados.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao buscar dados no Mercado Livre.', 'error');
    } finally {
      setMlEnriching(false);
    }
  }

  async function handleSyncPrice() {
    if (!form.affiliateUrl) {
      showToast('Por favor, insira o Link de Afiliado primeiro.', 'error');
      return;
    }
    setSyncingPrice(true);
    try {
      const res = await fetch('/api/sync-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateUrl: form.affiliateUrl, product: form.product }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setForm((f: any) => ({
        ...f,
        priceNew: json.price || f.priceNew,
        priceOld: json.priceOld || f.priceOld,
      }));
      showToast(`Preço sincronizado com sucesso via ${json.method}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao sincronizar preço.', 'error');
    } finally {
      setSyncingPrice(false);
    }
  }

  return (
    <Section title="1. Produto & SEO" desc="Dados base do produto e metadados de indexação.">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2">
          <Label req>Nome do Produto</Label>
          <div className="flex gap-2">
            <Input
              value={form.product}
              onChange={e => set('product', e.target.value)}
              placeholder="Samsung Galaxy Fit3"
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleMLEnrich}
              disabled={mlEnriching}
              title="Buscar dados reais no Mercado Livre (imagem, preço e link de afiliado)"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-syne font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-50 shrink-0 shadow-sm whitespace-nowrap"
            >
              {mlEnriching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {mlEnriching ? 'Buscando…' : 'Buscar no ML'}
            </button>
          </div>
          {mlSource && (
            <div className="flex items-center gap-1.5 mt-1">
              <ShoppingCart size={11} className="text-emerald-600" />
              <span className="text-[11px] font-semibold text-emerald-700">Dados reais via {mlSource} ✓</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label req>Slug (URL)</Label>
          <Input value={form.slug} onChange={e => set('slug', e.target.value)}
            onBlur={() => !form.slug && set('slug', slugify(form.product))}
            placeholder="samsung-galaxy-fit3" />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Smartband" />
        </div>
        <div className="space-y-1.5">
          <Label>Marketplace</Label>
          <select value={form.marketplace} onChange={e => set('marketplace', e.target.value)}
            className="w-full bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue transition-all">
            {['Mercado Livre','Amazon','Shopee','AliExpress','Kabum','Magazine Luiza'].map(m => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Preço Antigo</Label>
          <Input value={form.priceOld} onChange={e => set('priceOld', e.target.value)} placeholder="R$ 399,00" />
        </div>
        <div className="space-y-1.5">
          <Label req>Preço Atual</Label>
          <div className="relative">
            <Input value={form.priceNew} onChange={e => set('priceNew', e.target.value)} placeholder="R$ 249,00" className="pr-20" />
            <button
              type="button"
              onClick={handleSyncPrice}
              disabled={syncingPrice}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue/10 hover:bg-blue hover:text-white text-blue text-xs font-syne font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              title="Sincronizar preço com o link de afiliado"
            >
              {syncingPrice ? <Loader2 size={11} className="animate-spin" /> : '🔄 Sync'}
            </button>
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label req>Link de Afiliado</Label>
          <Input type="url" value={form.affiliateUrl} onChange={e => set('affiliateUrl', e.target.value)} placeholder="https://..." />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label req>Título SEO (40 a 60 chars)</Label>
          <Input value={form.meta.title} maxLength={70}
            onChange={e => set('meta', { ...form.meta, title: e.target.value })}
            placeholder="Samsung Galaxy Fit3 Vale a Pena em 2026? Review Completo" />
          <div className="flex justify-between text-xs text-text-muted">
            <span>Prática recomendada: 40-60 caracteres</span>
            <span className={isTitleOk ? 'text-green font-semibold' : 'text-amber-600'}>{form.meta.title.length}/60 carac.</span>
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Meta Description (130–165 chars)</Label>
          <Textarea value={form.meta.description} rows={2} maxLength={180}
            onChange={e => set('meta', { ...form.meta, description: e.target.value })}
            placeholder="Review honesto do Samsung Galaxy Fit3 em 2026..." />
          <div className="flex justify-between text-xs text-text-muted">
            <span>Resumo atraente para as buscas do Google</span>
            <span className={isDescOk ? 'text-green font-semibold' : 'text-amber-600'}>{form.meta.description.length}/165 carac.</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Palavras-chave (vírgulas)</Label>
          <Input value={form.meta.keywords}
            onChange={e => set('meta', { ...form.meta, keywords: e.target.value })}
            placeholder="galaxy fit3, samsung galaxy fit3, smartband..." />
        </div>
        <div className="space-y-1.5">
          <Label>Tempo de Leitura (min)</Label>
          <Input type="number" min={1} max={30} value={form.meta.readingTime}
            onChange={e => set('meta', { ...form.meta, readingTime: parseInt(e.target.value) })} />
        </div>
      </div>
    </Section>
  );
}
