'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Fechar sidebar ao navegar
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Fechar sidebar com ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-bg2">
      {/* Hamburger — apenas mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="admin-hamburger"
        aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay — apenas mobile, quando sidebar aberta */}
      {sidebarOpen && (
        <div
          className="admin-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={sidebarOpen} />

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
