# Keyword Clusters & Content Briefs — vetor.blog

> **Escopo:** P4-1 (keyword research → clusters de intenção de compra pt-BR) + P4-2 (content briefs orientados a prioridade → novos artigos).
> **Data:** 2026-09-23 · **Idioma:** pt-BR · **Canonical:** `https://www.vetor.blog`
> **Nota sobre volume:** não há acesso a ferramentas pagas (Ahrefs/SEMrush) neste ciclo. Todos os volumes estão marcados como **unknown/heuristic**; o ranking é por *intent fit* com o marketplace (Mercado Livre) e com o surface existente do site.

---

## 1. Superfície atual de conteúdo

| Tipo de página | Rota | Status |
|---|---|---|
| Review unitária | `/reviews/[slug]` | Ativo (Supabase + 4 fallbacks estáticos) |
| Hub de categoria | `/reviews/categoria/[category]` | Ativo — 17 hubs SSG |
| Índice de categorias | `/reviews/categoria` | Ativo |
| Comparativo viral | `/comparativos/[slug]` | Ativo |
| Índice de comparativos | `/comparativos` | Ativo |
| Institucionais | `/sobre`, `/metodologia`, `/contato`, `/privacidade` | Ativo |

**Reviews no fallback estático (referência de cobertura mínima):**

- `samsung-galaxy-fit3` — Wearables
- `redmi-watch-5` — Wearables
- `airpods-pro-2` — Fones de Ouvido
- `macbook-air-m3` — Notebooks

**Categorias com backlog em `product_links` (seed) sem review publicada no fallback:** Celulares e Smartphones, Tablets, Casa Inteligente, Acessórios para Games, Câmeras de Segurança, Eletroportáteis, Áudio Profissional.

**Formato dominante ausente:** o site hoje só publica reviews unitárias e hubs de categoria (páginas de listagem). **Não existe nenhum artigo de intenção de compra** no formato "melhor X" / "X custo-benefício" / "X vale a pena" — exatamente o formato que domina o SERP pt-BR (TechTudo, Olhar Digital, O Comparador, AnalisaMelhor).

---

## 2. Clusters de palavras-chave (P4-1)

Volume: **unknown/heuristic** em todos · Prioridade: P1 = imediato, P2 = segundo lote, P3 = exploratório.

| # | Keyword primária | Secundárias (pt-BR) | Intent | Slug sugerido | Categoria | Tipo | Pri |
|---|---|---|---|---|---|---|---|
| 1 | melhor fone de ouvido bluetooth | melhor fone bluetooth custo benefício, fone sem fio bom e barato, melhor fone bluetooth até 200 reais | Commercial | `/comparativos/melhor-fone-bluetooth` | Fones de Ouvido | comparison | **P1** |
| 2 | melhor smartwatch custo benefício | melhor smartwatch barato, melhor pulseira inteligente, smartwatch que vale a pena | Commercial | `/comparativos/melhor-smartwatch-custo-beneficio` | Wearables | hub | **P1** |
| 3 | melhor celular custo benefício | melhor celular barato, melhor celular até 1000 reais, celular bom e barato 2026 | Commercial | `/comparativos/melhor-celular-custo-beneficio` | Celulares e Smartphones | hub | **P1** |
| 4 | melhor notebook custo benefício | melhor notebook barato, notebook bom e barato, melhor notebook para trabalho | Commercial | `/comparativos/melhor-notebook-custo-beneficio` | Notebooks | hub | **P2** |
| 5 | melhor câmera de segurança wifi | melhor câmera de segurança para casa, câmera de segurança sem fio, melhor câmera intelbras ou tp-link | Commercial | `/comparativos/melhor-camera-seguranca-wifi` | Câmeras de Segurança | hub | **P2** |
| 6 | melhor headset gamer | melhor headset gamer barato, headset com microfone bom, melhor fone gamer | Commercial | `/comparativos/melhor-headset-gamer` | Acessórios para Games | comparison | **P2** |
| 7 | melhor air fryer | melhor air fryer barata, air fryer custo benefício, melhor air fryer família | Commercial | `/comparativos/melhor-air-fryer` | Eletroportáteis | hub | **P3** |
| 8 | melhor robô aspirador | melhor robô aspirador barato, robô aspirador custo benefício, vale a pena robô aspirador | Commercial | `/comparativos/melhor-robo-aspirador` | Casa Inteligente | hub | **P3** |

### Racional de priorização (intent fit)

1. **Cluster 1 (fone bluetooth):** review `airpods-pro-2` já existe como âncora interna; seed tem 20+ SKUs de fones; categoria com hub SSG ativo.
2. **Cluster 2 (smartwatch):** duas reviews estáticas (Fit3, Redmi Watch 5) + 12 SKUs no seed; hub Wearables ativo.
3. **Cluster 3 (celular):** maior volume heurístico do mercado BR; 30+ SKUs no seed; **zero reviews** — lacuna crítica de topo de funil.
4. **Cluster 4 (notebook):** review `macbook-air-m3` como âncora; hub Notebooks ativo; intenção comercial forte.
5. **Cluster 5 (câmera wifi):** subnicho de Casa Inteligente com demanda recorrente; 4 SKUs duplicadas entre Casa Inteligente e Câmeras de Segurança.
6. **Clusters 6–8:** intenção comercial clara, porém menor aderência ao conteúdo existente; backlog de produtos já existe no seed.

