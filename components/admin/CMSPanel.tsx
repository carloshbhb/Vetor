'use client';

import { Eye, Save, Loader2 } from 'lucide-react';

interface CMSPanelProps {
  form: any;
  saving: boolean;
  handleSave: (status: 'draft' | 'published') => void;
}

export default function CMSPanel({ form, saving, handleSave }: CMSPanelProps) {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-syne font-bold text-sm text-text flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
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
  );
}
