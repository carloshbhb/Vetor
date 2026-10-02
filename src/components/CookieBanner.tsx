'use client';

import { useEffect, useState } from 'react';

const KEY = 'vetor_cookie_consent';

export function getCookieConsent(): 'all' | 'essential' | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(KEY);
  return v === 'all' || v === 'essential' ? v : null;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  function choose(v: 'all' | 'essential') {
    window.localStorage.setItem(KEY, v);
    window.dispatchEvent(new Event('cookie-consent-changed'));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: '#0b1220',
        color: '#e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
      }}
    >
      <p style={{ margin: 0, maxWidth: '70ch' }}>
        Usamos cookies para análise e melhoria da experiência. Você pode aceitar todos ou apenas os essenciais.
        Veja nossa <a href="/privacidade" style={{ color: '#fbbf24' }}>Política de Privacidade</a>.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => choose('essential')}
          style={{ background: 'transparent', border: '1px solid #334155', color: '#e5e7eb', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
        >
          Essenciais apenas
        </button>
        <button
          type="button"
          onClick={() => choose('all')}
          style={{ background: '#f59e0b', border: 'none', color: '#0b1220', padding: '8px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          Aceitar todos
        </button>
      </div>
    </div>
  );
}
