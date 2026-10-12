# Regras de Roteamento LLM (NIM Prioritário / Economia de Tokens)

## Visão Geral
Para economizar a janela de contexto e os créditos do Antigravity, **tarefas pesadas de geração de código, scaffolding, templates extensos e refatorações volumosas devem ser delegadas ao NVIDIA NIM** (ou Ollama local) através dos scripts `llm_task.py`, `.\llm_task.ps1` ou `.\llm_task.bat`.

## Diretrizes de Delegação

### 1. Tarefas a delegar ativamente ao NVIDIA NIM (Alto consumo de tokens)
| Categoria | Exemplos | Benefício da Delegação |
| :--- | :--- | :--- |
| **Geração de novos arquivos** | Scaffolding de componentes UI, scripts extensos, templates HTML/CSS | Delega milhares de tokens de saída para o NIM |
| **Refatoração em grande escala** | Alteração estrutural de arquivos longos (>100 linhas), divisão de módulos | Economiza tokens de raciocínio e geração |
| **Design, CSS e Animações** | CSS Tailwind detalhado, layouts complexos, estilizações repetitivas | Itera designs sem consumir créditos do modelo principal |
| **Testes e Documentação** | Suites de testes completas (Jest/Vitest), READMEs detalhados, JSDoc | Produção em lote terceirizada |
| **Transformação de Dados e Regex** | Normalização de dados, criação de scrapers ou pipelines de parsing | Itera lógica volumosa rapidamente |

### 2. Tarefas que o Antigravity deve executar diretamente (Mínimo e Estratégico)
- Decisão de arquitetura e estratégia geral do projeto
- Edições cirúrgicas de poucas linhas com `replace_file_content`
- Operações de sistema de arquivos e execução de comandos de build/testes
- Validação e revisão final do código gerado pelo NIM

## Como Executar a Delegação

No terminal (PowerShell ou CMD no Windows):
```powershell
# Usando o script Python nativo (Recomendado):
python llm_task.py "Escreva a implementação completa do componente..."

# Passando o prompt via arquivo (ideal para prompts longos ou arquivos existentes):
python llm_task.py --file caminho/prompt.txt

# Escolhendo modelo específico:
python llm_task.py "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning" "Prompt curto..."

# Ou via PowerShell wrapper:
.\llm_task.ps1 "Prompt aqui"
```

## Configurações e Modelos Padrão
- **Backend Padrão**: NVIDIA NIM (`https://integrate.api.nvidia.com/v1`)
- **Modelo Principal**: `nvidia/nemotron-3-ultra-550b-a55b` (potência máxima, 550B parâmetros)
- **Modelo Rápido/Raciocínio**: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
- **Chave de API**: Carregada automaticamente de `.env.local` (`NVIDIA_API_KEY`)
