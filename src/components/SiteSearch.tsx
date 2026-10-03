'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function SiteSearch({
  compact = false,
  initialValue = '',
}: {
  compact?: boolean;
  initialValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim().slice(0, 100);
    if (typeof window !== 'undefined' && typeof window.gtag === 'function' && query) {
      window.gtag('event', 'site_search', { search_term: query });
    }
    router.push(query ? `/busca/?q=${encodeURIComponent(query)}` : '/busca/');
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Pesquisar no Vetor.blog"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: compact ? '100%' : 'min(330px, 28vw)',
      }}
    >
      <label htmlFor="site-search" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        Pesquisar no site
      </label>
      <input
        id="site-search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Buscar produto ou categoria"
        autoComplete="off"
        style={{
          minWidth: 0,
          width: '100%',
          border: '1px solid rgba(255,255,255,.16)',
          background: 'rgba(255,255,255,.08)',
          color: '#fff',
          borderRadius: 10,
          padding: '9px 11px',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        aria-label="Pesquisar"
        style={{
          flex: 'none',
          border: 0,
          borderRadius: 10,
          padding: '9px 12px',
          background: 'var(--brand)',
          color: '#111',
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        Buscar
      </button>
    </form>
  );
}
