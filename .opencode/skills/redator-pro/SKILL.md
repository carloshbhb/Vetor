---
name: redator-pro
description: Expert copywriter for vetor.blog — SEO reviews, video scripts, hooks, CTAs, readability optimization, E-E-A-T content. Use when creating, editing, or reviewing written content (reviews, scripts, prompts, metadata, descriptions).
---

# Redator Pro

Expert rules for writing high-converting, SEO-optimized content for this review blog (vetor.blog, Next.js, Portuguese/Brazil).

## 1. Voice & Tone

### Brand Voice
- **Friendly expert**: Write like a knowledgeable friend recommending a product, not a textbook or a sales page.
- **Honest & specific**: Real pros AND real cons. "Esse produto tem GPS, mas a precisão é ruim em trilha" beats "Excelente GPS" every time.
- **Direct & scannable**: No fluff. Every sentence earns its place. Lead with the insight, not the setup.

### Tone Matrix by Content Type
| Type | Tone | Example opener |
|------|------|----------------|
| Review (main) | Misto: técnico + acessível | "Testamos o Galaxy Fit 3 por 14 dias. A pulseira surpreendeu — mas com ressalvas." |
| Video script | Conversacional, 3ª pessoa | "Cansado de se preocupar com a segurança da sua casa?" |
| Comparison/Top 5 | Objetivo, dados-driven | "Comparamos 5 smartwatches entre R$100 e R$300. Só 2 valem o preço." |
| Veredicto | Assertivo, sem rodeios | "Nota 8.5/10. Vale a pena se você quer saúde + style por menos de R$200." |
| FAQ | Direto, 1 frase resposta | "Sim, tem GPS. Mas a precisão cai 30% em trilhas sem sinal." |

### Prohibited Patterns
- "Na verdade", "praticamente", "disparado", "sem dúvidas" → fluff, remove
- "Um dos melhores da categoria" → vago, either say "o melhor" or quantify
- Passive voice overload ("A tela é caracterizada por ter") → use active ("A tela atinge 1.000 nits")
- Excessive "-mente" adverbs → max 1 per paragraph
- H1/H2 inside review sections → only H3 for subtopics
- Inventar URLs de imagem → never, system fetches real images

## 2. Readability Standards (Non-Negotiable)

### Sentence Rules
- **Max 25 words** per sentence, target avg **18 words**
- **Direct order**: Subject + Verb + Object. No nested subordinates.
- **Paragraph cap**: 2-4 sentences, max 80-90 words. Mobile-first scannability.
- **Jargon simplification**: "fluoroelastômero" → "silicone médico (fluoroelastômero)"

### Target Metrics
- **Gulpease > 70** (Italian readability index)
- **Flesch > 75** (easy reading)
- **Avg paragraph**: 3-4 sentences
- **Bullets/lists**: At least 1 per 300 words

### Grammar Rigor
- "A falta de GPS e NFC **é** a única limitação" (not "são")
- Concordância nominal impecável
- Zero typos in product names (never "Samsung" → "Samung")

## 3. SEO Writing Rules

### Title (meta.title)
- **50-60 characters** exactly
- Primary keyword in first position
- Include year (2026) for freshness signal
- Format: `[Product] vale a pena? Análise completa #shorts` or `[Product]: review completo com preço e spéc`

### Meta Description
- **130-160 characters** exactly
- Include product name + one key benefit + CTA
- Format: `Review do [Product]: [benefit]. Comparamos com [concorrente]. Nota [X]/10. Veja preço e análise completa.`

### Keywords
- Minimum **3** per review
- Include: product name, category, "vale a pena", "review", "análise"
- Long-tail: "[product] vs [concorrente]", "[product] [year]"

### Internal Linking (per review)
- Link to 2-3 **sibling reviews** in same category
- Link to category hub page
- Use descriptive anchors: "review completo do [product]", NOT "clique aqui"
- Anchor text must contain target keyword

### FAQ Section
- Minimum **5 Q&A pairs**
- Mine from Google "People Also Ask" for the product
- Each answer: 1-3 sentences, direct, no preamble
- Must include product name in at least 3 questions

## 4. Review Structure (Review Template)

Every review MUST follow this structure:

```
1. Hero (headline_line1 + headline_line2 + score)
2. Lead (3 sentences, hook + key insight + target audience)
3. Score Bars (5 attributes, realistic 0-10)
4. Specs (minimum 6)
5. Sections (minimum 6, 300-500 words each):
   - Design e Ergonomia
   - Qualidade de Tela/Display
   - Performance e Recursos
   - Sensores/Monitoramento (if applicable)
   - Autonomia de Bateria (real-world, not spec sheet)
   - Custo-Benefício Prático
6. Compare Table (product vs 2+ competitors)
7. Prós (minimum 5) + Contras (minimum 4, honest)
8. Veredicto (nota final, público-alvo, recomendação)
9. FAQ (minimum 5, optimized for PAA)
```

## 5. Video Script Rules

### Shorts (45-55s, ~130 words)
- **Hook (first 3s)**: Question or bold claim. "Cansado de se preocupar com...?" / "Essa câmera custa R$200 e tem..."
- **5-6 scenes**: Each 7-10s, narration (1-2 short sentences, friend-recommendation tone) + onScreenText (UPPERCASE, max 5 words, benefit/price focused)
- **CTA**: "Link da oferta na descrição" or similar
- **fullNarration**: Concatenation of all scene narrations → must be **200+ chars** (assertValidVideoScript gate)
- **Tags**: Product name + category + "vale a pena" + year

### Script Prompts (when editing lib/video-script.ts)
- Maintain `VideoScene` interface: `{ narration, onScreenText, durationSec, images[] }`
- Images: 2-3 per scene, varied angles (close-up, side, full product, practical use)
- onScreenText: MAX 5 words, UPPERCASE, benefit/price focused
- Narration: Portuguese, conversational, 1-2 sentences per scene

## 6. Content Generation Pipeline

### How it works (repo flow)
1. `lib/prompt.ts` → `buildPrompt()` generates the LLM prompt with all rules above
2. `lib/generate.ts` → `generateReview()` calls LLM (Gemini → Groq → OpenRouter fallback chain)
3. `lib/generate.ts` → `runSeoChecks()` validates: title length, description length, keywords count, word count (>800), FAQ count (≥4)
4. `app/api/cron/autonomous-agent/route.ts` → orchestrates the full cycle
5. `lib/video-script.ts` → `buildVideoScriptPrompt()` generates video script from review data

### When editing prompts
- Preserve the JSON output schema (it feeds directly to the UI components)
- Maintain SEO check compatibility (`runSeoChecks` in generate.ts)
- Don't change field names (they map to Supabase columns and React components)
- Test with `npx tsc --noEmit` after changes

## 7. E-E-A-T in Writing

- **Experience**: Include "testamos por X dias", real measurements, specific scenarios
- **Expertise**: Use precise specs, compare with data, cite real-world performance
- **Authoritativeness**: Reference the review methodology, include comparison tables with real data
- **Trustworthiness**: Honest cons, affiliate disclosure, no misleading claims, price transparency

## 8. Anti-Patterns (Never Do)

1. "Este é o melhor produto que já testamos" → quantify with data
2. Generic pros: "Bom custo-benefício" → specific: "Custa R$149 e entrega o mesmo que o Mi Band 8 por R$80 a mais"
3. Missing cons → readers distrust perfect reviews. Always include 4+ real cons.
4. Stock photos → system fetches real images, never invent URLs
5. Keyword stuffing → natural language, keyword density 1-2%
6. Plagiarized content → always original, cite sources if referencing data
