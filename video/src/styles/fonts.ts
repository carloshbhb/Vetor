/** Font configuration for Remotion videos
 *  Uses local font files for deterministic rendering.
 *  Place .woff2 files in public/fonts/ and reference via CSS @font-face in your HTML template.
 */

export const fonts = {
  /** Primary heading font - bold, modern */
  heading: '"Space Grotesk", "Inter", Arial, Helvetica, sans-serif',
  /** Body text font - readable at small sizes */
  body: '"Inter", "Roboto", Arial, Helvetica, sans-serif',
  /** Monospace for numbers, scores, code */
  mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  /** Accent font for hooks, CTAs */
  accent: '"Space Grotesk", "Inter", sans-serif',
} as const;

/** CSS @font-face declarations - add to your Remotion HTML template (public/index.html) */
export const fontFaces = `
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/Inter-VariableFont_wght.woff2') format('woff2-variations');
    font-weight: 100 900;
    font-display: block;
  }
  @font-face {
    font-family: 'Space Grotesk';
    src: url('/fonts/SpaceGrotesk-VariableFont_wght.woff2') format('woff2-variations');
    font-weight: 300 700;
    font-display: block;
  }
  @font-face {
    font-family: 'JetBrains Mono';
    src: url('/fonts/JetBrainsMono-VariableFont_wght.woff2') format('woff2-variations');
    font-weight: 100 800;
    font-display: block;
  }
`;

/** Download URLs for font files (place in video/public/fonts/) */
export const fontDownloads = {
  'Inter-VariableFont_wght.woff2': 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-VariableFont_wght.woff2',
  'SpaceGrotesk-VariableFont_wght.woff2': 'https://github.com/google/fonts/raw/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.woff2',
  'JetBrainsMono-VariableFont_wght.woff2': 'https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/variable/JetBrainsMono%5Bwght%5D.woff2',
} as const;
