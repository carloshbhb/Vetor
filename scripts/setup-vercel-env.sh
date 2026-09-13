#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vetor Blog - Vercel Environment Variables Setup
# Execute: bash scripts/setup-vercel-env.sh
# Requer: vercel CLI autenticado (vercel login)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🔧 Configurando Vercel Environment Variables..."
echo ""

if [ ! -f .env.local ]; then
  echo "❌ Arquivo .env.local nao encontrado!"
  exit 1
fi

# Funcao para extrair valor do .env.local
get_env() {
  local key=$1
  local value=$(grep "^${key}=" .env.local | head -1 | cut -d'=' -f2-)
  value="${value%\"}"
  value="${value#\"}"
  echo "$value"
}

# Funcao para definir env var no Vercel
set_vercel_env() {
  local name=$1
  local value=$2
  local env_type=${3:-production}
  if [ -z "$value" ]; then
    echo "  ⚠️  $name: vazio, pulando..."
    return
  fi
  echo "$value" | vercel env add "$name" "$env_type" --force 2>/dev/null
  echo "  ✅ $name ($env_type)"
}

echo "📡 Supabase..."
set_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "$(get_env NEXT_PUBLIC_SUPABASE_URL)"
set_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$(get_env NEXT_PUBLIC_SUPABASE_ANON_KEY)"
set_vercel_env "SUPABASE_SERVICE_KEY" "$(get_env SUPABASE_SERVICE_KEY)"

echo ""
echo "🤖 AI (Groq)..."
set_vercel_env "GROQ_API_KEY" "$(get_env GROQ_API_KEY)"
set_vercel_env "OPENAI_API_KEY" "$(get_env OPENAI_API_KEY)"

echo ""
echo "🐙 GitHub..."
set_vercel_env "GITHUB_TOKEN" "$(get_env GITHUB_TOKEN)"
set_vercel_env "GITHUB_REPO" "$(get_env GITHUB_REPO)"

echo ""
echo "🔍 IndexNow..."
set_vercel_env "INDEXNOW_API_KEY" "$(get_env INDEXNOW_API_KEY)"
set_vercel_env "INDEXNOW_LOCATION_ID" "$(get_env INDEXNOW_LOCATION_ID)"

echo ""
echo "🌐 Google Indexing..."
set_vercel_env "GOOGLE_INDEXING_API_KEY" "$(get_env GOOGLE_INDEXING_API_KEY)"

echo ""
echo "🔗 Site..."
set_vercel_env "NEXT_PUBLIC_SITE_URL" "$(get_env NEXT_PUBLIC_SITE_URL)"
set_vercel_env "SITE_URL" "$(get_env SITE_URL)"

echo ""
echo "🔒 Cron/Admin..."
set_vercel_env "CRON_SECRET" "$(get_env CRON_SECRET)"
set_vercel_env "ADMIN_PASSWORD" "$(get_env ADMIN_PASSWORD)"

echo ""
echo "📊 Analytics..."
set_vercel_env "NEXT_PUBLIC_CLARITY_ID" "$(get_env NEXT_PUBLIC_CLARITY_ID)"
set_vercel_env "NEXT_PUBLIC_GA_ID" "$(get_env NEXT_PUBLIC_GA_ID)"

echo ""
echo "✅ Todas as environment variables configuradas!"
echo ""
echo "📋 Proximos passos:"
echo "  1. Verifique em: https://vercel.com/dashboard"
echo "  2. O cron roda automaticamente as 3h UTC"
echo "  3. Faca deploy: vercel --prod"
