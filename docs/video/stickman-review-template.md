# Stickman Review — Remotion

## Objetivo

O template `stickman-review` replica, sem dependência do Digital Maker AI, a ideia de um personagem recorrente que acompanha a análise de um produto. No Vetor, o personagem é vetorial e animado no Remotion: pisca, oscila, muda os gestos e assume poses adequadas à cena. As imagens reais do produto continuam sendo a referência visual.

## Como usar na fila

1. Abra `/admin/videos`.
2. Adicione uma URL de produto do Mercado Livre, Amazon ou Shopee.
3. Selecione **Stickman 2D · vídeo longo 16:9**.
4. Agende o produto.

A escolha grava um marcador explícito em `video_queue.media_assets`. Sem esse marcador, o fluxo mantém o template editorial atual. Shorts e vídeos padrão não mudam.

## Composição

- `video/src/compositions/StickmanReviewLandscape.tsx`: personagem, poses, balões, cartão de produto, abertura, cenas e veredito.
- `video/src/Root.tsx`: composição `StickmanReviewLandscape`.
- `video/src/utils/renderVideo.ts`: seleciona a composição pelo `templateId`.
- `video/scripts/stickman-template.mjs`: valida o opt-in e bloqueia uso fora de vídeo longo.
- `video/scripts/process-video.mjs`: quando o marcador existe, força Remotion; o restante do pipeline conserva seu renderizador configurado.

## QA e publicação

O render passa pelo gate de vídeo longo `yt-landscape`, que verifica leitura das legendas, dead air e zonas seguras. O piloto de referência usa Edge TTS em português e não faz upload. A publicação só acontece quando um vídeo é processado normalmente pela fila e passa pelos guardrails já existentes.

## Piloto de referência

Produto: Samsung Galaxy Fit3 Rosa Nude

Review: https://www.vetor.blog/reviews/samsung-galaxy-fit3-rosa-nude-review

Arquivo gerado no piloto independente: `video/out/stickman-galaxy-fit3-remotion.mp4`.

O template não chama o Digital Maker AI durante a renderização. Assim, a execução normal do estilo não consome imagens ou minutos daquele serviço.
