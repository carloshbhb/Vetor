import { createHash } from "node:crypto";

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


/**
 * Verify the downloaded GLB bytes against the digest in the human-reviewed
 * manifest. Metadata alone is insufficient: a URL can point to a replaced file.
 */
export async function verifyProductModelAssetIntegrity(asset, {
  fetchImpl = globalThis.fetch,
  maxBytes = 50 * 1024 * 1024,
  timeoutMs = 45000,
} = {}) {
  const inspection = inspectProductModelAsset(asset);
  if (!inspection.verified) {
    return { ...inspection, integrityVerified: false };
  }
  if (typeof fetchImpl !== "function") {
    return {
      ...inspection,
      verified: false,
      integrityVerified: false,
      status: "unverified",
      reason: "Fetch indisponível para verificar os bytes do modelo 3D.",
    };
  }

  try {
    const response = await fetchImpl(inspection.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " ao baixar o GLB.");
    }
    const declaredLength = Number(response.headers?.get?.("content-length") || 0);
    if (declaredLength > maxBytes) {
      throw new Error("GLB excede o limite de " + maxBytes + " bytes para verificação.");
    }
    if (!response.body) {
      throw new Error("Resposta do GLB sem corpo para calcular SHA-256.");
    }

    const digest = createHash("sha256");
    const chunks = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxBytes) {
        throw new Error("GLB excede o limite de " + maxBytes + " bytes durante o download.");
      }
      digest.update(buffer);
      chunks.push(buffer);
    }
    if (bytes === 0) {
      throw new Error("O GLB recebido está vazio.");
    }

    const actualSha256 = digest.digest("hex");
    if (actualSha256 !== inspection.sha256) {
      return {
        ...inspection,
        verified: false,
        integrityVerified: false,
        status: "unverified",
        actualSha256,
        bytes,
        reason: "SHA-256 do GLB baixado não corresponde ao manifesto aprovado.",
      };
    }
    return {
      ...inspection,
      integrityVerified: true,
      actualSha256,
      bytes,
      modelBytes: Buffer.concat(chunks, bytes),
      reason: null,
    };
  } catch (error) {
    return {
      ...inspection,
      verified: false,
      integrityVerified: false,
      status: "unverified",
      reason: "Não foi possível validar a integridade do GLB: " +
        (error instanceof Error ? error.message : String(error)),
    };
  }
}
