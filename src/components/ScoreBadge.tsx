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
  const sizeMap = { sm: "inline-flex items-center text-sm px-2 py-0.5 rounded-medium", md: "inline-flex items-center text-base px-3 py-1 rounded-medium", lg: "inline-flex items-center text-xl px-4 py-1.5 rounded-medium" };

  return (
    <span
      className={`inline-flex items-center ${sizeMap[size]}`}
      style={{ background: "var(--blue-lt)", color: scoreColor(clamped), lineHeight: 1 }}
    >
      {clamped.toFixed(1)}
    </span>
  );
}
