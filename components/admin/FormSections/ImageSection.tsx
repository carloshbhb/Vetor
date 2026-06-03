'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Label, Input, Section } from '../FormUI';

interface ImageSectionProps {
  form: any;
  set: <K extends keyof any>(key: K, value: any) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ImageSection({ form, set, showToast }: ImageSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

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

  return (
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
  );
}
