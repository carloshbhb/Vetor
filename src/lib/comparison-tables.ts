export interface ComparisonSummaryRow {
  label: string;
  values: string[];
  winIdx: number;
}

export interface ComparisonSummaryEntry {
  review:
    | {
        price_new?: string | null;
        verdict_score?: number | string | null;
      }
    | null;
}

/**
 * Summarizes prices and scores without dropping products that do not yet have
 * a linked editorial review. A winner is only highlighted when at least two
 * products have a real, positive score to compare.
 */
export function buildComparisonSummaryRows(
  entries: ComparisonSummaryEntry[],
): ComparisonSummaryRow[] {
  const availableReviews = entries.filter((entry) => entry.review);
  if (availableReviews.length === 0) return [];

  const scores = entries.map((entry) => {
    const score = Number(entry.review?.verdict_score ?? 0);
    return Number.isFinite(score) && score > 0 ? score : 0;
  });
  const scoredCount = scores.filter((score) => score > 0).length;
  const bestScore = Math.max(0, ...scores);
  const winIdx =
    scoredCount >= 2 && bestScore > 0
      ? scores.findIndex((score) => score === bestScore)
      : -1;

  return [
    {
      label: "Preço",
      values: entries.map((entry) => entry.review?.price_new?.trim() || "—"),
      winIdx: -1,
    },
    {
      label: "Nota Vetor",
      values: scores.map((score) => (score > 0 ? String(score).replace(".", ",") : "—")),
      winIdx,
    },
  ];
}
