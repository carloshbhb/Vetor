/**
 * Font stacks for the Remotion videos.
 *
 * The faces themselves are local files in `public/fonts/` and are loaded by
 * `loadFonts.ts` (imported once in `Root.tsx`). Keep the first family in each stack
 * in sync with the `family` names registered there.
 */
export const fonts = {
  /** Primary heading font - bold, modern */
  heading: '"Space Grotesk", "Inter", Arial, Helvetica, sans-serif',
  /** Body text font - readable at small sizes */
  body: '"Inter", Arial, Helvetica, sans-serif',
  /** Numbers and scores */
  mono: '"Inter", "Consolas", monospace',
  /** Accent font for hooks, CTAs */
  accent: '"Space Grotesk", "Inter", sans-serif',
} as const;
