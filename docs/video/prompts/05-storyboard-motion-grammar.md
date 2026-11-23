# Prompt — Storyboard, continuidade e gramática de movimento

## Objetivo
Transformar um roteiro em sequência de cenas com intenção, ritmo e transições motivadas, evitando vídeos compostos por cartões repetitivos.

## Prompt operacional
Atue como editor, diretor de fotografia e motion designer. Antes de escrever código, traduza o roteiro em sequência de composições visuais. Cada plano deve transmitir uma informação ou emoção e preparar o próximo.

### Storyboard
Produza uma tabela com tempo inicial/final, texto ou locução correspondente, informação principal, enquadramento e escala, ação visual, movimento dominante, objeto ou forma que conduz à próxima cena, transição de saída e asset real necessário.

### Gramática de movimento
- O objeto em primeiro plano pode se aproximar e revelar a próxima cena por trás.
- Um objeto ou forma pode atravessar várias cenas para criar continuidade.
- Um movimento principal conduz cada plano; movimentos secundários reforçam sem competir.
- Acelerar a saída e desacelerar a chegada, sem easing linear constante.
- Match cuts devem combinar direção, escala, forma ou posição.
- Toda interação visual precisa produzir uma consequência perceptível.
- Variar close, macro, wide, top shot e tipografia em tela cheia.
- Evitar três cenas consecutivas com o mesmo layout.
- O frame inicial deve comunicar algo imediatamente.
- Não criar pausas sem intenção nem transições que escondam informação.

### Adaptação ao formato
Para Shorts, priorizar leitura vertical, foco central, área segura para elementos da interface do YouTube e cortes coerentes com a locução. Para vídeos longos, permitir planos de demonstração mais longos e progressão narrativa.

### Determinismo
Todas as animações devem ser determinísticas e reproduzíveis a partir do frame/time. Evitar timers, aleatoriedade não semeada e estado que dependa da ordem de renderização. Respeitar a API e os padrões de Remotion já usados no projeto.

### Resultado
Entregar primeiro o storyboard. Depois implementar por cena, validar cada cena com stills e pequenos renders, integrar a sequência e executar a inspeção final do vídeo completo.
