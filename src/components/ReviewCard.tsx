import Image from "next/image";
import ScoreBadge from "./ScoreBadge";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <a
      href={`/reviews/${review.slug}`}
      className="group block bg-[var(--surface)] rounded-2xl overflow-hidden border border-white/5 hover:border-[var(--blue)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(66,133,244,0.12)]"
    >
      {review.image_url && (
        <div className="relative w-full h-48 bg-[var(--surface2)]">
          <Image
            src={review.image_url}
            alt={review.product}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold leading-tight truncate group-hover:text-[var(--blue)] transition-colors">
              {review.product}
            </h2>
          </div>
          <ScoreBadge score={review.verdict_score} size="sm" />
        </div>

        <p className="text-sm text-[var(--muted)] line-clamp-2 mb-4 leading-relaxed">
          {review.hero_lead}
        </p>

        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block bg-[var(--surface3)] text-xs text-[var(--muted)] px-2.5 py-1 rounded-full">
            {review.category}
          </span>
          <span className="text-[var(--green)] font-bold text-sm">
            {review.price_new}
          </span>
        </div>

        {review.pros && review.pros.length > 0 && (
          <div className="border-t border-white/5 pt-3 mt-3">
            <div className="grid grid-cols-2 gap-1">
              {review.pros.slice(0, 2).map((pro, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-[var(--green)]"
                >
                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="truncate">{pro}</span>
                </div>
              ))}
            </div>
            {review.cons && review.cons.length > 0 && (
              <div className="grid grid-cols-2 gap-1 mt-1.5">
                {review.cons.slice(0, 2).map((con, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-[var(--red)]"
                  >
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="truncate">{con}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </a>
  );
}
