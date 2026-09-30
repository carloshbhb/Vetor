#!/usr/bin/env node
const { storePattern } = require('../lib/memory.ts');

const [toolName, filePath, success] = process.argv.slice(2);

if (!toolName || !filePath) {
  console.log('Usage: track-pattern.js <toolName> <filePath> [success]');
  process.exit(1);
}

async function track() {
  try {
    const isSuccess = success !== 'false';
    const domain = inferDomainFromPath(filePath);
    const tags = extractTagsFromPath(filePath);
    
    const pattern = {
      trigger: `${toolName} on ${filePath}`,
      response: isSuccess ? 'Successful edit/operation' : 'Error or issue detected',
      domain,
      context: {
        tool: toolName,
        file: filePath,
        timestamp: Date.now(),
      },
      success: isSuccess,
      confidence: isSuccess ? 0.75 : 0.3,
    };

    await storePattern(pattern);
    console.log(`✅ Pattern tracked: ${domain}`);
  } catch (error) {
    console.error('❌ Failed to track pattern:', error);
  }
}

function inferDomainFromPath(path: string): string {
  const lower = path.toLowerCase();
  
  if (lower.includes('/seo/') || lower.includes('seo-')) return 'seo-optimization';
  if (lower.includes('/components/') || lower.includes('/ui/')) return 'design-system';
  if (lower.includes('/lib/') || lower.includes('/api/')) return 'nextjs-performance';
  if (lower.includes('/content/') || lower.includes('/reviews/') || lower.includes('/comparativos/')) return 'content-generation';
  if (lower.includes('/ml/') || lower.includes('/mercado/') || lower.includes('/affiliate/')) return 'mercadolivre-affiliate';
  if (lower.includes('/hooks/') || lower.includes('/scripts/')) return 'automation';
  
  return 'code-quality';
}

function extractTagsFromPath(path: string): string[] {
  const tags = [];
  const lower = path.toLowerCase();
  
  const pathParts = path.split('/');
  for (const part of pathParts) {
    if (part.length > 2 && !part.includes('.')) {
      tags.push(part);
    }
  }
  
  return tags;
}

track();