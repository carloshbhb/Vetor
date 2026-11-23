# Biblioteca de prompts e direções criativas de vídeo — Vetor

Biblioteca interna inspirada em referências públicas de produção de vídeo com Claude Opus 5.5. Os textos abaixo são adaptações originais para a arquitetura do Vetor, não cópias integrais dos prompts de terceiros.

## Fontes
- [yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) — acervo amplo de prompts e exemplos: motion graphics, explicadores, cenas 3D, jogos e animações.
- [joeseesun/opus-video-prompts](https://github.com/joeseesun/opus-video-prompts) — coleção curada de 18 prompts completos e 54 casos, com foco em fluxos reproduzíveis.
- [High-End Product Video](https://youmind.com/video-prompts/high-end-product-video-prompt-11292)
- [Danny Stuart — Remotion promo workflow](https://dannystuart.substack.com/p/claude-code-opus-remotion-agentic-promo-video)
- [High-End Motion Video System](https://x.com/everestchris6/status/2104965415164399895)

## Como usar
1. Escolher a direção visual com base no tipo de produto, objetivo e mídia realmente disponível.
2. Remotion permanece o renderizador principal. Esta biblioteca orienta a direção criativa; não instala outro renderizador nem troca o pipeline.
3. Aplicar a direção como opt-in por vídeo/template, sem alterar o comportamento padrão da fila.
4. Criar storyboard com timestamps antes de animar.
5. Renderizar um trecho de teste, inspecionar quadros e corrigir problemas antes do render final.
6. Manter QA e aprovação separados do upload. Pilotos não publicam automaticamente.

## Restrições obrigatórias
- Não alterar Supabase, fila, agendamento, cotas, YouTube OAuth, workflows de produção ou credenciais.
- Não mudar o TTS existente: Edge TTS, voz pt-BR-FranciscaNeural.
- Preservar sincronização com áudio, legendas por palavra, Remotion, FFmpeg e QA existentes.
- Não trocar Remotion por HyperFrames, HTML/Canvas ou outro motor como padrão.
- Não adicionar dependências de runtime só para reproduzir um prompt.
- Não inventar especificações, avaliações, preços, depoimentos, resultados, certificações ou funcionalidades.
- Usar assets reais disponíveis ou identificar claramente material conceitual. Não simular avaliações de consumidores.
- Música e efeitos precisam ter licença compatível com uso comercial.
- Segredos ficam em variáveis de ambiente; nunca em prompts, logs ou arquivos.
- Respeitar formato e FPS da composição de destino; não impor 60 fps a composições configuradas em 30 fps.

## Biblioteca
| Arquivo | Uso |
|---|---|
| [01 — High-end product motion](./01-high-end-product-motion.md) | Reviews e anúncios premium |
| [02 — Remotion product promo](./02-remotion-product-promo.md) | Motion graphics nativos em Remotion |
| [03 — Adaptive visual styles](./03-adaptive-visual-styles.md) | Seleção de linguagem visual por produto e mídia |
| [04 — Independent video critic](./04-independent-video-critic.md) | Revisão visual, narrativa e técnica |
| [05 — Storyboard and motion grammar](./05-storyboard-motion-grammar.md) | Continuidade, ritmo e transições |

## Proveniência
Os repositórios citados são índices e coleções de referências de terceiros. Os arquivos desta pasta sintetizam princípios e os adaptam ao produto Vetor. Consulte as fontes para acessar os prompts integrais, exemplos e créditos originais.
