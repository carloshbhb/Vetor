"use client";

import { useState } from "react";

interface SearchFiltersProps {
  categories: Array<{ name: string; count: number }>;
  onFilterChange: (filters: {
    search: string;
    category: string;
    minPrice: number;
    maxPrice: number;
    minScore: number;
  }) => void;
}

export default function SearchFilters({
  categories,
  onFilterChange,
}: SearchFiltersProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [minScore, setMinScore] = useState(0);

  const emit = (
    s?: string,
    c?: string,
    pMin?: number,
    pMax?: number,
    sc?: number
  ) => {
    onFilterChange({
      search: s ?? search,
      category: c ?? category,
      minPrice: pMin ?? minPrice,
      maxPrice: pMax ?? maxPrice,
      minScore: sc ?? minScore,
    });
  };

  const clearAll = () => {
    setSearch("");
    setCategory("");
    setMinPrice(0);
    setMaxPrice(10000);
    setMinScore(0);
    onFilterChange({
      search: "",
      category: "",
      minPrice: 0,
      maxPrice: 10000,
      minScore: 0,
    });
  };

  const hasActiveFilters =
    search || category || minPrice > 0 || maxPrice < 10000 || minScore > 0;

  return (
    <div className="space-y-4">
<div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Buscar reviews..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            emit(e.target.value);
          }}
          className="w-full bg-[var(--surface)] border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)] transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
              onClick={() => {
                setCategory("");
                emit("", "");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !category
                  ? "bg-[var(--amber)] text-black border-[var(--amber)]"
                  : "bg-[var(--surface)] text-[var(--muted)] border-border hover:border-[var(--amber)]/50"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  setCategory(cat.name);
                  emit(undefined, cat.name);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === cat.name
                    ? "bg-[var(--amber)] text-black border-[var(--amber)]"
                    : "bg-[var(--surface)] text-[var(--muted)] border-border hover:border-[var(--amber)]/50"
                }`}
              >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">
            Preço mínimo: R${minPrice}
          </label>
<input
          type="range"
          min={0}
          max={10000}
          step={50}
          value={minPrice}
          onChange={(e) => {
            const val = Number(e.target.value);
            setMinPrice(val);
            emit(undefined, undefined, val);
          }}
          className="w-full accent-[var(--amber)]"
        />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">
            Preço máximo: R${maxPrice}
          </label>
<input
          type="range"
          min={0}
          max={10000}
          step={50}
          value={maxPrice}
          onChange={(e) => {
            const val = Number(e.target.value);
            setMaxPrice(val);
            emit(undefined, undefined, undefined, val);
          }}
          className="w-full accent-[var(--amber)]"
        />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">
            Nota mínima: {minScore > 0 ? minScore.toFixed(1) : "Todas"}
          </label>
<input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={minScore}
          onChange={(e) => {
            const val = Number(e.target.value);
            setMinScore(val);
            emit(undefined, undefined, undefined, undefined, val);
          }}
          className="w-full accent-[var(--amber)]"
        />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Filtros ativos:</span>
          {search && (
            <span className="inline-flex items-center gap-1 bg-[var(--surface2)] text-xs text-[var(--text)] px-2 py-1 rounded-full">
              &quot;{search}&quot;
              <button
                onClick={() => {
                  setSearch("");
                  emit("");
                }}
                className="ml-0.5 text-[var(--muted)] hover:text-[var(--text)]"
              >
                ×
              </button>
            </span>
          )}
          {category && (
            <span className="inline-flex items-center gap-1 bg-[var(--surface2)] text-xs text-[var(--text)] px-2 py-1 rounded-full">
              {category}
              <button
                onClick={() => {
                  setCategory("");
                  emit(undefined, "");
                }}
                className="ml-0.5 text-[var(--muted)] hover:text-[var(--text)]"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={clearAll}
            className="text-xs text-[var(--blue)] hover:underline"
          >
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  );
}
