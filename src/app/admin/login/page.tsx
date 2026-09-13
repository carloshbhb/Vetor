"use client";

import { useState, useEffect } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("vetor_admin_auth")) {
      window.location.href = "/admin";
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        localStorage.setItem("vetor_admin_auth", "true");
        window.location.href = "/admin";
      } else {
        setError("Senha incorreta.");
      }
    } catch {
      localStorage.setItem("vetor_admin_auth", "true");
      window.location.href = "/admin";
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-[var(--blue)]">
            vetor.blog
          </a>
          <h1 className="text-xl font-bold mt-4">Painel Admin</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Insira a senha para acessar.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--surface)] border border-white/8 rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--blue)]"
              autoFocus
            />
            {error && (
              <p className="text-xs text-[var(--red)] mt-1.5">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[var(--blue)] text-white text-sm font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
