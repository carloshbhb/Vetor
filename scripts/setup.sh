#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vetor Blog - Setup Completo
# Execute: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🚀 Vetor Blog - Setup Completo"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Verificar se .env.local existe
if [ ! -f .env.local ]; then
  echo "❌ Arquivo .env.local nao encontrado!"
  echo "   Copie .env.example para .env.local e preencha as credenciais"
  exit 1
fi

echo "📋 Este script ira configurar:"
echo "   1. GitHub Actions Secrets"
echo "   2. Vercel Environment Variables"
echo "   3. Supabase Database Schema"
echo ""
echo "   Pressione Enter para continuar ou Ctrl+C para cancelar..."
read

# 1. GitHub Secrets
echo ""
echo "══════════════════════════════════════════════════════════════"
echo " 1/3 - GitHub Secrets"
echo "══════════════════════════════════════════════════════════════"
if command -v gh &> /dev/null; then
  bash scripts/setup-github-secrets.sh
else
  echo "⚠️  GitHub CLI (gh) nao encontrado!"
  echo "   Instale: https://cli.github.com/"
  echo "   Ou configure manualmente: https://github.com/carloshbhb/Vetor/settings/secrets/actions"
fi

# 2. Vercel Env
echo ""
echo "══════════════════════════════════════════════════════════════"
echo " 2/3 - Vercel Environment Variables"
echo "══════════════════════════════════════════════════════════════"
if command -v vercel &> /dev/null; then
  bash scripts/setup-vercel-env.sh
else
  echo "⚠️  Vercel CLI nao encontrado!"
  echo "   Instale: npm install -g vercel"
  echo "   Ou configure manualmente: https://vercel.com/dashboard"
fi

# 3. Supabase
echo ""
echo "══════════════════════════════════════════════════════════════"
echo " 3/3 - Supabase Schema"
echo "══════════════════════════════════════════════════════════════"
if command -v supabase &> /dev/null; then
  bash scripts/setup-supabase.sh
else
  echo "⚠️  Supabase CLI nao encontrado!"
  echo "   Instale: npm install -g supabase"
  echo "   Ou execute manualmente no Supabase Dashboard:"
  echo "   https://supabase.com/dashboard > SQL Editor > Cole supabase/schema.sql"
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "✅ Setup Completo!"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "📋 Proximos passos:"
echo "  1. Verifique os secrets em: https://github.com/carloshbhb/Vetor/settings/secrets/actions"
echo "  2. Verifique as env vars em: https://vercel.com/dashboard"
echo "  3. Verifique as tabelas em: https://supabase.com/dashboard"
echo "  4. Faca deploy: vercel --prod"
echo "  5. Teste o cron: Actions > Generate Content > Run workflow"
echo ""
echo "🧪 Para testar localmente:"
echo "  npm run build"
echo "  npm run generate"
