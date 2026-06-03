'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wand2, Save, Upload, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, 
  FileText, Settings, BarChart3, TrendingUp, Sparkles,
  Search, ShoppingCart
} from 'lucide-react';
import type { ReviewData } from '@/lib/types';
import Logo from '@/components/Logo';

// Local array fields
import {
  StringArrayField,
  KVArrayField,
  FAQArrayField,
  ScoreBarsField,
  SectionsField,
} from './ArrayField';

// Public review components for the high-fidelity live preview
import ScoreBox from '@/components/review/ScoreBox';
import ArticleCTA from '@/components/review/ArticleCTA';
import SidebarCTA from '@/components/review/SidebarCTA';
import SpecsTable from '@/components/review/SpecsTable';
import CompareTable from '@/components/review/CompareTable';
import ProsConsGrid from '@/components/review/ProsConsGrid';
import FAQAccordion from '@/components/review/FAQAccordion';
import VerdictBox from '@/components/review/VerdictBox';


const DEFAULT_BARS = [
  { label: 'Tela',    value: 8.0, pct: 80 },
  { label: 'Bateria', value: 8.0, pct: 80 },
  { label: 'Saúde',  value: 8.0, pct: 80 },
  { label: 'Custo',  value: 8.0, pct: 80 },
  { label: 'Design', value: 8.0, pct: 80 },
];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\x036f]/g, '')
    .replace(/\breview\b/gi, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/-+/g, '-');
}

// Simple markdown-to-HTML helper for the real-time client preview
function simpleMarkdown(text: string): string {
  if (!text) return '';
  let html = text;
  
  // Highlighting block: <div class="highlight-box"><p>💡 ...</p></div>
  html = html.replace(/💡\s*([^\n]+)/g, '<div class="highlight-box"><p>💡 $1</p></div>');
  
  // H3 subtitles
  html = html.replace(/^###\s*([^\n]+)/gm, '<h3 class="text-xl font-bold mt-6 mb-3 text-navy">$1</h3>');
  
  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Bullet lists
  html = html.replace(/^\*\s*([^\n]+)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ul class="list-disc pl-5 my-3">$1</ul>');
  
  // Paragraph splits
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<div') || p.trim().startsWith('<h3') || p.trim().startsWith('<ul')) return p;
    return `<p class="mb-4 leading-relaxed text-text2">${p}</p>`;
  }).join('');
  
  return html;
}

// Helper to safely highlight search terms within headlines in the client-side live preview
function renderWithHighlight(text: string, highlight: string) {
  if (!text) return '';
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) {
    return text;
  }
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === highlight.toLowerCase() 
          ? <em key={index} className="text-blue font-style-normal">{part}</em> 
          : part
      )}
    </>
  );
}

type FormState = Omit<ReviewData, 'id' | 'createdAt' | 'updatedAt'>;

function emptyForm(): FormState {
  return {
    slug: '', status: 'draft',
    meta: { title: '', description: '', keywords: '', readingTime: 5 },
    product: '', category: '', marketplace: 'Mercado Livre',
    priceOld: '', priceNew: '', affiliateUrl: '', imageUrl: '',
    adsEnabled: false,
    hero: {
      headlineLine1: '', headlineLine2: '', headlineEm: '',
      lead: '', overallScore: 8.0, bars: DEFAULT_BARS,
    },
    specs: [], sections: [],
    compareTable: { caption: '', columns: [], winnerCol: 1, rows: [] },
    pros: [], cons: [], testimonials: [], faq: [],
    verdict: { score: 8.0, label: '', text: '', note: '' },
    schemaRating: { ratingValue: 4.5, reviewCount: 5000 },
  };
}

