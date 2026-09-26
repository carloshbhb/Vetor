/**
 * Diagnostico da API do Mercado Livre: sessao, /users/me, /products/search, /sites/MLB/search
 * Usage: npx tsx tmp/ml-diag.ts
 */
import { config } from 'dotenv';

config({ path: '.env.local' });

const AUTH = 'https://api.mercadolibre.com';

async function hit(label: string, path: string, token?: string) {
  const started = Date.now();
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${AUTH}${path}`, { headers });
    const ms = Date.now() - started;
    const text = await r.text();
    let snippet = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      snippet = JSON.stringify(j).slice(0, 400);
    } catch {}
    console.log(`\n[${label}] HTTP ${r.status} (${ms}ms)`);
    console.log(snippet);
    return { status: r.status, body: text ? JSON.parse(text) : null };
  } catch (e) {
    console.log(`\n[${label}] FALHOU: ${e instanceof Error ? e.message : e}`);
    return { status: 0, body: null };
  }
}

async function main() {
  const { getSessionInfo } = await import('../src/lib/mercadolivre-auth');
  const session = await getSessionInfo();

  console.log('=== SESSAO ML (Supabase ml_tokens) ===');
  if (!session) {
    console.log('NENHUMA sessao salva -> OAuth precisa ser concluido no navegador');
  } else {
    const expiresIn = Math.round((session.expiresAt - Date.now()) / 1000);
    console.log(`userId=${session.userId} expiresIn=${expiresIn}s (${expiresIn > 0 ? 'valida' : 'EXPIRADA'})`);
    console.log(`refreshToken=${session.refreshToken ? 'presente' : 'AUSENTE'}`);
    console.log(`scope=${session.scope || '-'}`);
  }

  const { getValidAccessToken } = await import('../src/lib/mercadolivre-auth');
  let token: string | null = null;
  try {
    token = await getValidAccessToken();
    console.log('\ngetValidAccessToken() -> OK');
  } catch (e) {
    console.log(`\ngetValidAccessToken() -> ERRO: ${e instanceof Error ? e.message : e}`);
  }

  if (!token) {
    console.log('\nSem token: apenas endpoints publicos abaixo.');
    await hit('public /sites/MLB/search', '/sites/MLB/search?q=iphone%2015&limit=2');
    return;
  }

  await hit('auth /users/me', '/users/me', token);
  const ps = await hit(
    'auth /products/search',
    '/products/search?q=iphone%2015&site_id=MLB&status=active&limit=2',
    token
  );
  if (ps.body?.results?.length) {
    const first = ps.body.results[0];
    console.log('\n--- campos do 1o resultado de /products/search ---');
    console.log(Object.keys(first).join(', '));
  }
  await hit('auth /sites/MLB/search', '/sites/MLB/search?q=iphone%2015&limit=2', token);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
