import SafeImage from "./SafeImage";
import { safeImageSrc } from "@/lib/images";
import Link from "next/link";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review; featured?: boolean }) {
  const rawScore = review.verdict_score || review.hero_overall_score;
  const score = Number.isFinite(rawScore) ? Math.min(10, Math.max(0, rawScore)) : 0;

  return (
    <Link
      href={`/reviews/${review.slug}/`}
      className="home-card"
      data-hover={JSON.stringify({ "border-color": "#cbd3dc" })}
      data-hover-base={JSON.stringify({ "border-color": "var(--line)" })}
    >
      <SafeImage
        src={safeImageSrc(review.image_url)}
        width={600}
        height={400}
        alt={review.product + ": foto do produto analisado"}
        sizes="(max-width: 768px) 100vw, 33vw"
        loading="lazy"
        className="review-card-img"
      />
      <span className="home-card-label">{review.category}</span>
      <h3>{review.product}</h3>
      <p>{review.hero_lead || review.meta_description}</p>
      <div className="home-card-bottom">
        {score > 0 ? `Nota ${String(score).replace(".", ",")}/10` : "Review completo"}
        <span>Ler review →</span>
      </div>
    </Link>
  );
}
