# Prompt — Adaptive Visual Style Selector

## Objetivo
Escolher uma linguagem visual adequada ao produto e aos assets, ou obedecer a um estilo explicitamente selecionado pelo operador.

## Prompt operacional
Atue como diretor criativo e supervisor de pós-produção. Analise produto, categoria, promessa, público, roteiro, duração e mídia disponível. Escolha uma linguagem visual principal e, no máximo, uma secundária. Explique por que ela é adequada.

### Catálogo de direções
| Estilo | Quando usar | Recursos visuais |
|---|---|---|
| Premium Product 3D | Design, acabamento, materiais, eletrônicos | Hero shot, órbita lenta, macro, luz de recorte |
| Exploded Teardown | Construção interna ou peças relevantes | Separação de camadas, callouts, remontagem |
| High-End Minimal | Bons assets reais e benefício simples | Espaço negativo, tipografia precisa, match cuts |
| Kinetic Typography | Hook, promessa, comparação e números confirmados | Tipografia em escala, máscaras e ritmo |
| Editorial Explainer | Recursos, especificações e educação | Diagramas, gráficos, destaques e callouts |
| Hand-Drawn / Line Art | Conceitos abstratos ou narrativa | Traços animados, ilustração e transições desenhadas |
| Stickman / Character Host | Review leve, humor e explicação | Personagem recorrente, poses, balões e demonstração |
| Pixel Art | Produto gamer, nostalgia ou conteúdo lúdico | Sprites, paleta restrita e animação quantizada |
| Three.js Spatial | Forma, escala, mecanismo ou espaço 3D relevante | Modelos, câmera e iluminação 3D |
| UI Morph / Interface Motion | Apps, telas, interfaces e produtos digitais | Estados de UI, cursor, morphs e microinterações |
| Cinematic Editorial | Narrativa, história e comparação | Planos amplos, continuidade e ritmo cinematográfico |

### Regras de seleção
- Se o operador indicar um estilo, respeitá-lo; não substituí-lo por decisão automática.
- Sem escolha explícita, selecionar pelo menos uma opção adequada ao produto e aos assets.
- Não escolher 3D se não houver benefício visual ou explicativo.
- Não simular filmagem real com formas geométricas simples quando o produto depende de detalhes físicos.
- Com apenas uma imagem, usar composição, recorte, parallax e tipografia com cuidado; não fingir que existem vários ângulos reais.
- Com galeria, distribuir os assets por cenas e evitar repetir a mesma imagem em sequência.
- Com vídeo real, priorizar material real para demonstrar uso, escala e acabamento.
- Não misturar estilos sem justificativa narrativa.
- A escolha não pode degradar legibilidade, sincronização da locução ou compreensão.

### Saída estruturada
Retorne primaryStyle, secondaryStyle (ou null), reason, assetRequirements, motionLanguage, transitionLanguage, riskChecks e storyboard.

A saída deve ser compatível com o registro de templates visuais do Vetor. Não criar identificadores de template que ainda não existam no código sem primeiro implementar e testar o componente.
