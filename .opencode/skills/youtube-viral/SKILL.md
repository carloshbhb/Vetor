---
name: youtube-viral
description: YouTube virality specialist — packaging engineering (title+thumbnail CTR), script architecture (hooks, pacing, open loops, seamless shorts loops), algorithm reading (retention graphs, AVD, traffic sources), and trend/outlier analysis. Use when creating, optimizing, or auditing YouTube content, scripts, thumbnails, titles, descriptions, tags, or upload strategy in this repo.
---

# YouTube Virality Specialist

Expert rules for maximizing views, CTR, and retention on YouTube — both Shorts and long-form. This skill governs all video content in this repo (Remotion-rendered review shorts, autonomous video pipeline).

## 1. Packaging Engineering (CTR Optimization)

### Title-Thumbnail (T&T) Pair
The video is won or lost before the click. Title and thumbnail must work as a **pair**, never repeat the same message.

| Principle | Rule | Example |
|-----------|------|---------|
| **Complement, don't repeat** | Title says X, thumbnail shows Y. Together they create a curiosity gap. | T: "Sobrevivi 5 Dias no Deserto" / TH: Image of a countdown clock + "Apenas 5% de água restante" |
| **One message per element** | Title = hook + keyword. Thumbnail = visual proof or counterpoint. Never cram both with text. | T: "R$199 vs R$1.999" / TH: Side-by-side product photos with score overlay |
| **Curiosity gap** | Create a tension between what's promised and what's withheld. The viewer MUST click to resolve it. | T: "Isso muda tudo sobre smartwatches" / TH: Close-up of a spec sheet with one value redacted |
| **Max 6 words on thumbnail** | Readable at 320px wide (mobile feed). Font: bold sans-serif, high contrast stroke. | ✅ "R$199 SURPREENDEU" ❌ "Análise completa do Galaxy Fit 3 com preço e specs" |

### Psychological CTR Triggers
Apply **at least 2** per video:

1. **Contraste de alto impacto**: Visual juxtaposition (before/after, cheap/expensive, tiny/huge)
2. **Quebra de expectativa**: Thumbnail contradicts what title implies ("Parece caro... mas custa R$99")
3. **Desafio contra o tempo**: Countdown, deadline, "em 24h vou..."
4. **Desproporção**: Something unnaturally large/small/fast/slow relative to context
5. **Urgência**: Limited availability, price dropping, "só restam X"
6. **Prova visual**: Screenshot of data, real measurement, side-by-side result
7. **Rosto humano com emoção**: Genuine surprise, frustration, excitement (stock faces kill CTR)

### Thumbnail Generation Prompts
When generating image prompts (for AI image tools or Remotion composition):
- **Composition**: Rule of thirds, subject off-center, clean background
- **Focal point**: ONE clear subject. No visual clutter.
- **Mobile-first**: Must be readable at 320×180px (YouTube mobile feed)
- **Text budget**: Max 6 words, 2 font sizes (headline + supporting), white/black stroke
- **Color psychology**: Red/orange = urgency, Blue = trust, Green = money/savings, Yellow = attention
- **Face scale**: If using a face, it should fill 30-40% of the frame minimum

### Title Engineering
- **Max 60 chars** (YouTube truncates at ~60 on desktop, ~40 on mobile)
- **Primary keyword in first position** (SEO + algorithm signal)
- **Include year** for freshness: "[Product] 2026: vale a pena?"
- **Power words**: "vs", "testado", "comparativo", "verdade", "não compraria", "surpreendeu"
- **Number anchoring**: "5 motivos", "R$199 vs R$999", "3 erros"
- **Shorts-specific**: Add `#shorts` at end, keep under 50 chars for full mobile display

## 2. Script Architecture & Retention

### Hook (First 3-5 seconds)
The hook must **deliver the title's promise immediately** and establish the video's conflict/goal. No intros, no logos, no "hey guys".

**Hook formulas for review shorts:**
1. **Dor + preço**: "Cansado de pagar caro? Esse aqui custa R$199 e entrega tudo."
2. **Quebra de expectativa**: "Parece premium. Custa R$99. Mas tem um problema."
3. **Desafio**: "Testei por 30 dias. Aqui tá o que ninguém fala."
4. **Dado brutal**: "Essa tela tem 1.000 nits. O concorrente tem 400. Preço: metade."
5. **Pergunta direta**: "Vale a pena trocar sua Mi Band por isso?"

**Shorts hook rules:**
- First 1s = visual hook (text overlay or product close-up)
- First 3s = verbal promise (what the viewer will learn/see)
- NO "Oi, tudo bem?" / "Beleza galera" / channel intro. EVER.

### Pacing & Tension Structure
Structure every video with information/entertainment peaks every **45-60 seconds** (long-form) or every **7-10 seconds** (Shorts).

**Long-form pacing map:**
```
0:00-0:30  → Hook + Promise (why this video matters)
0:30-2:00  → Context + Specs (compressed, visual-heavy)
2:00-4:00  → Deep dive #1 (design, first impressions)
4:00-6:00  → Deep dive #2 (performance, real-world use)
6:00-8:00  → Comparison table + Pros/Cons
8:00-9:00  → Verdict + CTA
```

**Shorts pacing (45-55s):**
```
0-3s   → Hook (pain/desire + price)
3-12s  → Solution: 3 practical benefits (NOT cold specs)
12-30s → Proof: score + "tested/approved" + 1 honest con
30-45s → Close: price + CTA + final impression
```

