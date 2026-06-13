#!/usr/bin/env node
// Script de diagnóstico para verificar cron jobs do Vercel
// Execute: node scripts/check-cron.js

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
const CRON_SECRET = process.env.CRON_SECRET;

console.log('=== Diagnóstico de Cron Jobs ===');
console.log('Site:', SITE_URL);
console.log('CRON_SECRET configurado:', CRON_SECRET ? 'SIM' : 'NÃO');
console.log('');

async function testEndpoint(path, method = 'GET') {
  const url = `${SITE_URL}${path}`;
  console.log(`Testando: ${method} ${url}`);
  
  const headers = {};
  if (CRON_SECRET) {
    headers['Authorization'] = `Bearer ${CRON_SECRET}`;
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Resposta:', JSON.stringify(data, null, 2).substring(0, 500));
    return { success: response.ok, status: response.status, data };
  } catch (err) {
    console.log('Erro:', err.message);
    return { success: false, error: err.message };
  }
}

async function main() {
  // Testar endpoint de debug (apenas em desenvolvimento)
  console.log('\n--- Teste 1: Endpoint de debug ---');
  await testEndpoint('/api/debug/generate', 'POST');
  
  // Testar endpoint do cron diretamente
  console.log('\n--- Teste 2: Cron endpoint (GET) ---');
  await testEndpoint('/api/cron/autonomous-agent', 'GET');
  
  // Verificar se o problema é com crons do Vercel
  console.log('\n--- Verificações manuais necessárias ---');
  console.log('1. Acesse o Vercel Dashboard → Settings → Environment Variables');
  console.log('2. Verifique se CRON_SECRET está configurado');
  console.log('3. Acesse Settings → Cron Jobs e veja se estão ativos');
  console.log('4. Verifique os logs em Deployments → [Último deployment] → Functions');
}

main();
