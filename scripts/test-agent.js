#!/usr/bin/env node
// Teste rápido do autonomous-agent
// Execute: node scripts/test-agent.js

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
const CRON_SECRET = process.env.CRON_SECRET;

async function testAgent() {
  console.log('=== Testando Autonomous Agent ===');
  console.log('URL:', `${SITE_URL}/api/cron/autonomous-agent`);
  console.log('CRON_SECRET:', CRON_SECRET ? 'Configurado' : 'NÃO CONFIGURADO');
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (CRON_SECRET) {
    headers['Authorization'] = `Bearer ${CRON_SECRET}`;
  }
  
  try {
    console.log('\nEnviando requisição...');
    const start = Date.now();
    
    const response = await fetch(`${SITE_URL}/api/cron/autonomous-agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(120000), // 2 minutos
    });
    
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const data = await response.json();
    
    console.log(`\nStatus: ${response.status} (${elapsed}s)`);
    console.log('Resposta:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (err) {
    console.error('\nErro:', err.message);
    return null;
  }
}

testAgent();
