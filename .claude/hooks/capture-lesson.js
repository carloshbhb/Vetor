#!/usr/bin/env node
const { storeLesson, storePattern } = require('../lib/memory.ts');

const [taskId, description, result] = process.argv.slice(2);

if (!taskId || !description) {
  console.log('Usage: capture-lesson.js <taskId> <description> [result]');
  process.exit(1);
}

async function capture() {
  try {
    const success = result !== 'failed' && result !== 'error';
    
    const lesson = {
      lesson: `Task: ${description}. Result: ${result || 'completed'}`,
      domain: inferDomain(description),
      tags: extractTags(description),
      confidence: success ? 0.8 : 0.4,
      evidence: `Task ${taskId}: ${description} -> ${result}`,
      success,
    };

    await storeLesson(lesson);
    console.log(`✅ Lesson captured: ${lesson.domain}`);
  } catch (error) {
    console.error('❌ Failed to capture lesson:', error);
  }
}

function inferDomain(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes('seo') || lower.includes('rank')) return 'seo-optimization';
  if (lower.includes('convert') || lower.includes('cta') || lower.includes('affiliate')) return 'conversion-optimization';
  if (lower.includes('ml') || lower.includes('mercado livre') || lower.includes('mercadolivre')) return 'mercadolivre-affiliate';
  if (lower.includes('next') || lower.includes('build') || lower.includes('lint') || lower.includes('type')) return 'nextjs-performance';
  if (lower.includes('design') || lower.includes('ui') || lower.includes('component')) return 'design-system';
  if (lower.includes('content') || lower.includes('article') || lower.includes('review') || lower.includes('viral')) return 'content-generation';
  return 'code-quality';
}

function extractTags(desc: string): string[] {
  const tags = [];
  const lower = desc.toLowerCase();
  
  const tagMap: Record<string, string[]> = {
    'seo': ['seo', 'ranking', 'keywords'],
    'cta': ['cta', 'conversion', 'affiliate'],
    'ml': ['mercadolivre', 'affiliate', 'tracking'],
    'next': ['nextjs', 'react', 'typescript'],
    'design': ['ui', 'components', 'minimalist'],
    'content': ['articles', 'reviews', 'viral'],
    'performance': ['optimization', 'speed', 'core-web-vitals'],
    'build': ['build', 'ci', 'lint', 'typecheck'],
    'deploy': ['vercel', 'deploy', 'indexnow'],
  };
  
  for (const [keyword, tagList] of Object.entries(tagMap)) {
    if (lower.includes(keyword)) {
      tags.push(...tagList);
    }
  }
  
  return [...new Set(tags)];
}

capture();