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
│   │   │   ├── EditorialReview.tsx          # Short 9:16 (batidas, SFX, legenda por palavra)
│   │   │   ├── EditorialReviewLandscape.tsx # Vídeo longo 16:9
│   │   │   └── ComparisonVideo.tsx          # Comparativo
│   │   ├── components/BeatStage.tsx         # Palco das batidas + transição (wipe)
│   │   ├── styles/loadFonts.ts              # Fontes locais (public/fonts)
│   │   └── utils/
│   │       ├── renderVideo.ts               # Bundle + render (Remotion)
│   │       ├── timing.ts                    # Tempos exatos de cena (narração)
│   │       └── visual-storyboard.ts         # Modos visuais e plano de batidas
│   ├── scripts/
│   │   ├── process-video.mjs                # Worker: roteiro → TTS → render → QA → YouTube
│   │   ├── video-format.mjs                 # Legendas, tempos por palavra, título/descrição
│   │   └── generate-sfx.sh                  # Regenera public/sfx (whoosh, pop) com ffmpeg
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
Os Shorts usam `video/src/compositions/EditorialReview.tsx` e os longos `EditorialReviewLandscape.tsx`. Roteiro, imagens, áudio do `edge-tts` e B-roll entram como propriedades da composição. O Studio abre com `cd video && npm start`. Comparativos usam `ComparisonVideo.tsx`.

**Como o Short é montado**
- **Sincronia**: o worker mede o início de cada cena pelas palavras realmente faladas (`WordBoundary` do Edge TTS, `buildNarrationTimings`). Se as palavras não casarem 1:1 com o roteiro, usa a estimativa proporcional (com aviso no log). O `renderVideo.ts` respeita esses tempos e a duração real do áudio.
- **Batidas**: cada cena é dividida em batidas de ~2,6 s (`planSceneBeats`): produto, macro, card de especificação, foto da galeria e B-roll, com transição entre elas.
- **Legenda**: a palavra falada é destacada em amarelo, com tempos reais por palavra.
- **Áudio**: narração normalizada a -14 LUFS (`NARRATION_LOUDNORM=false` desliga), efeitos `whoosh`/`pop` em `video/public/sfx` e trilha opcional pela propriedade `musicUrl` (volume baixo sob a voz).
- **Fontes**: Inter e Space Grotesk locais em `video/public/fonts` (licença OFL); nada é baixado durante o render.
- **Encode**: H.264 `yuv420p`, BT.709, CRF 18, áudio 192 kbps. Variáveis: `REMOTION_CONCURRENCY` (padrão 2), `REMOTION_CHROME_PATH` e `REMOTION_CHROME_MODE=chrome-for-testing` para usar um Chrome já instalado.

**Testes**: `node video/scripts/video-format.test.mjs`, `visual-storyboard.test.mjs`, `timing.test.mjs` e `node video/hyperframes/library.test.mjs`; tipos com `cd video && npx tsc --noEmit`.

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
