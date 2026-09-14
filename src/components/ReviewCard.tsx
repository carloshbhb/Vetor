import Image from "next/image";
import Link from "next/link";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review }) {
  const score = review.verdict_score || review.hero_overall_score;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      className="group block bg-bg border border-border rounded-[10px] overflow-hidden transition-all duration-300 hover:border-blue/30 hover:-translate-y-1"
    >
      {review.image_url && (
        <div className="relative h-[180px] overflow-hidden">
          <Image
            src={review.image_url}
            alt={review.product}
            fill
            className="object-cover transition-transform duration-400 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-border rounded px-2.5 py-[3px] font-heading text-[0.64rem] font-bold tracking-wider uppercase text-body">
            {review.category}
          </span>
          {score > 0 && (
            <span className="absolute top-3 right-3 bg-blue text-white font-display rounded-lg px-2.5 py-0.5" style={{ fontSize: "1.3rem", lineHeight: 1.3 }}>
              {score.toFixed(1)}
            </span>
          )}
        </div>
      )}
      <div className="p-5">
        <h3 className="font-heading font-extrabold text-[0.95rem] text-ink mb-1.5 leading-snug group-hover:text-blue transition-colors">
          {review.product}
        </h3>
        <p className="text-[0.82rem] text-muted font-light leading-[1.6] mb-3.5 line-clamp-2">
          {review.hero_lead}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border font-heading text-[0.7rem] font-semibold text-muted">
          <span>{review.category}</span>
          {score >= 8 ? (
            <span className="text-green">✓ Recomendado</span>
          ) : score >= 5 ? (
            <span className="text-amber">Razoável</span>
          ) : (
            <span className="text-red">Não Recomendado</span>
          )}
        </div>
      </div>
    </Link>
  );
}
