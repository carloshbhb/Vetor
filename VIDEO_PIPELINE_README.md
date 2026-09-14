# Vetor Blog - Automated Video Pipeline

Sistema completo de automação para criar vídeos de review de produtos e publicar no YouTube.

## 🎯 Pipeline Overview

```
┌─────────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Telegram   │───▶│   Extração   │───▶│  Roteiro │───▶│   TTS    │───▶│   Mídia  │───▶│ Remotion │───▶│ YouTube  │
│  Bot / Painel│    │  do Produto  │    │  (Groq)  │    │ (edge-tts)│   │ (Pexels) │    │  Render  │    │  Upload  │
└─────────────┘    └──────────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
       │                                                                                                      │
       └────────────────────────────────────── Supabase (Queue & Logs) ◀──────────────────────────────────────┘
```

## 📋 Features

- **Entrada**: Telegram Bot ou Painel Web na Vercel
- **Extração**: Scraping de Amazon, Shopee, Mercado Livre
- **Roteiro**: Groq (Llama 3.1) gera script focado em conversão
- **Locução**: edge-tts com vozes neurais Microsoft (pt-BR)
- **Mídia**: Imagens do produto + B-roll do Pexels (gratuito)
- **Render**: Remotion (React) com legendas dinâmicas
- **Deploy**: GitHub Actions (gratuito)
- **Banco**: Supabase Free Tier (queue, logs, status)
- **Publicação**: YouTube Data API v3 automática

## 🚀 Quick Start

### 1. Clone e Configure

```bash
git clone <repo>
cd vetor-blog
cp .env.example .env.local
# Edite .env.local com suas chaves
```

### 2. Instale Dependências

```bash
# Projeto principal
npm install

# Vídeos (Remotion)
cd video
npm install
cd ..

# Python para TTS
pip install edge-tts
```

### 3. Configure Supabase

Execute o schema no SQL Editor do Supabase:

```bash
# O arquivo supabase/schema.sql contém a tabela video_queue
```

### 4. Configure GitHub Secrets

No repositório GitHub > Settings > Secrets > Actions:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GROQ_API_KEY
PEXELS_API_KEY
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN
NEXT_PUBLIC_SITE_URL
GITHUB_ACTIONS_TOKEN (PAT com permissão repo)
```

### 5. Deploy na Vercel

```bash
vercel --prod
```

Configure as Environment Variables na Vercel com os mesmos valores do `.env.local`.

### 6. Configure Telegram Bot (Opcional)

```bash
# 1. Crie bot com @BotFather
# 2. Configure webhook:
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://seu-dominio.vercel.app/api/telegram/webhook&secret_token=<SECRET>"
```

## 📁 Estrutura do Projeto

```
vetor-blog/
├── src/
│   ├── lib/
│   │   ├── product-extractor.ts    # Scraping Amazon/Shopee/ML
│   │   ├── script-generator.ts     # Groq → roteiro viral
│   │   ├── tts.ts                  # edge-tts integration
│   │   ├── media-fetcher.ts        # Pexels B-roll + imagens
│   │   ├── video-orchestrator.ts   # Pipeline principal
│   │   └── supabase.ts             # Cliente Supabase
│   ├── app/
│   │   ├── api/
│   │   │   ├── video/queue/        # CRUD fila de vídeos
│   │   │   ├── video/process/      # Trigger processamento
│   │   │   └── telegram/webhook/   # Bot Telegram
│   │   └── admin/video-panel/      # Painel Web
│   └── components/                 # UI components
├── video/
│   ├── src/
│   │   ├── compositions/
│   │   │   ├── ReviewVideo.tsx     # Template review c/ legendas
│   │   │   └── ComparisonVideo.tsx # Template comparação
│   │   ├── utils/renderVideo.ts    # Script de render
│   │   └── scripts/
│   │       ├── process-video.js    # Pipeline completo (Node)
│   │       └── upload-to-youtube.js # Upload YouTube API
│   └── package.json
├── .github/workflows/render-videos.yml  # GitHub Actions
├── supabase/schema.sql             # Schema BD
└── .env.example                    # Template de variáveis
```

## 🔧 Como Usar

### Via Telegram Bot
1. Envie `/start` para ver ajuda
2. Cole link do produto (Amazon/Shopee/ML)
3. Bot confirma agendamento
4. Use `/status <ID>` para acompanhar

### Via Painel Web
1. Acesse `/admin/video-panel`
2. Cole link do produto
3. Clique "Agendar Vídeo"
4. Clique "Processar" quando quiser renderizar

### Via API (Programático)

```bash
# Agendar vídeo
curl -X POST https://seu-dominio.vercel.app/api/video/queue \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"productUrl": "https://amazon.com.br/dp/B0XXXXX"}'

