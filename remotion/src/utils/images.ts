import { staticFile } from "remotion";

/**
 * Returns the correct image src for Remotion.
 * Local paths (starting with "images/" or not starting with "http") use staticFile().
 * Remote URLs (http/https) are used as-is.
 */
export function getImageSrc(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return staticFile(src);
}
