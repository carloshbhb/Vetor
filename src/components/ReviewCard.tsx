import Image from "next/image";
import Link from "next/link";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review }) {
  const hasAffiliate = !!review.affiliate_url;
  const score = review.verdict_score || review.hero_overall_score;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      className="group block bg-bg border border-border rounded-[20px] overflow-hidden transition-all duration-300 hover:border-amber/30 hover:-translate-y-1"
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
          <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-border rounded-md px-2.5 py-[3px] font-heading text-[0.64rem] font-bold tracking-wider uppercase text-muted">
            {review.category}
          </span>
          {score > 0 && (
            <span className="absolute top-3 right-3 bg-amber text-black font-display text-1.3rem rounded-lg px-2.5 py-0.5" style={{ lineHeight: 1.3 }}>
              {score.toFixed(1)}
            </span>
          )}
        </div>
      )}
      <div className="p-5">
        <h3 className="font-heading font-extrabold text-[0.95rem] text-text mb-1.5 leading-snug group-hover:text-amber transition-colors">
          {review.product}
        </h3>
        <p className="text-[0.82rem] text-muted font-light leading-relaxed mb-3.5 line-clamp-2">
          {review.hero_lead}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-border font-heading text-[0.7rem] font-semibold text-muted">
          <span>{review.category}</span>
          {score > 0 && (
            <span className={score >= 8 ? "text-green" : score >= 5 ? "text-amber" : "text-red"}>
              {score >= 8 ? "✓ Recomendado" : score >= 5 ? "Razoável" : "Não recomendado"}
            </span>
          )}
        </div>
      </div>
      {hasAffiliate && (
        <div className="px-5 pb-5">
          <span className="block w-full text-center bg-amber text-black text-sm font-heading font-extrabold py-3 rounded-xl transition-all group-hover:bg-white">
            Ver Menor Preço →
          </span>
        </div>
      )}
    </Link>
  );
}