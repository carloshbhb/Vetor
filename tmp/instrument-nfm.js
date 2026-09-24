const fs = require('fs');
const p = './node_modules/next/dist/build/webpack/plugins/next-font-manifest-plugin.js';
let code = fs.readFileSync(p, 'utf8');
if (code.includes('[NFM]')) {
  console.log('already instrumented');
  process.exit(0);
}
// Log chunk group names
code = code.replace(
  'const nextFontManifest = {',
  'console.error("[NFM] groups:", Array.from(compilation.chunkGroups).map(g=>g.name).filter(Boolean).join("|")); const nextFontManifest = {'
);
// Log every module whose request mentions next-font-loader, with exact match status
const oldCheck = 'if (mod == null ? void 0 : (_mod_request = mod.request) == null ? void 0 : _mod_request.includes(\'/next-font-loader/index.js?\')) {';
const newCheck = 'const _req = (mod && mod.request) || ""; const _hit = _req.includes("/next-font-loader/index.js?"); if (_req.includes("next-font-loader")) { console.error("[NFM] hit=" + _hit + " req=" + JSON.stringify(_req.slice(0, 400))); } if (_hit) {';
if (!code.includes(oldCheck)) {
  console.log('CHECK PATTERN NOT FOUND');
  // show nearby
  const i = code.indexOf('next-font-loader');
  console.log('nearby:', code.slice(Math.max(0, i - 100), i + 200));
  process.exit(1);
}
code = code.replace(oldCheck, newCheck);
fs.writeFileSync(p, code);
console.log('instrumented ok');
