import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { loadFont } from '@remotion/fonts';

/**
 * Loads the brand fonts from video/public/fonts so every render uses the exact same
 * typefaces. Nothing is fetched from the network while rendering: no Google Fonts,
 * no fallback to Arial when the render runner is offline or slow.
 *
 * The render waits (delayRender) until both faces are ready.
 */
const handle = delayRender('Loading brand fonts', { timeoutInMilliseconds: 30000 });

Promise.all([
  loadFont({
    family: 'Inter',
    url: staticFile('fonts/inter-latin-wght-normal.woff2'),
    weight: '100 900',
    format: 'woff2',
  }),
  loadFont({
    family: 'Space Grotesk',
    url: staticFile('fonts/space-grotesk-latin-wght-normal.woff2'),
    weight: '300 700',
    format: 'woff2',
  }),
])
  .then(() => continueRender(handle))
  .catch((error) => cancelRender(error));
