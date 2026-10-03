"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Reviews", href: "/admin/reviews", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Artigos Virais", href: "/admin/viral", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Vídeos", href: "/admin/videos", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 001.555-.832l3.197-2.132a1 1 0 000-1.664z" },
  { label: "Gerar Conteúdo", href: "/admin/generate", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
  { label: "Links de Afiliado", href: "/admin/afiliados", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 005.656-5.656l-1.1 1.1" },
  { label: "Mercado Livre", href: "/admin/ml", icon: "M6 7h12M6 12h12M6 17h7M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" },
  { label: "Fila de Afiliados", href: "/admin/ml/fila", icon: "M5 5h14M5 12h14M5 19h14" },
  { label: "Oportunidades SEO", href: "/admin/oportunidades", icon: "M4 19V5m0 14h16M8 16l3-4 3 2 5-7" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPathname = pathname?.replace(/\/+$/, "") || "";
  const isLoginPage = normalizedPathname === "/admin/login";

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(false);
      setChecking(false);
      return;
    }

    let active = true;
    setChecking(true);

    fetch("/api/admin/auth", { cache: "no-store" })
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setAuthorized(true);
        } else {
          window.location.replace("/admin/login/");
        }
      })
      .catch(() => {
        if (active) window.location.replace("/admin/login/");
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-[var(--muted)]">Carregando...</div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-[var(--surface)] min-h-screen">
        <div className="p-5 border-b border-border">
          <a href="/admin" className="text-lg font-display text-[var(--text)]">vetor.blog</a>
          <p className="text-xs text-[var(--muted)] mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/admin" ? normalizedPathname === "/admin" : normalizedPathname.startsWith(item.href);
            return (
              <a key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? "bg-[var(--amber-bg)] text-[var(--amber)] font-medium" : "text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] transition-colors">← Voltar ao site</a>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden border-b border-border bg-[var(--surface)] px-4 py-3 flex items-center justify-between">
          <a href="/admin" className="text-lg font-display text-[var(--text)]">vetor.blog</a>
          <div className="flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className={`text-xs px-2 py-1 rounded whitespace-nowrap ${normalizedPathname === item.href ? "bg-[var(--amber-bg)] text-[var(--amber)]" : "text-[var(--muted)]"}`}>{item.label}</a>
            ))}
          </div>
        </div>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
