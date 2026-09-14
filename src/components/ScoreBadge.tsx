type ScoreBadgeProps = {
  score: number;
  size?: "sm" | "md" | "lg";
};

function scoreColor(score: number) {
  if (score >= 8) return "var(--green)";
  if (score >= 5) return "var(--amber)";
  return "var(--red)";
}

export default function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const sizeMap = { sm: "text-sm px-2 py-0.5", md: "text-base px-3 py-1", lg: "text-xl px-4 py-1.5" };

  return (
    <span
      className={`inline-flex items-center font-display rounded-lg ${sizeMap[size]}`}
      style={{ background: "var(--amber-bg)", color: scoreColor(clamped), lineHeight: 1 }}
    >
      {clamped.toFixed(1)}
    </span>
  );
}