// ─── UI helpers ───────────────────────────────────────────────────────────
const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
  <label className="font-syne font-bold text-xs uppercase tracking-widest text-text-2 flex items-center gap-1">
    {children}{req && <span className="text-red">*</span>}
  </label>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all ${props.className || ''}`}
  />
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`w-full bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all resize-y ${props.className || ''}`}
  />
);
const Section = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="bg-white border border-border rounded-xl shadow-sm p-6 space-y-5">
    <div className="border-b border-border pb-4">
      <h2 className="font-bebas text-3xl tracking-wide text-text">{title}</h2>
      {desc && <p className="text-text-muted text-sm mt-0.5">{desc}</p>}
    </div>
    {children}
  </div>
);

export default function ReviewForm({ initial, reviewId }: { initial?: ReviewData; reviewId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial ? { ...initial } : emptyForm());
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [syncingPrice, setSyncingPrice] = useState(false);
  const [mlEnriching, setMlEnriching] = useState(false);
  const [mlSource, setMlSource] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const productParam = params.get('product');
      const keywordsParam = params.get('keywords');
      const categoryParam = params.get('category');
      
      if (productParam || keywordsParam || categoryParam) {
        setForm(f => ({
          ...f,
          product: productParam || f.product,
          meta: {
            ...f.meta,
            keywords: keywordsParam || f.meta.keywords,
          },
          category: categoryParam || f.category,
        }));
      }
    }
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Live SEO / CRO Calculations ───────────────────────────────────────────
  const wordCount = form.sections.reduce((acc, s) => {
    return acc + (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);

  const isTitleOk = form.meta.title.length >= 40 && form.meta.title.length <= 60;
  const isDescOk = form.meta.description.length >= 130 && form.meta.description.length <= 165;
  const isKeywordsOk = form.meta.keywords.split(',').filter(k => k.trim()).length >= 3;
  const isLinkOk = !!form.affiliateUrl && form.affiliateUrl.startsWith('http');
  const isImgOk = !!form.imageUrl;
  const isSpecsOk = form.specs.length >= 5;
  const isProsConsOk = form.pros.length >= 4 && form.cons.length >= 3;
  const isFaqOk = form.faq.length >= 4;
  const isCompareOk = form.compareTable.rows && form.compareTable.rows.length >= 2;

  // SEO Score calculation (each check gives points)
  const seoChecks = [
    { label: 'Título SEO ideal (40-60 carac.)', pass: isTitleOk, warning: form.meta.title.length > 0 && !isTitleOk },
    { label: 'Descrição otimizada (130-165 carac.)', pass: isDescOk, warning: form.meta.description.length > 0 && !isDescOk },
    { label: 'Pelo menos 3 palavras-chave', pass: isKeywordsOk, warning: false },
    { label: 'Volume de conteúdo (> 800 palavras)', pass: wordCount >= 800, warning: wordCount > 0 && wordCount < 800 },
    { label: 'Imagem principal configurada', pass: isImgOk, warning: false },
    { label: 'Faq estruturado (mín. 4 perguntas)', pass: isFaqOk, warning: false },
  ];
  
  const croChecks = [
    { label: 'Link de afiliado ativo', pass: isLinkOk },
    { label: 'Ficha técnica (mín. 5 especificações)', pass: isSpecsOk },
    { label: 'Prós e Contras completos', pass: isProsConsOk },
    { label: 'Tabela comparativa preenchida', pass: isCompareOk },
    { label: 'Notas e veredicto configurados', pass: form.hero.overallScore > 0 && !!form.verdict.text },
  ];

  const totalChecks = seoChecks.length + croChecks.length;
  const passedChecks = [...seoChecks, ...croChecks].filter(c => c.pass).length;
  const healthScore = Math.round((passedChecks / totalChecks) * 100);

  // ─── ML Product Enrichment ──────────────────────────────────────────────────
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

      setForm(f => ({
        ...f,
        // Only update product name if it was empty
        product: f.product || json.title || f.product,
        priceNew: json.price || f.priceNew,
        priceOld: json.priceOld || f.priceOld,
        imageUrl: json.imageUrl || f.imageUrl,
        affiliateUrl: json.affiliateUrl || f.affiliateUrl,
      }));

      setMlSource(json.source || 'Mercado Livre');
      showToast(
        `Dados reais extraídos via ${json.source}! Imagem, preço e link atualizados.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Erro ao buscar dados no Mercado Livre.', 'error');
    } finally {
      setMlEnriching(false);
    }
  }

  // ─── Price Synchronization ──────────────────────────────────────────────────
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
        body: JSON.stringify({
          affiliateUrl: form.affiliateUrl,
          product: form.product,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setForm(f => ({
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

  // ─── Image upload ──────────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      set('imageUrl', json.url);
      showToast('Imagem enviada com sucesso!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingImg(false);
    }
  }

  // ─── AI pre-fill ───────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!form.product) { showToast('Preencha o nome do produto primeiro.', 'error'); return; }
    setGenerating(true);

    let currentPriceNew = form.priceNew;
    let currentPriceOld = form.priceOld;
    let syncedSuccess = false;

    // Automatically sync price first if an affiliate URL is provided
    if (form.affiliateUrl) {
      try {
        const syncRes = await fetch('/api/sync-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            affiliateUrl: form.affiliateUrl,
            product: form.product,
          }),
        });
        const syncJson = await syncRes.json();
        if (syncRes.ok && syncJson.price) {
          currentPriceNew = syncJson.price;
          currentPriceOld = syncJson.priceOld || currentPriceOld;
          syncedSuccess = true;
        }
      } catch (err) {
        console.warn('Silent sync error during generation:', err);
      }
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: form.product, category: form.category,
          price: currentPriceNew, old_price: currentPriceOld,
          affiliate_url: form.affiliateUrl, marketplace: form.marketplace,
          image_url: form.imageUrl || undefined,
          specs: form.specs.map(s => `${s.label}: ${s.value}`).join(', ') || 'Preencher',
          competitors: form.compareTable.columns.slice(1).join(', ') || 'Concorrentes',
          tone: 'misto', site_name: 'Vetor Blog', site_url: 'https://www.vetor.blog',
          author: 'Vetor Blog',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const d = json.data;
      const usedProvider = json.provider || 'Gemini';
      
      setForm(f => ({
        ...f,
        slug: d.meta?.slug || slugify(form.product),
        product: d.product || f.product,
        category: d.category || f.category,
        priceOld: syncedSuccess ? currentPriceOld : (d.priceOld || d.old_price || f.priceOld),
        priceNew: syncedSuccess ? currentPriceNew : (d.priceNew || d.price || f.priceNew),
        meta: {
          title: d.meta?.title || f.meta.title,
          description: d.meta?.description || f.meta.description,
          keywords: d.meta?.keywords || f.meta.keywords,
          readingTime: d.meta?.reading_time || 7,
        },
        hero: {
          headlineLine1: d.hero?.headline_line1 || f.hero.headlineLine1,
          headlineLine2: d.hero?.headline_line2 || f.hero.headlineLine2,
          headlineEm:   d.hero?.headline_em    || f.hero.headlineEm,
          lead:         d.hero?.lead           || f.hero.lead,
          overallScore: d.hero?.overall_score  || f.hero.overallScore,
          bars: d.hero?.bars?.map((b: any) => ({
            label: b.label, value: b.value, pct: b.pct ?? b.value * 10,
          })) || f.hero.bars,
        },
        specs:    d.specs    || f.specs,
        sections: d.sections?.map((s: any) => ({
          id: s.id, heading: s.heading,
          tocLabel: s.toc_label, tocEmoji: s.toc_emoji, content: s.content,
        })) || f.sections,
        compareTable: d.compare ? {
          caption:   d.compare.caption,
          columns:   d.compare.columns,
          winnerCol: d.compare.winner_col,
          rows:      d.compare.rows,
        } : f.compareTable,
        pros: d.pros || f.pros,
        cons: d.cons || f.cons,
        faq:  d.faq  || f.faq,
        verdict: {
          score: d.verdict?.score || f.verdict.score,
          label: d.verdict?.label || f.verdict.label,
          text:  d.verdict?.text  || f.verdict.text,
          note:  d.verdict?.note  || f.verdict.note,
        },
        schemaRating: {
          ratingValue:  d.schemas?.aggregate_rating?.rating_value  || 4.5,
          reviewCount:  d.schemas?.aggregate_rating?.review_count  || 5000,
        },
      }));
      showToast(
        syncedSuccess
          ? `Preço real sincronizado! ${usedProvider} + MiMo V2.5 otimizaram o review para SEO.`
          : `${usedProvider} + MiMo V2.5 preencheram e otimizaram o review completo!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(status: 'draft' | 'published') {
    setSaving(true);
    try {
      const payload = { ...form, status };
      const isEdit = !!reviewId;
      const res = await fetch(
        isEdit ? `/api/reviews/${reviewId}` : '/api/reviews',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      // index.xml will be updated next reload due to dynamic sitemap
      showToast(status === 'published' ? 'Publicado com sucesso e indexado no sitemap!' : 'Rascunho salvo!', 'success');
      setTimeout(() => router.push('/admin'), 1200);
    } catch (err: any) {
      showToast(err.message, 'error');
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-lg text-white text-sm font-medium animate-slide-up ${toast.type === 'success' ? 'bg-green' : 'bg-red'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Generating overlay */}
      {generating && (
        <div className="fixed inset-0 bg-text/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm w-full mx-4 border border-border">
            <div className="w-14 h-14 border-4 border-blue-mid border-t-blue rounded-full animate-spin mx-auto mb-5" />
            <p className="font-syne font-extrabold text-2xl text-text mb-2 tracking-tight">Gerando Review com IA</p>
            <p className="text-text-muted text-sm">Gemini ou MiMo V2.5 geram o review e MiMo V2.5 otimiza para SEO ficar verde...</p>
          </div>
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div className="flex gap-2 bg-white p-1 border border-border rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'edit' ? 'bg-navy text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            <FileText size={16} />
            📝 Editar Conteúdo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'preview' ? 'bg-navy text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
          >
            <Eye size={16} />
            👁️ Visualização ao Vivo
          </button>
        </div>

        {/* Rapid Actions */}
        <div className="flex gap-3">
          <button
            type="button" onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-navy text-navy font-syne font-bold text-sm uppercase tracking-wide hover:bg-navy hover:text-white transition-all disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Preencher com IA
          </button>
        </div>
      </div>

      {activeTab === 'edit' ? (
        /* ─── EDIT TAB (High-Conversion 2-Column layout) ─── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Form Fields (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            <form className="space-y-8" onSubmit={e => e.preventDefault()}>
              
              {/* 1. Produto & SEO */}
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
                        {mlEnriching ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Search size={14} />
                        )}
                        {mlEnriching ? 'Buscando…' : 'Buscar no ML'}
                      </button>
                    </div>
                    {mlSource && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <ShoppingCart size={11} className="text-emerald-600" />
                        <span className="text-[11px] font-semibold text-emerald-700">
                          Dados reais via {mlSource} ✓
                        </span>
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
                      <Input 
                        value={form.priceNew} 
                        onChange={e => set('priceNew', e.target.value)} 
                        placeholder="R$ 249,00" 
                        className="pr-20"
                      />
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

              {/* 2. Imagem */}
              <Section title="2. Imagem do Produto" desc="Imagem de alta qualidade para o review.">
                <div className="flex gap-6 items-start">
                  {form.imageUrl && (
                    <div className="shrink-0 w-32 h-32 rounded-xl border border-border overflow-hidden bg-bg2 relative flex items-center justify-center">
                      <img src={form.imageUrl} alt="Preview" className="max-w-full max-h-full object-contain p-2" />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1.5">
                      <Label>URL da Imagem</Label>
                      <Input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://... ou /uploads/..." />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted text-xs font-medium">ou</span>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        disabled={uploadingImg}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-bg2 text-sm font-medium text-text-2 hover:bg-border transition-colors disabled:opacity-50">
                        {uploadingImg ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploadingImg ? 'Enviando…' : 'Fazer Upload'}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                  </div>
                </div>
              </Section>

              {/* 3. Hero & Notas */}
              <Section title="3. Hero & Notas" desc="Títulos condensados e notas de atributos para o radar.">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Linha 1 do Título</Label>
                    <Input value={form.hero.headlineLine1}
                      onChange={e => set('hero', { ...form.hero, headlineLine1: e.target.value })}
                      placeholder="SAMSUNG GALAXY FIT3" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Linha 2 do Título</Label>
                    <Input value={form.hero.headlineLine2}
                      onChange={e => set('hero', { ...form.hero, headlineLine2: e.target.value })}
                      placeholder="VALE A PENA EM 2026?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Destaque Azul</Label>
                    <Input value={form.hero.headlineEm}
                      onChange={e => set('hero', { ...form.hero, headlineEm: e.target.value })}
                      placeholder="GALAXY FIT3" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nota Geral (0–10)</Label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={10} step={0.1}
                        value={form.hero.overallScore}
                        onChange={e => set('hero', { ...form.hero, overallScore: parseFloat(e.target.value) })}
                        className="flex-1 accent-blue" />
                      <span className="font-bebas text-3xl text-blue w-12 text-center">{form.hero.overallScore.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Lead (Abertura)</Label>
                    <Textarea rows={3} value={form.hero.lead}
                      onChange={e => set('hero', { ...form.hero, lead: e.target.value })}
                      placeholder="2–3 frases de impacto..." />
                  </div>
                </div>
                <ScoreBarsField
                  values={form.hero.bars}
                  onChange={bars => set('hero', { ...form.hero, bars })}
                />
              </Section>

              {/* 4. Ficha Técnica */}
              <Section title="4. Ficha Técnica">
                <KVArrayField
                  label="Especificações"
                  values={form.specs}
                  onChange={specs => set('specs', specs)}
                />
              </Section>

              {/* 5. Seções do Artigo */}
              <Section title="5. Conteúdo das Seções" desc="Escreva os tópicos do seu artigo em Markdown.">
                <SectionsField
                  values={form.sections}
                  onChange={sections => set('sections', sections)}
                />
              </Section>

              {/* 6. Prós e Contras */}
              <Section title="6. Prós & Contras">
                <div className="grid grid-cols-2 gap-6">
                  <StringArrayField label="✔ Prós" values={form.pros} onChange={pros => set('pros', pros)} placeholder="Ex: Tela AMOLED" />
                  <StringArrayField label="✘ Contras" values={form.cons} onChange={cons => set('cons', cons)} placeholder="Ex: Sem NFC" />
                </div>
              </Section>

              {/* 7. Veredito */}
              <Section title="7. Veredito Final">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nota Final</Label>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={10} step={0.1}
                        value={form.verdict.score}
                        onChange={e => set('verdict', { ...form.verdict, score: parseFloat(e.target.value) })}
                        className="flex-1 accent-blue" />
                      <span className="font-bebas text-3xl text-blue w-12 text-center">{form.verdict.score.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Label de Categoria</Label>
                    <Input value={form.verdict.label}
                      onChange={e => set('verdict', { ...form.verdict, label: e.target.value })}
                      placeholder="EXCELENTE CUSTO-BENEFÍCIO" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Texto do Veredito</Label>
                    <Textarea rows={3} value={form.verdict.text}
                      onChange={e => set('verdict', { ...form.verdict, text: e.target.value })}
                      placeholder="Conclusão e recomendação definitiva..." />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Recomendação de Perfil</Label>
                    <Input value={form.verdict.note}
                      onChange={e => set('verdict', { ...form.verdict, note: e.target.value })}
                      placeholder="Recomendado para usuários..." />
                  </div>
                </div>
              </Section>

              {/* 8. FAQ */}
              <Section title="8. FAQ Otimizado para buscas (Google)">
                <FAQArrayField values={form.faq} onChange={faq => set('faq', faq)} />
              </Section>

              {/* 9. Configurações */}
              <Section title="9. Schema.org & Monetização" desc="Configurações de SEO Avançado.">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Estrelas (1–5)</Label>
                    <Input type="number" min={1} max={5} step={0.1}
                      value={form.schemaRating.ratingValue}
                      onChange={e => set('schemaRating', { ...form.schemaRating, ratingValue: parseFloat(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nº Avaliações Google</Label>
                    <Input type="number" min={10}
                      value={form.schemaRating.reviewCount}
                      onChange={e => set('schemaRating', { ...form.schemaRating, reviewCount: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Habilitar AdSense</Label>
                    <button
                      type="button"
                      onClick={() => set('adsEnabled', !form.adsEnabled)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all w-full justify-center ${form.adsEnabled ? 'bg-green-bg border-green/30 text-green' : 'bg-bg2 border-border text-text-muted'}`}
                    >
                      {form.adsEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      {form.adsEnabled ? 'Anúncios Ativos' : 'Sem Anúncios'}
                    </button>
                  </div>
                </div>
              </Section>
            </form>
          </div>

          {/* Sticky CMS & SEO Analyzer Right Column (1/3 width) */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
            
            {/* CMS Controles */}
            <div className="bg-white border border-border rounded-xl shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-syne font-bold text-sm text-text flex items-center gap-2">
                  <Settings size={16} className="text-navy" />
                  STATUS DE PUBLICAÇÃO
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${form.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {form.status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cta-gradient text-white font-syne font-bold text-xs uppercase tracking-wider shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Eye size={15} />}
                  Publicar / Atualizar Artigo
                </button>
                
                <button
                  type="button"
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-bg2 border border-border text-text-2 font-syne font-bold text-xs uppercase tracking-wider hover:bg-border transition-all"
                >
                  <Save size={15} />
                  Salvar Rascunho
                </button>
              </div>

              <div className="pt-2 text-center">
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Ao publicar, as alterações são imediatamente geradas estaticamente (SSG) e indexadas no <strong>sitemap.xml</strong>.
                </p>
              </div>
            </div>

            {/* SEO Live Analyzer Panel */}
            <div className="bg-white border border-border rounded-xl shadow-sm p-5 space-y-4">
              <div className="border-b border-border pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-syne font-bold text-sm text-text flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue" />
                    SEO LIVE ANALYZER
                  </h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${healthScore >= 80 ? 'bg-emerald-100 text-emerald-800' : healthScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-bg text-red'}`}>
                    {healthScore}%
                  </span>
                </div>
                {/* Score Progress Bar */}
                <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-3 bg-bg2 p-3 rounded-xl border border-border text-center">
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Palavras</p>
                  <p className={`font-bebas text-2xl mt-0.5 ${wordCount >= 800 ? 'text-green' : 'text-text'}`}>{wordCount}</p>
                  <span className="text-[9px] text-text-muted">{wordCount >= 800 ? '🟢 Ideal' : '🟡 Pouco texto'}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Leitura</p>
                  <p className="font-bebas text-2xl text-text mt-0.5">{form.meta.readingTime} min</p>
                  <span className="text-[9px] text-text-muted">Calculado</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">CHECKLIST DE RANQUEAMENTO</p>
                {seoChecks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    {check.pass ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : check.warning ? (
                      <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0 mt-0.5 bg-bg2" />
                    )}
                    <span className={check.pass ? 'text-text2' : 'text-text-muted'}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CRO Conversão & Copy checklist */}
            <div className="bg-white border border-border rounded-xl shadow-sm p-5 space-y-4">
              <div className="border-b border-border pb-3">
                <h3 className="font-syne font-bold text-sm text-text flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                  CRO (CONVERSÃO & AFILIADO)
                </h3>
              </div>

              <div className="space-y-2.5">
                {croChecks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    {check.pass ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0 mt-0.5 bg-bg2" />
                    )}
                    <span className={check.pass ? 'text-text2' : 'text-text-muted'}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50/50 border border-emerald-500/10 rounded-xl p-3.5 text-emerald-950 text-xs">
                <div className="flex gap-2 font-bold mb-1 items-center">
                  <Sparkles size={14} className="text-emerald-700" />
                  <span>Alta Conversão</span>
                </div>
                Certifique-se de que os Prós/Contras e a tabela comparativa estão atrativos para elevar as vendas via link de afiliado.
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ─── HIGH-FIDELITY LIVE PREVIEW TAB ─── */
        <div className="bg-[#f8fafc] border border-border rounded-2xl overflow-hidden p-2 sm:p-8 shadow-inner">
          <div className="bg-white rounded-xl shadow-lg max-w-5xl mx-auto border border-border overflow-hidden">
            
            {/* Header Mock */}
            <div className="bg-white border-b border-border py-4 px-6 flex justify-between items-center opacity-70 select-none">
              <Logo />
              <div className="flex gap-4 text-xs font-semibold text-text-muted">
                <span>Reviews</span>
                <span>Ficha Técnica</span>
                <span>Comparativo</span>
              </div>
            </div>

            {/* Breadcrumb Mock */}
            <div className="px-6 sm:px-12 pt-6">
              <nav className="breadcrumb select-none opacity-60 text-xs flex gap-2">
                <span>Home</span> › <span>Reviews</span> › <span>{form.product || 'Produto'}</span>
              </nav>
            </div>

            {/* Article Mock Hero */}
            <header className="article-hero px-6 sm:px-12 py-8">
              <div className="hero-meta flex gap-2 items-center mb-3">
                <span className="meta-tag">Review</span>
                <span className="meta-tag">{form.category || 'Geral'}</span>
                <span className="text-xs text-text-muted">• {form.meta.readingTime} min de leitura</span>
              </div>

              <h1>
                {renderWithHighlight(form.hero.headlineLine1 || 'NOME DO PRODUTO', form.hero.headlineEm)}<br/>
                {renderWithHighlight(form.hero.headlineLine2 || 'VALE A PENA EM 2026?', form.hero.headlineEm)}
              </h1>

              <p className="hero-lead text-lg mt-4 text-text2 leading-relaxed max-w-3xl">
                {form.hero.lead || 'Insira uma introdução para ver a visualização ao vivo do artigo.'}
              </p>

              <div className="mt-8 border-t border-b border-border py-6">
                <ScoreBox overallScore={form.hero.overallScore} bars={form.hero.bars} />
              </div>
            </header>

            {/* Article Content Layout Mock */}
            <div className="px-6 sm:px-12 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column Content */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Product Image Mock */}
                {form.imageUrl ? (
                  <div className="bg-bg2 p-6 rounded-2xl border border-border flex items-center justify-center">
                    <img src={form.imageUrl} alt={form.product} className="rounded-xl max-h-72 object-contain" />
                  </div>
                ) : (
                  <div className="bg-bg2 h-52 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-text-muted text-xs">
                    <Upload size={24} className="mb-2 opacity-40" />
                    <span>Nenhuma imagem de destaque vinculada</span>
                  </div>
                )}

                {/* Specs Table */}
                {form.specs.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-bebas text-3xl text-text tracking-wide border-b border-border pb-2">Ficha Técnica</h2>
                    <SpecsTable specs={form.specs} />
                  </div>
                )}

                {/* Sections Render */}
                {form.sections.length > 0 ? (
                  <div className="space-y-8">
                    {form.sections.map((sec, idx) => (
                      <div key={sec.id || idx} className="space-y-3">
                        <h2 className="font-bebas text-3xl text-text tracking-wide border-b border-border pb-2">
                          {sec.heading || 'Título do Tópico'}
                        </h2>
                        <div 
                          className="prose-review" 
                          dangerouslySetInnerHTML={{ __html: simpleMarkdown(sec.content) }} 
                        />

                        {idx === 0 && (
                          <div className="my-6">
                            <ArticleCTA
                              priceOld={form.priceOld}
                              priceNew={form.priceNew}
                              affiliateUrl={form.affiliateUrl}
                              product={form.product}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-bg2 p-8 rounded-2xl border border-dashed border-border text-center text-text-muted text-sm">
                    Clique em "Preencher com IA" para gerar os textos do review completos.
                  </div>
                )}

                {/* Compare Table */}
                {form.compareTable.rows && form.compareTable.rows.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-bebas text-3xl text-text tracking-wide border-b border-border pb-2">Comparativo Direto</h2>
                    <CompareTable table={form.compareTable} />
                  </div>
                )}

                {/* Pros and Cons */}
                {(form.pros.length > 0 || form.cons.length > 0) && (
                  <div className="space-y-4">
                    <h2 className="font-bebas text-3xl text-text tracking-wide border-b border-border pb-2">Prós & Contras</h2>
                    <ProsConsGrid pros={form.pros} cons={form.cons} />
                  </div>
                )}

                {/* Verdict Box */}
                <div className="space-y-4">
                  <h2 className="font-bebas text-3xl text-text tracking-wide border-b border-border pb-2">Conclusão Definitiva</h2>
                  <VerdictBox
                    score={form.verdict.score}
                    label={form.verdict.label}
                    text={form.verdict.text}
                    note={form.verdict.note}
                    affiliateUrl={form.affiliateUrl}
                    priceNew={form.priceNew}
                  />
                </div>

                {/* FAQ */}
                {form.faq.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-bebas text-3xl text-text tracking-wide border-b border-border pb-2">Perguntas Frequentes</h2>
                    <FAQAccordion faq={form.faq} />
                  </div>
                )}

              </div>

              {/* Right Column (Sidebar Mock) */}
              <div className="lg:col-span-1 space-y-6 select-none opacity-85">
                
                {/* TOC Mock */}
                <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
                  <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">Conteúdo do Review</p>
                  <div className="space-y-2">
                    {form.specs.length > 0 && <div className="text-xs font-semibold text-blue">⚙ Ficha Técnica</div>}
                    {form.sections.map((sec, idx) => (
                      <div key={idx} className="text-xs font-medium text-text-muted hover:text-text pl-2">
                        {sec.tocEmoji || '👉'} {sec.tocLabel || sec.heading}
                      </div>
                    ))}
                    {form.compareTable.rows && form.compareTable.rows.length > 0 && <div className="text-xs font-medium text-text-muted pl-2">📊 Comparativo</div>}
                    {(form.pros.length > 0 || form.cons.length > 0) && <div className="text-xs font-medium text-text-muted pl-2">⚖ Prós e Contras</div>}
                    <div className="text-xs font-medium text-text-muted pl-2">🏁 Veredicto</div>
                  </div>
                </div>

                {/* Sidebar CTA */}
                <SidebarCTA
                  priceOld={form.priceOld}
                  priceNew={form.priceNew}
                  affiliateUrl={form.affiliateUrl}
                  product={form.product}
                />
              </div>

            </div>

            {/* Footer Mock */}
            <div className="bg-bg2 border-t border-border p-6 text-center select-none opacity-50 text-[10px] text-text-muted">
              vetor.blog &copy; {new Date().getFullYear()}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
