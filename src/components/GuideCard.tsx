import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { safeImageSrc } from "@/lib/images";
import type { Review } from "@/lib/types";
import { formatScoreBR } from "@/lib/images";

export default function GuideCard({ guia, index }: { guia: Review; index: number }) {
  const score = formatScoreBR(guia.verdict_score);
  return (
    <Link className="home-guide guide-card-v2" href={"/reviews/" + guia.slug + "/"}>
      <div className="guide-card-media">
        <SafeImage
          src={safeImageSrc(guia.image_url)}
          width={600}
          height={400}
          alt={guia.product}
          loading="lazy"
          sizes="(max-width: 720px) 100vw, 25vw"
        />
        <span className="home-guide-num">GUIA 0{index + 1}</span>
      </div>
      <div className="guide-card-body">
        <span className="tag">Guia de compra</span>
        <h3>{guia.product}</h3>
        <p>{guia.category}</p>
        <div className="guide-card-footer">
          {score ? <strong>Nota {score}/10</strong> : <span>Pesquisa por categoria</span>}
          <span>Ver guia →</span>
        </div>
      </div>
    </Link>
  );
}
