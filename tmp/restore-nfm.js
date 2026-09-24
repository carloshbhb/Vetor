const fs = require('fs');
const p = './node_modules/next/dist/build/webpack/plugins/next-font-manifest-plugin.js';
let code = fs.readFileSync(p, 'utf8');
// Remove our instrumentation
code = code.replace(
  /console\.error\("\[NFM\] groups:"[^;]+; const nextFontManifest/,
  'const nextFontManifest'
);
code = code.replace(
  /const _req = \(mod && mod\.request\) \|\| ""; const _hit = _req\.includes\("\/next-font-loader\/index\.js\?"\); if \(_req\.includes\("next-font-loader"\)\) \{ console\.error\("\[NFM\] hit=" \+ _hit \+ " req=" \+ JSON\.stringify\(_req\.slice\(0, 400\)\)\); \} if \(_hit\) \{/,
  'if (mod == null ? void 0 : (_mod_request = mod.request) == null ? void 0 : _mod_request.includes(\'/next-font-loader/index.js?\')) {'
);
if (code.includes('[NFM]')) {
  console.log('STILL HAS INSTRUMENTATION');
  process.exit(1);
}
fs.writeFileSync(p, code);
console.log('restored clean plugin');
// verify syntax
require('child_process').execSync(`node --check "${p}"`, { stdio: 'inherit' });
console.log('syntax ok');
