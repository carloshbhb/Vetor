import Image from "next/image";
import Link from "next/link";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review }) {
  const score = review.verdict_score || review.hero_overall_score;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      style={{
        display: "block",
        background: "var(--bg)",
        border: "1.5px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        transition: "all 0.3s",
        textDecoration: "none",
      }}
    >
      {review.image_url && (
        <div style={{ position: "relative", height: 180, overflow: "hidden" }}>
          <Image
            src={review.image_url}
            alt={review.product}
            fill
            style={{ objectFit: "cover", transition: "transform 0.4s" }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <span style={{
            position: "absolute", top: 12, left: 12,
            background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
            border: "1px solid var(--border)", borderRadius: 4,
            padding: "3px 10px",
            fontFamily: "'Syne',sans-serif", fontSize: "0.64rem", fontWeight: 700,
            letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--body)",
          }}>
            {review.category}
          </span>
          {score > 0 && (
            <span style={{
              position: "absolute", top: 12, right: 12,
              background: "var(--blue)", color: "#fff",
              fontFamily: "'Bebas Neue',sans-serif",
              borderRadius: 8, padding: "3px 10px", fontSize: "1.2rem", lineHeight: 1.2,
            }}>
              {score.toFixed(1)}
            </span>
          )}
        </div>
      )}
      <div style={{ padding: 20 }}>
        <h3 style={{
          fontFamily: "'Syne',sans-serif", fontWeight: 800,
          fontSize: "0.95rem", color: "var(--ink)",
          marginBottom: 6, lineHeight: 1.3,
        }}>
          {review.product}
        </h3>
        <p style={{
          fontSize: "0.82rem", color: "var(--muted)", fontWeight: 300,
          lineHeight: 1.6, marginBottom: 14,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {review.hero_lead}
        </p>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 12, borderTop: "1px solid var(--border)",
          fontFamily: "'Syne',sans-serif", fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)",
        }}>
          <span>{review.category}</span>
          {score >= 8 ? (
            <span style={{ color: "var(--green)" }}>✓ Recomendado</span>
          ) : score >= 5 ? (
            <span style={{ color: "var(--amber)" }}>Razoável</span>
          ) : (
            <span style={{ color: "var(--red)" }}>Não Recomendado</span>
          )}
        </div>
      </div>
    </Link>
  );
}
