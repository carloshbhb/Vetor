# Vetor — HyperFrames Professional Video Library

Motor prioritário HTML-to-video. A biblioteca compõe vídeos de forma determinística a partir do storyboard, assets locais e timestamps de narração. O áudio continua no Edge TTS pt-BR-FranciscaNeural.

## Templates autorais
- shorts-retention: Shorts verticais, hook editorial, captions sincronizadas, cenas rápidas e CTA final.
- product-editorial: reviews longos, fotografia real, movimentos de câmera e lower-thirds.
- comparison-editorial: comparativos com hierarquia visual equilibrada.
- cinematic-review: hero premium, imagens em camadas e encerramento de marca.

## Componentes reutilizáveis
Product Stage, Product Gallery, B-roll Cutaway, Kinetic Caption Sequence, Scene Focus, Editorial Lower Third, Motion Presets, Ambient Light, Film Grain, Vetor Brand Outro e Progress Rail.

## Catálogo oficial selecionado
A biblioteca referencia logo-outro, data-chart, app-showcase, flash-through-white, transitions-radial e grain-overlay do catálogo HyperFrames. Execute npm run hyperframes:catalog no diretório video para instalá-los em video/hyperframes/catalog-workspace. Os samples oficiais contêm branding e dados demonstrativos; personalize tudo antes de publicar e nunca publique métricas fictícias.

## Comandos
- npm install --global hyperframes@0.9.2
- hyperframes doctor
- node video/hyperframes/library.test.mjs
- node video/hyperframes/smoke-render.mjs
- npm run hyperframes:catalog

## Contratos de produção
- Raiz HTML com data-composition-id, data-width e data-height.
- Elementos visuais temporizados com class=clip, data-start, data-duration e data-track-index.
- Narração em faixa de áudio; B-roll silenciado.
- GSAP carregado localmente; não há scripts/fontes remotos durante render.
- hyperframes lint antes do render; ffprobe valida codec, duração, resolução e orientação.
- HyperFrames é prioritário; Remotion fica como fallback explícito.
- O gate de legibilidade, dead-air e safe-zones continua bloqueando uploads.
- Fila, cotas, Edge TTS, links afiliados, OAuth e publicação YouTube permanecem no worker atual.

## Licença
HyperFrames é Apache License 2.0. As referências ao catálogo são instaladas pelo CLI oficial; o projeto não redistribui cópias modificadas desses templates. Consulte THIRD_PARTY_NOTICES.md.
