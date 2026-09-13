#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vetor Blog - Supabase Schema Setup
# Execute: bash scripts/setup-supabase.sh
# Requer: supabase CLI autenticado (supabase login)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "🔧 Configurando Supabase schema..."
echo ""

# Verificar se o Supabase CLI esta instalado
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI nao encontrado!"
  echo "   Instale: npm install -g supabase"
  echo "   Ou execute o SQL manualmente no Supabase Dashboard"
  echo ""
  echo "📋 SQL para executar manualmente:"
  echo "   Abra: https://supabase.com/dashboard"
  echo "   Va em: SQL Editor"
  echo "   Cole o conteudo de: supabase/schema.sql"
  echo "   Clique em: Run"
  exit 1
fi

# Verificar se esta logado
if ! supabase status &> /dev/null; then
  echo "❌ Supabase CLI nao esta logado!"
  echo "   Execute: supabase login"
  exit 1
fi

echo "📝 Executando schema SQL..."
supabase db push

echo ""
echo "✅ Schema configurado!"
echo ""
echo "📋 Verifique em: https://supabase.com/dashboard"
echo "   Va em: Table Editor"
echo "   Verifique tabelas: reviews, viral_articles"
