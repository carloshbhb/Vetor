import SafeImage from "./SafeImage";
import Link from "next/link";
import type { Review } from "@/lib/types";

export default function ReviewCard({ 
  review, 
  featured = false 
}: { 
  review: Review; 
  featured?: boolean;
}) {
  const score = review.verdict_score || review.hero_overall_score;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      className={`group relative block overflow-hidden transition-all duration-300 magnetic ${featured ? "featured-card" : ""}`}
      data-magnetic={featured ? "true" : "false"}
      style={{
        display: "block",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: featured ? "16px" : "12px",
        overflow: "hidden",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        textDecoration: "none",
        willChange: "transform, box-shadow, border-color",
      }}
      data-hover={JSON.stringify({
        "border-color": "var(--blue)",
        "box-shadow": featured ? "0 20px 60px rgba(0,0,0,0.12)" : "0 12px 40px rgba(0,0,0,0.08)",
        transform: featured ? "translateY(-8px) scale(1.01)" : "translateY(-6px) scale(1.01)",
      })}
      data-hover-base={JSON.stringify({
        "border-color": "var(--border)",
        "box-shadow": "none",
        transform: "translateY(0)",
      })}
    >
      {/* Image with hover zoom */}
      {review.image_url && (
        <div style={{ 
          position: "relative", 
          height: featured ? 280 : 180, 
          overflow: "hidden",
          background: "var(--surface)",
        }}>
          <SafeImage
            src={review.image_url}
            alt={review.product}
            fill
            style={{ 
              objectFit: "cover", 
              transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform",
            }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px"
          />
          
          {/* Category badge */}
          <span style={{
            position: "absolute", top: 16, left: 16,
            background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
            border: "1px solid var(--border)", borderRadius: "6px",
            padding: "4px 12px",
            fontFamily: "var(--font-heading)", fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--body)",
            zIndex: 10,
            transition: "all 0.2s",
          }}>
            {review.category}
          </span>
          
          {/* Score badge */}
          {score > 0 && (
            <span style={{
              position: "absolute", top: 16, right: 16,
              background: "var(--ink)", color: "#fff",
              fontFamily: "var(--font-display)",
              fontSize: featured ? "1.5rem" : "1.2rem",
              fontWeight: 300,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              borderRadius: "50%",
              width: featured ? "56px" : "44px",
              height: featured ? "56px" : "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              transition: "transform 0.2s, background 0.2s",
            }}>
              {score.toFixed(1)}
            </span>
          )}

          {/* Gradient overlay */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(180deg, transparent 40%, rgba(17,17,17,0.4) 100%)",
              borderRadius: featured ? "16px 16px 0 0" : "12px 12px 0 0",
              pointerEvents: "none",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ 
        padding: featured ? "28px" : "20px",
        display: "flex",
        flexDirection: "column",
        gap: featured ? "16px" : "12px",
      }}>
        {/* Product name */}
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontWeight: featured ? 500 : 600,
          fontSize: featured ? "clamp(1.2rem, 2vw, 1.5rem)" : "1rem",
          lineHeight: 1.2,
          color: "var(--ink)",
          marginBottom: featured ? "8px" : "6px",
          letterSpacing: "-0.01em",
          transition: "color 0.2s",
        }}>
          {review.product}
        </h3>

        {/* Description */}
        <p style={{
          fontSize: featured ? "0.95rem" : "0.82rem",
          color: "var(--body)",
          fontWeight: 300,
          lineHeight: 1.7,
          marginBottom: featured ? "16px" : "12px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          WebkitLineClamp: featured ? 3 : 2,
          WebkitBoxOrient: "vertical",
          display: "-webkit-box",
        }}>
          {review.hero_lead || review.meta_description}
        </p>

        {/* Meta bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: featured ? "16px" : "12px",
          borderTop: "1px solid var(--border)",
          fontFamily: "var(--font-heading)",
          fontSize: featured ? "0.72rem" : "0.65rem",
          fontWeight: 600,
          color: "var(--muted)",
          gap: "12px",
        }}>
          <span style={{ 
            background: "var(--surface)", 
            border: "1px solid var(--border)", 
            borderRadius: "6px", 
            padding: "3px 10px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {review.category}
          </span>
          
          {/* Recommendation tag */}
          {score >= 8 ? (
            <span style={{ 
              color: "var(--green)", 
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Recomendado
            </span>
          ) : score >= 5 ? (
            <span style={{ color: "var(--amber)", fontWeight: 700 }}>Razoável</span>
          ) : (
            <span style={{ color: "var(--red)", fontWeight: 700 }}>Não Recomendado</span>
          )}
        </div>
      </div>
    </Link>
  );
}