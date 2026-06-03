'use client';

import Logo from '@/components/Logo';
import ScoreBox from '@/components/review/ScoreBox';
import ArticleCTA from '@/components/review/ArticleCTA';
import SidebarCTA from '@/components/review/SidebarCTA';
import SpecsTable from '@/components/review/SpecsTable';
import CompareTable from '@/components/review/CompareTable';
import ProsConsGrid from '@/components/review/ProsConsGrid';
import FAQAccordion from '@/components/review/FAQAccordion';
import VerdictBox from '@/components/review/VerdictBox';

function simpleMarkdown(text: string): string {
  if (!text) return '';
  let html = text;
  html = html.replace(/💡\s*([^\n]+)/g, '<div class="highlight-box"><p>💡 $1</p></div>');
  html = html.replace(/^###\s*([^\n]+)/gm, '<h3 class="text-xl font-bold mt-6 mb-3 text-navy">$1</h3>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^\*\s*([^\n]+)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ul class="list-disc pl-5 my-3">$1</ul>');
  html = html.split('\n\n').map(p => {
    if (p.trim().startsWith('<div') || p.trim().startsWith('<h3') || p.trim().startsWith('<ul')) return p;
    return `<p class="mb-4 leading-relaxed text-text2">${p}</p>`;
  }).join('');
  return html;
}

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

interface PreviewTabProps {
  form: any;
}

export default function PreviewTab({ form }: PreviewTabProps) {
  return (
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2 opacity-40">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
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
                {form.sections.map((sec: any, idx: number) => (
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
                {form.sections.map((sec: any, idx: number) => (
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
  );
}
