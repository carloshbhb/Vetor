const SHA256 = /^[a-f0-9]{64}$/i;

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeAssetUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * A URL is only an available asset, never proof of product fidelity.
 * Verified status requires an explicit human review, timestamp, source references
 * and a SHA-256 digest produced for the exact exported GLB.
 */
export function inspectProductModelAsset(asset) {
  const source = asRecord(asset);
  const manifest = asRecord(source.manifest);
  const review = asRecord(source.review || manifest.review);
  const url = safeAssetUrl(source.url || source.src || manifest.url);
  const sha256 = String(source.sha256 || manifest.sha256 || "").trim().toLowerCase();
  const verifiedBy = String(review.verifiedBy || "").trim();
  const verifiedAt = String(review.verifiedAt || "").trim();
  const sourceReferences = Array.isArray(review.sourceReferences)
    ? review.sourceReferences.filter((item) => typeof item === "string" && item.trim()).slice(0, 12)
    : [];
  const hasValidTimestamp = Boolean(verifiedAt) && Number.isFinite(Date.parse(verifiedAt));
  const verified = Boolean(
    url &&
    review.status === "verified" &&
    SHA256.test(sha256) &&
    verifiedBy &&
    hasValidTimestamp &&
    sourceReferences.length > 0
  );

  let reason = null;
  if (!url) reason = "URL HTTPS do modelo ausente ou inválida.";
  else if (review.status !== "verified") reason = "Modelo ainda não foi aprovado em revisão humana.";
  else if (!SHA256.test(sha256)) reason = "Manifesto sem SHA-256 válido do GLB.";
  else if (!verifiedBy) reason = "Manifesto sem identificação do revisor.";
  else if (!hasValidTimestamp) reason = "Manifesto sem data válida de verificação.";
  else if (sourceReferences.length === 0) reason = "Manifesto sem referências usadas na comparação do produto.";

  return {
    available: Boolean(url),
    verified,
    url,
    sha256: SHA256.test(sha256) ? sha256 : null,
    verifiedBy: verifiedBy || null,
    verifiedAt: hasValidTimestamp ? verifiedAt : null,
    sourceReferences,
    status: verified ? "verified" : url ? "unverified" : "missing",
    reason,
  };
}
