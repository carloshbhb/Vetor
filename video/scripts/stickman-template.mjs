export const STICKMAN_REVIEW_TEMPLATE_ID = "stickman-review";
export const STICKMAN_REVIEW_MEDIA_MARKER = "vetor-stickman-review";

export function isStickmanReviewTemplate(mediaAssets) {
  if (!Array.isArray(mediaAssets)) return false;
  return mediaAssets.some((item) => {
    if (typeof item === "string") {
      const value = item.trim().toLowerCase();
      return value === STICKMAN_REVIEW_MEDIA_MARKER || value === STICKMAN_REVIEW_TEMPLATE_ID;
    }
    if (!item || typeof item !== "object") return false;
    const record = item;
    const type = String(record.type || record.kind || "").trim().toLowerCase();
    const style = String(record.style || record.value || record.template || "").trim().toLowerCase();
    return (
      (type === "visual_style" || type === "video_template" || type === "character_style") &&
      (style === "stickman" || style === "stickman-review" || style === "animated-stickman")
    ) || (
      type === STICKMAN_REVIEW_MEDIA_MARKER || type === STICKMAN_REVIEW_TEMPLATE_ID
    );
  });
}

export function resolveVisualTemplate(mediaAssets, videoFormat) {
  if (!isStickmanReviewTemplate(mediaAssets)) return null;
  if (videoFormat !== "long") {
    throw new Error("O template Stickman Review exige formato longo horizontal (16:9).");
  }
  return STICKMAN_REVIEW_TEMPLATE_ID;
}