# Processar fila
curl -X POST https://seu-dominio.vercel.app/api/video/process \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"processAll": true}'
```

### Via GitHub Actions (Agendado)
- Roda a cada 6 horas automaticamente
- Processa até 3 vídeos pendentes por execução
- Trigger manual: Actions > Render & Publish Videos > Run workflow

## 💰 Custos (Todos Free Tier)

| Serviço | Limite Gratuito | Nosso Uso |
|---------|----------------|-----------|
| Supabase | 500MB DB, 2GB bandwidth | ~50 vídeos/mês |
| Groq | 14.4M tokens/dia | ~200 vídeos/dia |
| Pexels | 200 req/hora | ~50 vídeos/dia |
| GitHub Actions | 2000 min/mês | ~100 vídeos/mês |
| YouTube API | 10.000 unidades/dia | ~100 uploads/dia |
| edge-tts | Ilimitado (local) | Ilimitado |
| Vercel | 100GB bandwidth | Hospedagem web |

## 📊 Monitoramento

- **Supabase Dashboard**: Tabela `video_queue` com status em tempo real
- **GitHub Actions**: Logs de render e upload
- **Telegram Bot**: Notificações de conclusão/erro
- **Painel Admin**: Interface visual completa

## 🛠️ Desenvolvimento Local

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Remotion Studio (preview vídeos)
cd video && npm start

# Terminal 3: Testar pipeline completo
cd video && npm run process-video <video-id> '<json-do-video>'
```

## 🔐 Segurança

- Todas as APIs protegidas com `CRON_SECRET`
- Telegram webhook validado com `TELEGRAM_WEBHOOK_SECRET`
- Service Role Key apenas no servidor (GitHub Actions + Vercel)
- RLS no Supabase para acesso controlado

## 📝 Customização

### Alterar Voz do TTS
Edite `src/lib/tts.ts`:
```typescript
const BRAZILIAN_VOICES = [
  'pt-BR-AntonioNeural',  // Masculino formal
  'pt-BR-FranciscaNeural', // Feminino
  'pt-BR-ThiagoNeural',    // Masculino casual (padrão)
  'pt-BR-IsabelaNeural',   // Feminino jovem
];
```

### Alterar Template de Vídeo
Edite `video/src/compositions/ReviewVideo.tsx` ou `ComparisonVideo.tsx`

### Adicionar Marketplaces
Edite `src/lib/product-extractor.ts` - adicione seletores CSS

## 🐛 Troubleshooting

### Erro: "edge-tts not found"
```bash
pip install edge-tts
# Verifique se está no PATH
which edge-tts
```

### Erro: "FFmpeg not found"
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# Mac
brew install ffmpeg

# Windows
# Baixe de ffmpeg.org e adicione ao PATH
```

### Erro: "Remotion render timeout"
- Aumente timeout no workflow: `timeout-minutes: 60`
- Reduza duração do vídeo (menos cenas)

### Vídeo não sobe para YouTube
- Verifique `YOUTUBE_REFRESH_TOKEN` não expirou
- Confirme quota YouTube API > 0
- Veja logs em GitHub Actions > upload-to-youtube step

## 📄 Licença

MIT License - Use livremente para projetos pessoais ou comerciais.

---

**Desenvolvido para Vetor Blog** 🚀
Automação completa: Link → Vídeo → YouTube