### Open Loops (Narrative Threading)
- Open a question early that's only resolved near the end
- "Mas tem um problema que ninguém fala..." → viewer stays to find out
- "No final eu vou revelar o que me surpreendeu de verdade"
- In Shorts: the hook itself is the open loop. The entire video IS the resolution.

### Seamless Shorts Loops
For Shorts that auto-replay:
- **End sentence must complete the start**: "E é por isso que..." → cuts to beginning → "Vale a pena"
- **Visual loop**: Last frame matches first frame composition (same angle, same product position)
- **Audio loop**: End on an incomplete phrase or rising intonation
- **Text loop**: Final onScreenText sets up the hook text

## 3. Algorithm Reading (Analytics Decoding)

### Retention Graph Analysis
| Pattern | Diagnosis | Fix |
|---------|-----------|-----|
| Sharp dip at 0:05-0:15 | Weak hook, title mismatch | Rewrite hook, ensure T&T promise is delivered in first 3s |
| Gradual slope down | Pacing too slow, filler content | Cut dead air, add B-roll, compress middle sections |
| Spike near middle | Strong moment (controversy, reveal, data) | Study what made it work, replicate in future videos |
| Dip at 2:00-3:00 (long-form) | Specs/data overload | Convert data to visual comparison, add personality |
| Flat retention (good) | Consistent engagement | Current formula works, iterate on topic/format |
| Cliff at end (abrupt drop-off) | CTA too long, viewer leaves after value delivered | Front-load CTA, keep outro under 10s |

### Traffic Source Strategy
- **YouTube Search (SEO)**: Title must contain exact search query. Description: first 2 lines = keyword-rich summary. Tags: match common search variations.
- **Suggested/Related**: Thumbnail must stand out next to competitors. Title must be clickable in context of similar videos.
- **Browse/Home**: Needs high CTR (5%+ for Shorts, 8%+ for long-form). Bold/thumbnail contrast is critical.
- **Shorts Feed**: First frame is EVERYTHING. Scroll-stop in <1s. Vertical composition, bold text, high contrast.

### Key Metrics to Optimize
| Metric | Target | How |
|--------|--------|-----|
| **CTR** | >5% (Shorts), >8% (long-form) | Better T&T pairs, curiosity gaps, A/B test thumbnails |
| **AVD (Avg View Duration)** | >50% of video length | Tight pacing, no filler, visual variety every 5-7s |
| **Retention at 30s** | >70% | Hook delivered immediately, no intro padding |
| **Satisfaction (likes/comments)** | >3% like ratio | Honest content, provoke opinion, ask questions |
| **Shares** | Track weekly trend | Create "shareable moments" — surprising data, hot takes, relatable frustrations |

## 4. Niche Strategy & Trend Mapping

### Outlier Detection
Identify videos from **small channels** (<10K subs) that got **10x+ their average views**. Extract:
- **Format**: What structure did they use? (list, reaction, challenge, comparison)
- **Hook style**: How did they open? What was the thumbnail?
- **Topic angle**: What unique angle made it resonate?
- **Timing**: When did it publish relative to trend peak?

### Cross-Niche Adaptation
Take viral formats from OTHER niches and adapt to tech reviews:
- "I tried X for Y days" → "Testei o [product] por 30 dias sem parar"
- "X vs Y: o que eu aprendi" → "[Product] vs [Concorrente]: o que ninguém conta"
- "O problema com X" → "O problema com smartwatches baratos"
- "Why I stopped using X" → "Por que parei de usar [product]"

### Real-Time Trend Mapping
- Monitor YouTube trending (BR) daily
- Monitor Google Trends for product names + category terms
- Adapt video topics within **24h** of trend spike
- When a new product launches, publish the review within the **first 48h** (freshness bonus)

### Publishing Schedule Optimization
- **Best times for tech (BR)**: 12h-14h (lunch), 19h-21h (after work)
- **Shorts**: Can publish 3x/day (morning, lunch, evening) for maximum feed coverage
- **Long-form**: 1x/day max, prioritize quality over quantity
- **Consistency**: Same time every day beats random bursts

## 5. Implementation for This Repo

### Video Script Prompt Updates (`lib/video-script.ts`)
When editing `buildVideoScriptPrompt()`:
- Enforce hook formula (dor+preço or quebra-de-expectativa)
- Validate `hook` field is ≤3 seconds of narration
- Validate `onScreenText` ≤5 words per scene
- Validate `fullNarration` ≥200 chars (assertValidVideoScript gate)
- Ensure pacing: 5-6 scenes, 7-10s each, total 45-58s
- Title: ≤100 chars, includes keyword + #shorts
- Description: benefit + price + link + review link + 3 hashtags
- Tags: 8-12, pt-BR, purchase intent keywords

### Thumbnail Composition (`lib/video-helpers.mjs`)
When working with thumbnails:
- Validate image dimensions (1280×720 for long-form, 1080×1920 for Shorts)
- Ensure text is readable at 320px wide
- Use high-contrast colors for text overlay
- Include face/expression if possible (boosts CTR 15-30%)

### Upload Optimization (`lib/video-helpers.mjs`)
- Title: ≤100 chars, keyword first
- Description: first 2 lines = most important (visible in search)
- Tags: ordered by importance (most specific first)
- Category: 22 (Science & Technology)
- Privacy: 'public' for published, 'unlisted' for testing
