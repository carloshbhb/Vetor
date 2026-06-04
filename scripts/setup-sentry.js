#!/usr/bin/env node

/**
 * Sentry Setup Script for Vetor Blog
 * 
 * Run this script to install and configure Sentry:
 * node scripts/setup-sentry.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SENTRY_DSN = process.env.SENTRY_DSN;

if (!SENTRY_DSN) {
  console.log('⚠️  SENTRY_DSN not found in environment variables.');
  console.log('');
  console.log('Please set up Sentry first:');
  console.log('1. Go to https://sentry.io');
  console.log('2. Create a new project (Next.js)');
  console.log('3. Copy the DSN');
  console.log('4. Add to .env.local: SENTRY_DSN=your-dsn');
  console.log('');
  console.log('Then run this script again.');
  process.exit(1);
}

console.log('🔧 Setting up Sentry for Vetor Blog...\n');

// Step 1: Install Sentry packages
console.log('📦 Installing Sentry packages...');
try {
  execSync('npm install @sentry/nextjs @sentry/react', { stdio: 'inherit' });
  console.log('✅ Sentry packages installed\n');
} catch (error) {
  console.error('❌ Failed to install Sentry packages');
  process.exit(1);
}

// Step 2: Create sentry.client.config.js
console.log('📝 Creating Sentry client config...');
const clientConfig = `
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  
  // Filter sensitive data
  beforeSend: (event) => {
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'sentry.client.config.js'),
  clientConfig.trim()
);
console.log('✅ sentry.client.config.js created\n');

// Step 3: Create sentry.server.config.js
console.log('📝 Creating Sentry server config...');
const serverConfig = `
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',
  
  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Filter sensitive data
  beforeSend: (event) => {
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'sentry.server.config.js'),
  serverConfig.trim()
);
console.log('✅ sentry.server.config.js created\n');

// Step 4: Create sentry.edge.config.js
console.log('📝 Creating Sentry edge config...');
const edgeConfig = `
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',
  
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'sentry.edge.config.js'),
  edgeConfig.trim()
);
console.log('✅ sentry.edge.config.js created\n');

// Step 5: Update next.config.js
console.log('📝 Updating next.config.js...');
const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

if (!nextConfig.includes('@sentry/nextjs')) {
  // Add withSentryConfig wrapper
  nextConfig = `const { withSentryConfig } = require('@sentry/nextjs');

${nextConfig}

module.exports = withSentryConfig(module.exports, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
`;
  fs.writeFileSync(nextConfigPath, nextConfig);
  console.log('✅ next.config.js updated with Sentry\n');
} else {
  console.log('ℹ️  next.config.js already configured\n');
}

// Step 6: Update .env.example
console.log('📝 Updating .env.example...');
const envExamplePath = path.join(__dirname, '..', '.env.example');
if (fs.existsSync(envExamplePath)) {
  let envExample = fs.readFileSync(envExamplePath, 'utf8');
  if (!envExample.includes('NEXT_PUBLIC_SENTRY_DSN')) {
    envExample += '\n# Sentry\nNEXT_PUBLIC_SENTRY_DSN=' + SENTRY_DSN + '\n';
    fs.writeFileSync(envExamplePath, envExample);
    console.log('✅ .env.example updated\n');
  }
}

console.log('🎉 Sentry setup complete!\n');
console.log('Next steps:');
console.log('1. Add to .env.local: NEXT_PUBLIC_SENTRY_DSN=' + SENTRY_DSN);
console.log('2. Deploy to Vercel to activate Sentry');
console.log('3. Check https://sentry.io for your first error');
console.log('');
console.log('Optional:');
console.log('- Add source maps upload to CI/CD');
console.log('- Configure release tracking');
console.log('- Set up alert rules in Sentry dashboard');