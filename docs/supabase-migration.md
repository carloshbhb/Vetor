# 🚀 Migração para Supabase

## 📋 Resumo

Este guia explica como migrar o Vetor Blog do sistema de arquivos local (JSON) para o Supabase, banco de dados SQL com escalabilidade, segurança avançada e recursos em tempo real.

## 🎯 Benefícios da Migração

### ✅ Escala
- **Performance**: Busca otimizada com índices GIN
- **Conexões**: Suporte a milhares de usuários simultâneos
- **Armazenamento**: Sem limites de tamanho de arquivo
- **Backup**: Automático e redundante

### ✅ Segurança
- **Row Level Security (RLS)**: Controle de acesso granular
- **Autenticação**: Integração com auth do Supabase
- **SSL**: Conexões criptografadas
- **Audit**: Log de acesso e alterações

### ✅ Recursos Avançados
- **Busca Full-text**: Busca em português otimizada
- **Tempo Real**: Atualizações em tempo real para dashboard
- **Funções PostgreSQL**: Lógica complexa no banco
- **Webhooks**: Integrações automáticas

## 🔧 Configuração Inicial

### 1. Criar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie conta
3. Clique em "New Project"
4. Configure:
   - **Name**: `vetor-blog`
   - **Database Password**: senha forte
   - **Region**: preferencialmente `South America (São Paulo)`
5. Aguarde a criação (2-3 minutos)

### 2. Obter Credenciais

1. No painel do Supabase, vá em **Settings > API**
2. Copie:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key: `SUPABASE_SERVICE_ROLE_KEY`
3. Crie arquivo `.env.local` com:

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Instalar Dependência

```bash
npm install
```

## 🔄 Processo de Migração

### Passo 1: Configurar Banco de Dados

1. No painel do Supabase, vá em **SQL Editor**
2. Copie e execute o conteúdo de `supabase/schema.sql`
3. Verifique se as tabelas foram criadas

### Passo 2: Executar Migração

```bash
# Instalar dependência
npm install

# Rodar script de migração
npm run db:migrate
```

O script irá:
- ✅ Carregar reviews do arquivo `data/reviews.json`
- ✅ Transformar dados para formato do Supabase
- ✅ Inserir/atualizar registros no banco
- ✅ Verificar integridade dos dados

### Passo 3: Atualizar Código

O código já foi atualizado para usar Supabase (`lib/db.ts`). As APIs existentes funcionarão sem alterações.

## 📊 Estrutura do Banco de Dados

### Tabela: `reviews`

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE,
  status TEXT,
  product TEXT,
  category TEXT,
  -- ... outras colunas
  -- Campos JSONB para dados complexos
  hero_bars JSONB,
  specs JSONB,
  sections JSONB
);
```

### Índices para Performance

```sql
-- Busca por categoria
CREATE INDEX idx_reviews_category ON reviews(category);

-- Busca por status
CREATE INDEX idx_reviews_status ON reviews(status);

-- Busca full-text em português
CREATE INDEX idx_reviews_search ON reviews 
  USING GIN (to_tsvector('portuguese', product || ' ' || category));
```

### Segurança (RLS)

```sql
-- Permitir visualização apenas de reviews publicados
CREATE POLICY "Public can view published reviews" ON reviews
  FOR SELECT USING (status = 'published');

-- Permitir gerenciamento apenas para usuários autenticados
CREATE POLICY "Authenticated users can manage all reviews" ON reviews
  FOR ALL USING (auth.role() = 'authenticated');
```

## 🚀 Testes Pós-Migração

### 1. Testar APIs Locais

```bash
# Iniciar desenvolvimento
npm run dev

# Testar APIs
curl http://localhost:3000/api/reviews
curl http://localhost:3000/api/reviews/slug-do-review
```

### 2. Verificar Páginas

- ✅ Página inicial (`/`)
- ✅ Página de review (`/review/slug`)
- ✅ Dashboard admin (`/admin`)
- ✅ Formulário de criação (`/admin/novo-review`)

### 3. Performance

```bash
# Build do projeto
npm run build

# Verificar se build completo
npm run start
```

## 🔧 Configuração Adicional

### 1. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Para fallback em desenvolvimento
SUPABASE_FALLBACK_TO_FILE=true

# Configuração de busca
NEXT_PUBLIC_SUPABASE_SEARCH_ENABLED=true
```

### 2. Monitoramento

Adicione estas variáveis para monitoramento:

```env
# Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id

# Logging
SUPABASE_LOG_LEVEL=info
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. "Credentials not configured"

**Solução**: Verifique se `.env.local` está correto e reinicie o servidor.

#### 2. "Rate limit exceeded"

**Solução**: Adicione delay entre requisições no script de migração.

#### 3. "Data mismatch"

**Solução**: Execute `npm run db:migrate` novamente para sincronizar.

### Verificação de Dados

```sql
-- Contar reviews
SELECT COUNT(*) FROM reviews;

-- Verificar reviews publicados
SELECT COUNT(*) FROM reviews WHERE status = 'published';

-- Buscar reviews por categoria
SELECT category, COUNT(*) FROM reviews GROUP BY category;
```

## 📈 Próximos Passos

### 1. Otimizações

- [ ] Adicionar cache Redis
- [ ] Implementar busca em tempo real
- [ ] Adicionar sistema de comentários
- [ ] Integração com analytics

### 2. Monitoramento

- [ ] Configurar Vercel Analytics
- [ ] Adicionar Sentry para erros
- [ ] Monitoramento de performance

### 3. Escala

- [ ] Configurar CDN para imagens
- [ ] Adicionar sistema de filas
- [ ] Otimizar para SEO técnico

## 📞 Suporte

- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Issues**: Reportar no repositório Vetor
- **Discord**: Supabase Community Discord

---

✅ **Pronto para migração!** Execute `npm run db:migrate` para começar.