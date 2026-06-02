'use client';

import { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

// ─── Generic string array field ───────────────────────────────────────────────
interface StringArrayProps {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  hint?: string;
}

export function StringArrayField({ label, values, onChange, placeholder, hint }: StringArrayProps) {
  const add    = () => onChange([...values, '']);
  const update = (i: number, v: string) => onChange(values.map((x, idx) => idx === i ? v : x));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-syne font-bold text-xs uppercase tracking-widest text-text-2">{label}</label>
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-blue hover:text-blue-dark font-medium transition-colors">
          <PlusCircle size={13} /> Adicionar
        </button>
      </div>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={v}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
          />
          <button type="button" onClick={() => remove(i)} className="p-2.5 rounded-xl bg-red-bg border border-red/20 text-red hover:bg-red/20 transition-colors shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {values.length === 0 && (
        <p className="text-xs text-text-muted italic">Nenhum item. Clique em "Adicionar".</p>
      )}
    </div>
  );
}

// ─── Key-Value array field (specs, etc.) ─────────────────────────────────────
interface KVItem { label: string; value: string; highlight?: boolean }
interface KVArrayProps {
  label: string;
  values: KVItem[];
  onChange: (v: KVItem[]) => void;
}

export function KVArrayField({ label, values, onChange }: KVArrayProps) {
  const add    = () => onChange([...values, { label: '', value: '', highlight: false }]);
  const update = (i: number, patch: Partial<KVItem>) =>
    onChange(values.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-syne font-bold text-xs uppercase tracking-widest text-text-2">{label}</label>
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-blue hover:text-blue-dark font-medium transition-colors">
          <PlusCircle size={13} /> Adicionar linha
        </button>
      </div>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={v.label}
            onChange={e => update(i, { label: e.target.value })}
            placeholder="Atributo (ex: Tela)"
            className="w-2/5 bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
          />
          <input
            value={v.value}
            onChange={e => update(i, { value: e.target.value })}
            placeholder="Valor (ex: AMOLED 1.6″)"
            className="flex-1 bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
          />
          <label className="flex items-center gap-1 text-xs text-text-muted shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={!!v.highlight}
              onChange={e => update(i, { highlight: e.target.checked })}
              className="accent-blue"
            />
            ★
          </label>
          <button type="button" onClick={() => remove(i)} className="p-2.5 rounded-xl bg-red-bg border border-red/20 text-red hover:bg-red/20 transition-colors shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── FAQ array field ──────────────────────────────────────────────────────────
interface FAQItem { question: string; answer: string }
interface FAQArrayProps {
  values: FAQItem[];
  onChange: (v: FAQItem[]) => void;
}

export function FAQArrayField({ values, onChange }: FAQArrayProps) {
  const add    = () => onChange([...values, { question: '', answer: '' }]);
  const update = (i: number, patch: Partial<FAQItem>) =>
    onChange(values.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-syne font-bold text-xs uppercase tracking-widest text-text-2">FAQ</label>
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-blue hover:text-blue-dark font-medium transition-colors">
          <PlusCircle size={13} /> Adicionar pergunta
        </button>
      </div>
      {values.map((v, i) => (
        <div key={i} className="bg-bg2 border border-border rounded-xl p-4 space-y-2 relative">
          <button type="button" onClick={() => remove(i)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-bg border border-red/20 text-red hover:bg-red/20 transition-colors">
            <Trash2 size={12} />
          </button>
          <input
            value={v.question}
            onChange={e => update(i, { question: e.target.value })}
            placeholder="Pergunta"
            className="w-full bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
          />
          <textarea
            value={v.answer}
            onChange={e => update(i, { answer: e.target.value })}
            placeholder="Resposta (Markdown suportado)"
            rows={3}
            className="w-full bg-white border-[1.5px] border-border rounded-xl px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all resize-y"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Score bars field ─────────────────────────────────────────────────────────
interface ScoreBar { label: string; value: number; pct: number }
interface ScoreBarsProps {
  values: ScoreBar[];
  onChange: (v: ScoreBar[]) => void;
}

export function ScoreBarsField({ values, onChange }: ScoreBarsProps) {
  const update = (i: number, val: number) =>
    onChange(values.map((x, idx) => idx === i ? { ...x, value: val, pct: val * 10 } : x));

  return (
    <div className="space-y-3">
      <label className="font-syne font-bold text-xs uppercase tracking-widest text-text-2">Critérios de Avaliação</label>
      {values.map((bar, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-20 text-sm text-text-2 font-medium shrink-0">{bar.label}</span>
          <input
            type="range" min={0} max={10} step={0.1}
            value={bar.value}
            onChange={e => update(i, parseFloat(e.target.value))}
            className="flex-1 accent-blue"
          />
          <span className="w-8 text-sm font-syne font-bold text-blue text-right">{bar.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section editor (Markdown) ────────────────────────────────────────────────
interface SectionItem { id: string; heading: string; tocLabel: string; tocEmoji: string; content: string }
interface SectionsProps {
  values: SectionItem[];
  onChange: (v: SectionItem[]) => void;
}

export function SectionsField({ values, onChange }: SectionsProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const add    = () => onChange([...values, { id: '', heading: '', tocLabel: '', tocEmoji: '📝', content: '' }]);
  const update = (i: number, patch: Partial<SectionItem>) =>
    onChange(values.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-syne font-bold text-xs uppercase tracking-widest text-text-2">Seções do Artigo</label>
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-blue hover:text-blue-dark font-medium transition-colors">
          <PlusCircle size={13} /> Adicionar seção
        </button>
      </div>
      {values.map((sec, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 bg-bg2 cursor-pointer hover:bg-border/50 transition-colors"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            <input
              value={sec.tocEmoji}
              onChange={e => { e.stopPropagation(); update(i, { tocEmoji: e.target.value }); }}
              onClick={e => e.stopPropagation()}
              placeholder="🔵"
              className="w-10 bg-white border border-border rounded-lg px-2 py-1 text-sm text-center outline-none"
            />
            <input
              value={sec.heading}
              onChange={e => { e.stopPropagation(); update(i, { heading: e.target.value }); }}
              onClick={e => e.stopPropagation()}
              placeholder="Título da Seção (H2)"
              className="flex-1 bg-white border border-border rounded-xl px-3 py-1.5 text-sm text-text outline-none focus:border-blue transition-all"
            />
            <button type="button" onClick={e => { e.stopPropagation(); remove(i); }} className="p-1.5 rounded-lg bg-red-bg border border-red/20 text-red hover:bg-red/20 transition-colors shrink-0">
              <Trash2 size={12} />
            </button>
          </div>
          {openIdx === i && (
            <div className="p-4 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted font-medium block mb-1">Slug (ID)</label>
                  <input
                    value={sec.id}
                    onChange={e => update(i, { id: e.target.value })}
                    placeholder="tela-display"
                    className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-medium block mb-1">Label TOC</label>
                  <input
                    value={sec.tocLabel}
                    onChange={e => update(i, { tocLabel: e.target.value })}
                    placeholder="Tela"
                    className="w-full bg-bg2 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted font-medium block mb-1">Conteúdo (Markdown)</label>
                <textarea
                  value={sec.content}
                  onChange={e => update(i, { content: e.target.value })}
                  placeholder="Escreva o conteúdo em Markdown..."
                  rows={10}
                  className="w-full bg-bg2 border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-blue transition-all resize-y font-mono"
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
