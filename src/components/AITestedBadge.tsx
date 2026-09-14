import { useId } from "react";

type AITestedBadgeProps = {
  variant?: "full" | "compact";
  reviewedAt?: string;
  className?: string;
};

export function AITestedBadge({
  variant = "compact",
  reviewedAt,
  className = "",
}: AITestedBadgeProps) {
  const tooltipId = useId();
  const date = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-1 text-xs text-ink-soft bg-paper-raised ${className}`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6 3v3l2 1.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </svg>
      {variant === "compact" ? (
        <span>Testado por IA</span>
      ) : (
        <span id={tooltipId}>
          Este teste foi conduzido por um modelo de linguagem a partir de
          especificações do fabricante, reviews públicas e dados de preço.
          {date && ` Atualizado em ${date}.`}
        </span>
      )}
    </span>
  );
}