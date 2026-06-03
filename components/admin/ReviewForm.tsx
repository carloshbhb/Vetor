'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, Loader2, Eye, EyeOff, FileText } from 'lucide-react';
import type { ReviewData } from '@/lib/types';

// Sub-sections
import ProductSection from './FormSections/ProductSection';
import ImageSection from './FormSections/ImageSection';
import HeroSection from './FormSections/HeroSection';
import SpecsSection from './FormSections/SpecsSection';
import SectionsSection from './FormSections/SectionsSection';
import ProsConsSection from './FormSections/ProsConsSection';
import VerdictSection from './FormSections/VerdictSection';
import FAQSection from './FormSections/FAQSection';
import SchemaSection from './FormSections/SchemaSection';

// Panels
import CMSPanel from './CMSPanel';
import SEOPanel from './SEOPanel';
import CROPanel from './CROPanel';
import PreviewTab from './PreviewTab';

const DEFAULT_BARS = [
  { label: 'Tela',    value: 8.0, pct: 80 },
  { label: 'Bateria', value: 8.0, pct: 80 },
  { label: 'Saúde',  value: 8.0, pct: 80 },
  { label: 'Custo',  value: 8.0, pct: 80 },
  { label: 'Design', value: 8.0, pct: 80 },
];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\breview\b/gi, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/-+/g, '-');
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

export default function ReviewForm({ initial, reviewId }: { initial?: ReviewData; reviewId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial ? { ...initial } : emptyForm());
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

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
          meta: { ...f.meta, keywords: keywordsParam || f.meta.keywords },
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

  // ─── AI pre-fill ───────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!form.product) { showToast('Preencha o nome do produto primeiro.', 'error'); return; }
    setGenerating(true);

    let currentPriceNew = form.priceNew;
    let currentPriceOld = form.priceOld;
    let syncedSuccess = false;

    if (form.affiliateUrl) {
      try {
        const syncRes = await fetch('/api/sync-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ affiliateUrl: form.affiliateUrl, product: form.product }),
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Form Fields (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            <form className="space-y-8" onSubmit={e => e.preventDefault()}>
              <ProductSection form={form} set={set as any} setForm={setForm} slugify={slugify} isTitleOk={isTitleOk} isDescOk={isDescOk} showToast={showToast} />
              <ImageSection form={form} set={set as any} showToast={showToast} />
              <HeroSection form={form} set={set as any} />
              <SpecsSection form={form} set={set as any} />
              <SectionsSection form={form} set={set as any} />
              <ProsConsSection form={form} set={set as any} />
              <VerdictSection form={form} set={set as any} />
              <FAQSection form={form} set={set as any} />
              <SchemaSection form={form} set={set as any} />
            </form>
          </div>

          {/* Sticky CMS & SEO Analyzer Right Column (1/3 width) */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
            <CMSPanel form={form} saving={saving} handleSave={handleSave} />
            <SEOPanel seoChecks={seoChecks} healthScore={healthScore} wordCount={wordCount} readingTime={form.meta.readingTime} />
            <CROPanel croChecks={croChecks} />
          </div>

        </div>
      ) : (
        <PreviewTab form={form} />
      )}

    </div>
  );
}
