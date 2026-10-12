---
name: nim-routing
description: >
  Delegate heavy generation, boilerplate scaffolding, large refactorings, tests, docs, and UI styling to NVIDIA NIM (or local Ollama) to save Antigravity context tokens and compute credits.
---

# NIM Routing Skill

Use this skill whenever you need to offload heavy code generation, scaffolding, large refactors, repetitive styles, or batch document creation to NVIDIA NIM.

## When to Delegate
- **Large Boilerplates / New Files**: Web templates, API boilerplate, scripts with >50 lines.
- **Complex UI / CSS**: Detailed Tailwind styling, animations, repetitive components.
- **Bulk Tests & Docs**: Comprehensive test suites, unit tests, JSDoc, markdown guides.
- **Data Transforms & Scrapers**: Regex patterns, parsing scripts, bulk data normalizers.

## Usage Commands

In PowerShell or Bash:
```powershell
# Geração direta
python llm_task.py "Crie um script TypeScript para..."

# Salvar código limpo direto no arquivo de destino
python llm_task.py "Escreva a interface Post com tipos completos" -o src/types/post.ts

# Modelo rápido para raciocínio/lógica
python llm_task.py "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning" "Analise o trecho de código..."

# Listar modelos ativos
python llm_task.py --list-models
```

## Modelos Recomendados
- **Default (Ultra Performance 550B)**: `nvidia/nemotron-3-ultra-550b-a55b`
- **Fast / Reasoning (30B)**: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
- **Vision (11B)**: `meta/llama-3.2-11b-vision-instruct`
