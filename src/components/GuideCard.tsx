import Link from "next/link";
import type { Review } from "@/lib/types";

export default function GuideCard({ guia, index }: { guia: Review; index: number }) {
  return (
    <Link className="home-guide" href={`/reviews/${guia.slug}/`}>
      <span className="home-guide-num">GUIA 0{index + 1}</span>
      <h3>{guia.product}</h3>
      <p>
        Nota {Number(guia.verdict_score).toFixed(1).replace(".", ",")}/10 · {guia.category}
      </p>
    </Link>
  );
}
