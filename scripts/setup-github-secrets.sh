#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vetor Blog - GitHub Secrets Setup
# Execute: bash scripts/setup-github-secrets.sh
# Requer: gh CLI autenticado (gh auth login)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO="carloshbhb/Vetor"

echo "🔧 Configurando GitHub Secrets para $REPO..."
echo ""

# Ler .env.local
if [ ! -f .env.local ]; then
  echo "❌ Arquivo .env.local nao encontrado!"
  exit 1
fi

# Funcao para extrair valor do .env.local
get_env() {
  local key=$1
  local value=$(grep "^${key}=" .env.local | head -1 | cut -d'=' -f2-)
  # Remove aspas se presentes
  value="${value%\"}"
  value="${value#\"}"
  echo "$value"
}

# Funcao para definir secret
set_secret() {
  local name=$1
  local value=$2
  if [ -z "$value" ]; then
    echo "  ⚠️  $name: vazio, pulando..."
    return
  fi
  echo "$value" | gh secret set "$name" --repo "$REPO" 2>/dev/null
  echo "  ✅ $name configurado"
}

echo "📡 Supabase..."
set_secret "NEXT_PUBLIC_SUPABASE_URL" "$(get_env NEXT_PUBLIC_SUPABASE_URL)"
set_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$(get_env NEXT_PUBLIC_SUPABASE_ANON_KEY)"
set_secret "SUPABASE_SERVICE_KEY" "$(get_env SUPABASE_SERVICE_KEY)"

echo ""
echo "🤖 AI (Groq)..."
set_secret "GROQ_API_KEY" "$(get_env GROQ_API_KEY)"

echo ""
echo "🐙 GitHub..."
set_secret "GITHUB_TOKEN" "$(get_env GITHUB_TOKEN)"
set_secret "GITHUB_REPO" "$(get_env GITHUB_REPO)"

echo ""
echo "🔍 IndexNow..."
set_secret "INDEXNOW_API_KEY" "$(get_env INDEXNOW_API_KEY)"
set_secret "INDEXNOW_LOCATION_ID" "$(get_env INDEXNOW_LOCATION_ID)"

echo ""
echo "🌐 Google Indexing..."
set_secret "GOOGLE_INDEXING_API_KEY" "$(get_env GOOGLE_INDEXING_API_KEY)"

echo ""
echo "🔗 Site..."
set_secret "SITE_URL" "$(get_env SITE_URL)"

echo ""
echo "🔒 Cron/Admin..."
set_secret "CRON_SECRET" "$(get_env CRON_SECRET)"

echo ""
echo "✅ Todos os secrets configurados!"
echo ""
echo "📋 Proximos passos:"
echo "  1. Verifique em: https://github.com/$REPO/settings/secrets/actions"
echo "  2. O workflow roda automaticamente as 3h UTC diariamente"
echo "  3. Para testar: Actions > Generate Content > Run workflow"
