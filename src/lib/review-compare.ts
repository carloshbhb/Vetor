export interface NormalizedReviewCompareRow {
  feature: string;
  values: string[];
  winner: number;
}

type TextCleaner = (value: unknown) => string;

/**
 * Supports both legacy comparison rows ([feature, value1, value2]) and the
 * object format ({ feature, values, winner }) used by newer review records.
 */
export function normalizeReviewCompareRows(
  input: unknown,
  cleanText: TextCleaner,
): NormalizedReviewCompareRow[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((raw): NormalizedReviewCompareRow[] => {
    if (Array.isArray(raw)) {
      const [rawFeature, ...rawValues] = raw as unknown[];
      return [{
        feature: cleanText(String(rawFeature ?? "")).trim(),
        values: rawValues.map((value) => cleanText(String(value ?? "")).trim()),
        winner: -1,
      }];
    }

    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const values = Array.isArray(row.values)
      ? row.values.map((value) => cleanText(String(value ?? "")).trim())
      : [];
    const winner =
      Number.isInteger(row.winner) &&
      Number(row.winner) >= 0 &&
      Number(row.winner) < values.length
        ? Number(row.winner)
        : -1;

    return [{
      feature: cleanText(String(row.feature ?? "")).trim(),
      values,
      winner,
    }];
  });
}
