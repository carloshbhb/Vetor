'use client';

export default function CookiePreferencesControl() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-cookie-preferences'))}
      style={{
        background: 'transparent',
        border: '1px solid var(--border, #d1d5db)',
        borderRadius: 8,
        color: 'inherit',
        cursor: 'pointer',
        font: 'inherit',
        padding: '8px 12px',
      }}
    >
      Abrir preferências de cookies
    </button>
  );
}
