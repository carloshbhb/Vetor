# YOUTUBE_DATA_API_KEY — setup

Chave de API do Google Cloud usada pelo pipeline de vídeo para pesquisar vídeos
relacionados no YouTube (Data API v3, `search.list`) e montar o brief de pesquisa
que alimenta o roteiro. Documentação operacional da feature de vídeo do Vetor Blog.

## Onde é usada

- `video/scripts/research-product.mjs` lê `process.env.YOUTUBE_DATA_API_KEY` e chama
  `https://www.googleapis.com/youtube/v3/search`.
- O resultado é cacheado em `reviews.research` (JSONB) e reusado por 30 dias.
- A pesquisa roda apenas para vídeos enfileirados (10/dia), não para todo o catálogo.

## Cota

- Free tier: 10.000 unidades/dia.
- Pipeline: ~10 buscas/dia × 100 unidades = ~1.000 unidades/dia.
- Sem pico de 29.100 unidades (a pesquisa é por vídeo enfileirado, não por item).

## 1. Criar o projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com/.
2. Selecione ou crie um projeto (ex.: `vetor-blog-video`).
3. Vá em **APIs & Services → Library**.
4. Busque **YouTube Data API v3** e clique em **Enable**.

## 2. Criar e restringir a chave de API

1. Vá em **APIs & Services → Credentials**.
2. Clique em **Create Credentials → API key**.
3. Copie a chave gerada.
4. Clique na chave criada para editá-la:
   - **API restrictions → Restrict key → YouTube Data API v3** (selecione apenas esta API).
   - **Application restrictions**: para uso em GitHub Actions, deixe **None** (os IPs dos runners variam). Se preferir restringir, use uma allowlist de IPs conhecidos.
5. Salve.

> A chave é gratuita e tem escopo somente-leitura (`youtube.readonly` implícito via `search.list`).
> Não use a chave OAuth do YouTube (`YOUTUBE_CLIENT_*`) para esta finalidade — são credenciais distintas.

## 3. Adicionar como GitHub Secret

No repositório GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

- **Name**: `YOUTUBE_DATA_API_KEY`
- **Value**: a chave copiada no passo 2.

## 4. Conectar ao workflow

Em `.github/workflows/render-videos.yml`, no step **Render and upload**, a variável de ambiente deve estar presente:

```yaml
env:
  ...
  YOUTUBE_DATA_API_KEY: ${{ secrets.YOUTUBE_DATA_API_KEY }}
```

Sem essa linha, `research-product.mjs` não encontra a chave e a busca no YouTube é pulada
(a pesquisa SERP via Gemini pode ainda rodar se `GOOGLE_AI_API_KEY` estiver presente).

## 5. Verificação

1. Dispare o workflow manualmente: **Actions → Render & Publish Videos → Run workflow**.
2. Nos logs do step **Render and upload**, confirme que a pesquisa foi executada
   (mensagens de `researchProduct` / `research`).
3. Se aparecer `YouTube search HTTP 403` ou `API key not valid`, revise as restrições da chave
   (passo 2) e o nome do secret (passo 3).
4. Se a pesquisa falhar, o item fica `pending` com `error_message` e será reprocessado no próximo cron.

## Pin manual do comentário CTA (YouTube Studio)

A YouTube Data API v3 **não suporta fixação de comentários** (não existe método de pin;
`comments` oferece apenas list/insert/update/delete/setModerationStatus e `commentThreads`
não tem campo `pinned`). O comentário CTA com o link de afiliado é postado
automaticamente (`buildCtaComment`), mas o operador precisa fixá-lo manualmente:

1. Abra o **YouTube Studio** (studio.youtube.com).
2. Vá em **Conteúdo → selecione o vídeo → Comentários**.
3. Encontre o comentário CTA (contém o link de afiliado).
4. Clique no menu de três pontos do comentário → **Fixar** (Pin).
5. Confirme.

Um clique por vídeo. O link de afiliado permanece visível no comentário e na descrição
independentemente do pin. Automação futura exigiria a API não-pública do YouTube Studio
(fora do escopo desta spec).

## Segurança

- A chave é somente-leitura e restrita à YouTube Data API v3.
- Nunca commite a chave no repositório; use apenas GitHub Secrets.
- Rotacione a chave se ela for exposta (Console → Credentials → Regenerate).