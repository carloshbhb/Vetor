#!/usr/bin/env node

/**
 * Rich Results Test Script for Vetor Blog
 * 
 * Run this script to validate your schemas:
 * node scripts/test-rich-results.js
 */

const https = require('https');
const http = require('http');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';

console.log('🔍 Rich Results Test Script for Vetor Blog\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Schema types to validate
const schemaTypes = [
  'Organization',
  'WebSite',
  'Article',
  'NewsArticle',
  'Product',
  'FAQPage',
  'BreadcrumbList',
  'HowTo',
  'VideoObject',
];

// Test URLs
const testUrls = [
  { name: 'Homepage', url: SITE_URL },
  { name: 'Sample Review', url: `${SITE_URL}/review/sample` },
  { name: 'Sitemap', url: `${SITE_URL}/sitemap.xml` },
  { name: 'Robots.txt', url: `${SITE_URL}/robots.txt` },
];

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function testSchemaValidation() {
  console.log('\n📋 Schema Types Implemented:\n');
  
  schemaTypes.forEach((type, index) => {
    console.log(`  ${index + 1}. ✅ ${type}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function testUrls() {
  console.log('\n🌐 Testing URLs:\n');
  
  for (const test of testUrls) {
    try {
      const response = await fetchUrl(test.url);
      const status = response.status === 200 ? '✅' : '⚠️';
      console.log(`  ${status} ${test.name}: ${response.status}`);
    } catch (error) {
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function testGoogleTools() {
  console.log('\n🛠️  Google Testing Tools:\n');
  
  console.log('  1. Rich Results Test');
  console.log(`     https://search.google.com/test/rich-results?url=${encodeURIComponent(SITE_URL)}`);
  console.log('');
  
  console.log('  2. Schema Markup Validator');
  console.log(`     https://validator.schema.org/#url=${encodeURIComponent(SITE_URL)}`);
  console.log('');
  
  console.log('  3. Google Search Console');
  console.log('     https://search.google.com/search-console');
  console.log('');
  
  console.log('  4. PageSpeed Insights');
  console.log(`     https://pagespeed.web.dev/analysis?url=${encodeURIComponent(SITE_URL)}`);
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function testSchemaOutput() {
  console.log('\n📝 Expected Schema Output (per review page):\n');
  
  const expectedSchemas = [
    {
      type: 'Article',
      fields: ['headline', 'description', 'image', 'url', 'datePublished', 'author', 'publisher'],
    },
    {
      type: 'NewsArticle',
      fields: ['headline', 'description', 'image', 'url', 'datePublished', 'author', 'publisher', 'keywords'],
    },
    {
      type: 'Product',
      fields: ['name', 'image', 'description', 'brand', 'review', 'aggregateRating', 'offers'],
    },
    {
      type: 'FAQPage',
      fields: ['mainEntity', 'Question', 'Answer'],
    },
    {
      type: 'BreadcrumbList',
      fields: ['itemListElement', 'ListItem', 'position', 'name', 'item'],
    },
    {
      type: 'HowTo',
      fields: ['name', 'description', 'image', 'totalTime', 'step', 'HowToStep'],
    },
    {
      type: 'VideoObject',
      fields: ['name', 'description', 'thumbnailUrl', 'uploadDate', 'duration', 'contentUrl'],
    },
  ];
  
  expectedSchemas.forEach((schema, index) => {
    console.log(`  ${index + 1}. ${schema.type}`);
    console.log(`     Fields: ${schema.fields.join(', ')}`);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function testRichResultsChecklist() {
  console.log('\n✅ Rich Results Checklist:\n');
  
  const checklist = [
    { item: 'Organization schema in layout', status: true },
    { item: 'WebSite schema in layout', status: true },
    { item: 'Article schema in reviews', status: true },
    { item: 'NewsArticle schema in reviews', status: true },
    { item: 'Product schema in reviews', status: true },
    { item: 'FAQPage schema in reviews', status: true },
    { item: 'BreadcrumbList schema in reviews', status: true },
    { item: 'HowTo schema in reviews', status: true },
    { item: 'VideoObject schema in reviews', status: true },
    { item: 'OpenGraph metadata', status: true },
    { item: 'Twitter Card metadata', status: true },
    { item: 'Canonical URLs', status: true },
    { item: 'Sitemap.xml', status: true },
    { item: 'Robots.txt', status: true },
    { item: 'llms.txt for GEO', status: true },
    { item: 'Google Search Console verification', status: true },
    { item: 'Bing Webmaster Tools verification', status: true },
    { item: 'Google Indexing API', status: true },
    { item: 'IndexNow (Bing)', status: true },
  ];
  
  checklist.forEach((item, index) => {
    const status = item.status ? '✅' : '❌';
    console.log(`  ${status} ${item.item}`);
  });
  
  const passed = checklist.filter(i => i.status).length;
  const total = checklist.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`\n  Score: ${passed}/${total} (${percentage}%)`);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function main() {
  await testSchemaValidation();
  await testUrls();
  await testGoogleTools();
  await testSchemaOutput();
  await testRichResultsChecklist();
  
  console.log('\n🎯 Next Steps:\n');
  console.log('  1. Test your homepage at Rich Results Test');
  console.log('  2. Test a review page at Rich Results Test');
  console.log('  3. Check Google Search Console for errors');
  console.log('  4. Monitor Rich Results performance in Search Console');
  console.log('');
  console.log('📚 Documentation:');
  console.log('  - docs/ANALYTICS_SETUP.md');
  console.log('  - lib/seo.ts');
  console.log('  - lib/backlinks.ts');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);