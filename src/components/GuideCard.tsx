import Link from "next/link";
import type { Review } from "@/lib/types";
import { formatScoreBR } from "@/lib/images";

export default function GuideCard({ guia, index }: { guia: Review; index: number }) {
  const score = formatScoreBR(guia.verdict_score);
  return (
    <Link className="home-guide" href={`/reviews/${guia.slug}/`}>
      <span className="home-guide-num">GUIA 0{index + 1}</span>
      <h3>{guia.product}</h3>
      <p>
        {score ? `Nota ${score}/10 · ` : ""}
        {guia.category}
      </p>
    </Link>
  );
}