---

## 3. Content briefs — top 5 clusters (P4-2)

Cada brief: **title tag (~60 chars)**, **meta description (~155 chars)**, **outline H2 (6–10)**, **links internos**, **notas de schema**, **notas de afiliado/CTA**.

---

### Brief 1 — Melhor fone de ouvido bluetooth (P1)

- **Tipo:** comparison · **Slug:** `/comparativos/melhor-fone-bluetooth` · **Categoria:** Fones de Ouvido
- **Title tag (58 chars):** `Melhor Fone Bluetooth 2026: 10 Modelos Testados e Comparados`
- **Meta description (154 chars):** `Descubra o melhor fone de ouvido bluetooth de 2026. Comparativo com preço, bateria, canceled ativo e qualidade sonora para comprar no Mercado Livre.`

**Outline (H2):**

1. Como escolhemos os melhores fones bluetooth
2. Melhor fone bluetooth geral: AirPods Pro 2
3. Melhor fone bluetooth custo-benefício
4. Melhor fone bluetooth até R$ 200
5. Melhor fone bluetooth com cancelamento de ruído
6. Fone bluetooth para academia: o que considerar
7. Comparativo completo: specs, bateria e preço
8. Vale a pena comprar fone bluetooth no Mercado Livre?
9. Perguntas frequentes (FAQ)

**Links internos:**

- Hub: `/reviews/categoria/fones-de-ouvido`
- Review âncora: `/reviews/airpods-pro-2`
- Índice: `/comparativos`
- Relacionados (quando publicados): reviews de Sony WF-1000XM5, JBL Tune 520BT, Redmi Buds 6 Pro (backlog no seed)

**Schema:** `Article` + `ItemList` (itens = modelos listados) + `FAQPage` no H2 9. Reaproveitar padrão de `ItemList` já usado em `/comparativos` (P1-2). Não inventar `aggregateRating` sem dados reais.

**Afiliado/CTA:** CTA por modelo → link `affiliate_url` do review correspondente quando existir; caso contrário, link direto ao `product_url` do seed (Mercado Livre), com `rel="sponsored nofollow"`.

---

### Brief 2 — Melhor smartwatch custo-benefício (P1)

- **Tipo:** hub · **Slug:** `/comparativos/melhor-smartwatch-custo-beneficio` · **Categoria:** Wearables
- **Title tag (57 chars):** `Melhor Smartwatch Custo-Benefício 2026: Guia de Compra`
- **Meta description (155 chars):** `Qual o melhor smartwatch custo-benefício em 2026? Comparamos Galaxy Fit3, Redmi Watch 5, Mi Band 9 e mais modelos baratos que valem a pena.`

**Outline (H2):**

1. O que torna um smartwatch custo-benefício
2. Melhor smartwatch custo-benefício geral
3. Melhor pulseira inteligente (smartband) barata
4. Melhor smartwatch para iPhone
5. Melhor smartwatch para Android
6. Tabela comparativa: preço, bateria e recursos
7. Onde comprar smartwatch barato no Mercado Livre
8. Vale a pena smartwatch de marca desconhecida?
9. Perguntas frequentes (FAQ)

**Links internos:**

- Hub: `/reviews/categoria/wearables`
- Reviews âncora: `/reviews/samsung-galaxy-fit3`, `/reviews/redmi-watch-5`
- Relacionados (seed): Xiaomi Mi Band 9, Apple Watch SE, Galaxy Watch 7, Amazfit Balance 2

**Schema:** `Article` + `ItemList` + `FAQPage`. Product schema apenas nas reviews individuais (não duplicar Product na página de lista).

**Afiliado/CTA:** tabela com coluna "Ver preço" → `affiliate_url` das reviews; CTA secundário para o hub de Wearables.

---

### Brief 3 — Melhor celular custo-benefício (P1)

- **Tipo:** hub · **Slug:** `/comparativos/melhor-celular-custo-beneficio` · **Categoria:** Celulares e Smartphones
- **Title tag (59 chars):** `Melhor Celular Custo-Benefício 2026: Top Modelos para Comprar`
- **Meta description (153 chars):** `Lista atualizada dos melhores celulares custo-benefício de 2026: Galaxy A56, Moto G86, iPhone 17 e mais, com preço no Mercado Livre e comparação.`

**Outline (H2):**

1. Como definimos o melhor celular custo-benefício
2. Melhor celular custo-benefício geral
3. Melhor celular até R$ 1.000
4. Melhor celular intermediário 5G
5. Melhor celular câmera barata
6. iPhone barato: vale a pena em 2026?
7. Tabela comparativa: chip, RAM, câmera e preço
8. Comprar celular no Mercado Livre: segurança e garantia
9. Perguntas frequentes (FAQ)

**Links internos:**

