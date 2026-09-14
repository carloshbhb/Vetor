"use client";

import { useState, useMemo } from "react";

interface ComparisonTableProps {
  headers: string[];
  rows: Array<{
    product: string;
    values: string[];
    highlight?: boolean;
  }>;
}

export default function ComparisonTable({ headers, rows }: ComparisonTableProps) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(colIdx);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (sortCol === null) return rows;
    const sorted = [...rows].sort((a, b) => {
      const aVal = a.values[sortCol] || "";
      const bVal = b.values[sortCol] || "";
      const aNum = parseFloat(aVal.replace(/[^0-9.,]/g, "").replace(",", "."));
      const bNum = parseFloat(bVal.replace(/[^0-9.,]/g, "").replace(",", "."));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      return sortDir === "asc"
        ? aVal.localeCompare(bVal, "pt-BR")
        : bVal.localeCompare(aVal, "pt-BR");
    });
    return sorted;
  }, [rows, sortCol, sortDir]);

  return (
    <div className="table-responsive">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--surface2)]">
            <th className="text-left px-4 py-3 font-semibold text-[var(--text)] border-b-2 border-border sticky left-0 bg-[var(--surface2)] z-10">
              Produto
            </th>
            {headers.map((header, i) => (
              <th
                key={i}
                className="text-left px-4 py-3 font-semibold text-[var(--text)] border-b-2 border-border cursor-pointer hover:text-[var(--amber)] transition-colors select-none whitespace-nowrap"
                onClick={() => handleSort(i)}
              >
                <span className="flex items-center gap-1.5">
                  {header}
                  {sortCol === i && (
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${
                        sortDir === "desc" ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={`border-b border-border transition-colors ${
                row.highlight ? "bg-[var(--blue)]/5" : "hover:bg-[var(--surface)]"
              }`}
            >
              <td className="px-4 py-3 font-medium text-[var(--text)] sticky left-0 bg-[var(--surface)] z-10">
                <span className="flex items-center gap-2">
                  {row.highlight && (
                    <span className="w-2 h-2 rounded-full bg-[var(--blue)] flex-shrink-0" />
                  )}
                  {row.product}
                </span>
              </td>
              {row.values.map((val, valIdx) => (
                <td
                  key={valIdx}
                  className={`px-4 py-3 whitespace-nowrap ${
                    row.highlight ? "text-[var(--blue)] font-medium" : "text-[var(--muted)]"
                  }`}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
