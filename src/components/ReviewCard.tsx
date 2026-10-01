import SafeImage from "./SafeImage";
import Link from "next/link";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review; featured?: boolean }) {
  const score = review.verdict_score || review.hero_overall_score;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      className="home-card"
      data-hover={JSON.stringify({ "border-color": "#cbd3dc" })}
      data-hover-base={JSON.stringify({ "border-color": "var(--line)" })}
    >
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