- Hub: `/reviews/categoria/celulares-e-smartphones` (confirmar slug exato no sitemap)
- Relacionados (seed, ainda sem review): Galaxy A56, Moto G86, iPhone 17, Poco X8 Pro — **priorizar geração de reviews via pipeline** para sustentar o hub
- Índice: `/comparativos`

**Schema:** `Article` + `ItemList` + `FAQPage`. Indicar `datePublished`/`dateModified` (campo do pipeline).

**Afiliado/CTA:** CTA por modelo; se review ainda não existir, link ao `product_url` do seed com `sponsored nofollow` e marcação interna para gerar review no próximo ciclo do pipeline.

---

### Brief 4 — Melhor notebook custo-benefício (P2)

- **Tipo:** hub · **Slug:** `/comparativos/melhor-notebook-custo-beneficio` · **Categoria:** Notebooks
- **Title tag (57 chars):** `Melhor Notebook Custo-Benefício 2026: Guia para Comprar`
- **Meta description (152 chars):** `Qual o melhor notebook custo-benefício de 2026? Comparamos MacBook Air M3, Acer Nitro, IdeaPad e modelos para trabalho e estudo.`

**Outline (H2):**

1. O que procurar em um notebook custo-benefício
2. Melhor notebook custo-benefício geral
3. Melhor notebook para trabalho e estudo
4. Melhor notebook gamer barato
5. MacBook Air M3: ainda vale a pena?
6. Tabela comparativa: processador, RAM, SSD e preço
7. Notebook novo ou recondicionado no Mercado Livre?
8. Perguntas frequentes (FAQ)

**Links internos:**

- Hub: `/reviews/categoria/notebooks`
- Review âncora: `/reviews/macbook-air-m3`
- Relacionados (seed): Acer Nitro V 15, Lenovo IdeaPad 3i, Samsung Galaxy Book4

**Schema:** `Article` + `ItemList` + `FAQPage`.

**Afiliado/CTA:** CTA "Ver oferta" por linha da tabela → review quando existir, senão `product_url` do seed.

---

### Brief 5 — Melhor câmera de segurança wifi (P2)

- **Tipo:** hub · **Slug:** `/comparativos/melhor-camera-seguranca-wifi` · **Categoria:** Câmeras de Segurança
- **Title tag (58 chars):** `Melhor Câmera de Segurança WiFi 2026: Modelos que Vale a Pena`
- **Meta description (155 chars):** `Melhor câmera de segurança wifi para casa em 2026: comparamos Intelbras iM3C, TP-Link Tapo C210/C500 e Xiaomi 2K com preço e qualidade de vídeo.`

**Outline (H2):**

1. Como escolher uma câmera de segurança wifi
2. Melhor câmera de segurança wifi para casa
3. Melhor câmera de segurança externa
4. Câmera de segurança 2K vs Full HD
5. Intelbras ou TP-Link: qual escolher?
6. Câmera com gravação na nuvem: custo mensal vale a pena?
7. Tabela comparativa: resolução, visão noturna e preço
8. Instalação e privacidade: o que saber antes de comprar
9. Perguntas frequentes (FAQ)

**Links internos:**

- Hub: `/reviews/categoria/cameras-de-seguranca` (confirmar slug no sitemap)
- Hub relacionado: `/reviews/categoria/casa-inteligente`
- Relacionados (seed): Intelbras iM3C, Tapo C210, Tapo C500, Xiaomi Mi Home Security Camera 2K

**Schema:** `Article` + `ItemList` + `FAQPage`. Cuidado com YMYL/segurança: não afirmar que câmera "impede" crimes; usar linguagem de monitoramento.

**Afiliado/CTA:** CTA por modelo → `product_url`/`affiliate_url`. Seção de privacidade (LGPD) reforçando uso doméstico.

---

## 4. Lacunas de cobertura identificadas

1. **Nenhuma página de intenção de compra existe.** O site só tem reviews unitárias e hubs de listagem — 0 artigos no formato "melhor X", que é o formato que domina o SERP pt-BR para as 8 keywords acima. Todos os briefs acima são conteúdo novo, não otimização de página existente.
2. **Categorias do seed sem nenhuma review publicada no fallback:** Casa Inteligente, Câmeras de Segurança, Acessórios para Games, Eletroportáteis, Tablets, Celulares e Smartphones e Áudio Profissional têm backlog de produtos, mas zero páginas de review no fallback estático — os hubs SSG dessas categorias podem estar vazios ou thin, e os briefs 3, 5, 6, 7 e 8 dependem de o pipeline publicar reviews primeiro para ter âncoras internas.

---

## 5. Próximos passos sugeridos (fora deste entregável)

1. Publicar Briefs 1–3 (P1) como páginas em `/comparativos/[slug]` (rota já existe).
2. Disparar o pipeline de reviews para pelo menos 1 SKU de Celulares, Câmeras e Casa Inteligente antes de publicar os hubs correspondentes.
3. Medir impressões/cliques no GSC após 2–4 semanas e reordenar prioridades P2/P3 com base em dados reais (preencher métricas no `SEO_LEDGER.md`).
4. Marcar P4-1 e P4-2 como done no `SEO_LEDGER.md` após revisão deste documento.
