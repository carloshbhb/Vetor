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
        border: "1px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
        transition: "border-color 0.2s",
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px"
          />
          <span style={{
            position: "absolute", top: 12, left: 12,
            background: "rgba(255,255,255,0.9)", backdropFilter: "blur(0px)",
            border: "1px solid var(--border)", borderRadius: "4px",
            padding: "3px 10px",
            fontFamily: "var(--font-heading)", fontSize: "0.64rem", fontWeight: 700,
            letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--body)",
          }}>
            {review.category}
          </span>
          {score > 0 && (
            <span style={{
              position: "absolute", top: 12, right: 12,
              background: "var(--blue)", color: "#fff",
              fontFamily: "var(--font-heading)",
              borderRadius: "8px", padding: "3px 10px", fontSize: "1.2rem", lineHeight: 1.2,
            }}>
              {score.toFixed(1)}
            </span>
          )}
        </div>
      )}
      <div style={{ padding: "20px" }}>
        <h3 style={{
          fontFamily: "var(--font-heading)", fontWeight: 800,
          fontSize: "0.95rem", color: "var(--ink)",
          marginBottom: 6, lineHeight: 1.3,
        }}>
          {review.product}
        </h3>
        <p style={{fontSize: "0.82rem", color: "var(--muted)", fontWeight: 300, lineHeight: 1.6, marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"}}>
          {review.hero_lead}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: "12px", borderTop: "1px solid var(--border)",
          fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)",
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