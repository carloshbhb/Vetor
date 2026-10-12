#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Antigravity NIM Routing - llm_task.py
Delega o processamento pesado de geração e refatoração para NVIDIA NIM ou Ollama local,
economizando tokens e créditos de contexto do Antigravity.
"""

import sys
import os
import json
import urllib.request
import urllib.error
import argparse

# Configurar encoding UTF-8 padrão para I/O no Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def load_env():
    """Carrega variáveis de .env.local e .env"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, '.env.local'),
        os.path.join(script_dir, '.env'),
        os.path.join(os.getcwd(), '.env.local'),
        os.path.join(os.getcwd(), '.env'),
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, val = line.split('=', 1)
                            key = key.strip()
                            val = val.strip().strip('"').strip("'")
                            if key not in os.environ:
                                os.environ[key] = val
            except Exception:
                pass

def main():
    load_env()

    # Modelos padrão ativos
    DEFAULT_NIM_MODEL = os.environ.get("NIM_DEFAULT_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
    DEFAULT_OLLAMA_MODEL = os.environ.get("OLLAMA_DEFAULT_MODEL", "gemma3:1b")
    DEFAULT_BACKEND = os.environ.get("LLM_BACKEND", "nim").lower()

    parser = argparse.ArgumentParser(description="Antigravity LLM Delegation (NVIDIA NIM / Ollama)")
    parser.add_argument("args", nargs="*", help="[model] <prompt> ou apenas <prompt>")
    parser.add_argument("--file", "-f", help="Ler prompt de arquivo de texto")
    parser.add_argument("--output", "-o", help="Salvar resposta diretamente no arquivo de saída")
    parser.add_argument("--code-only", "-c", action="store_true", help="Extrair apenas código limpo (remove blocos markdown ```)")
    parser.add_argument("--list-models", "-l", action="store_true", help="Listar modelos ativos no backend")
    parser.add_argument("--model", "-m", help="Especificar modelo LLM")
    parser.add_argument("--backend", "-b", choices=["nim", "ollama"], default=DEFAULT_BACKEND, help="Backend a usar (nim ou ollama)")
    parser.add_argument("--thinking", dest="thinking", action="store_true", default=None, help="Habilitar thinking mode")
    parser.add_argument("--no-thinking", dest="thinking", action="store_false", help="Desabilitar thinking mode")
    parser.add_argument("--system", "-s", default="You are an expert coding assistant. Follow instructions precisely. When asked for code, output code directly without unnecessary chatter.", help="System prompt")
    parser.add_argument("--max-tokens", type=int, default=4096, help="Máximo de tokens na resposta")
    parser.add_argument("--temperature", type=float, default=0.2, help="Temperatura de amostragem")

    parsed, unknown = parser.parse_known_args()

    backend = parsed.backend

    # Listar modelos se solicitado
    if parsed.list_models:
        if backend == "nim":
            api_key = os.environ.get("NVIDIA_API_KEY")
            if not api_key:
                sys.stderr.write("❌ NVIDIA_API_KEY não encontrada.\n")
                sys.exit(1)
            req = urllib.request.Request(
                "https://integrate.api.nvidia.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    print(f"Modelos disponíveis no NVIDIA NIM ({len(data.get('data', []))} modelos):")
                    for m in sorted([x['id'] for x in data.get('data', [])]):
                        print(f" - {m}")
            except Exception as e:
                sys.stderr.write(f"Erro ao listar modelos: {e}\n")
        else:
            host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
            try:
                with urllib.request.urlopen(f"{host}/api/tags", timeout=5) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    print("Modelos disponíveis no Ollama:")
                    for m in data.get('models', []):
                        print(f" - {m['name']}")
            except Exception as e:
                sys.stderr.write(f"Erro ao conectar ao Ollama ({host}): {e}\n")
        sys.exit(0)

    model = parsed.model
    prompt = None

    if parsed.file:
        if not os.path.exists(parsed.file):
            sys.stderr.write(f"❌ Arquivo não encontrado: {parsed.file}\n")
            sys.exit(1)
        with open(parsed.file, "r", encoding="utf-8") as f:
            prompt = f.read()

    # Heurística inteligente para modelo vs prompt
    if parsed.args:
        first_arg = parsed.args[0]
        # Modelos NIM/Ollama têm '/' ou ':' (ex: nvidia/nemotron, meta/llama, gemma:1b)
        looks_like_model = ('/' in first_arg or ':' in first_arg) and len(parsed.args) >= 2

        if looks_like_model and not model:
            model = first_arg
            prompt = " ".join(parsed.args[1:])
        elif prompt is None:
            prompt = " ".join(parsed.args)

    if not prompt and not sys.stdin.isatty():
        prompt = sys.stdin.read().strip()

    if not prompt:
        sys.stderr.write("Uso: python llm_task.py [modelo] \"<prompt>\"\n")
        sys.stderr.write("     python llm_task.py --file caminho/prompt.txt\n")
        sys.stderr.write("     echo \"prompt\" | python llm_task.py\n")
        sys.exit(1)

    backend = parsed.backend
    if not model:
        model = DEFAULT_NIM_MODEL if backend == "nim" else DEFAULT_OLLAMA_MODEL

    # Headers e URL base
    if backend == "nim":
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            sys.stderr.write("❌ NVIDIA_API_KEY não encontrada em .env.local ou nas variáveis de ambiente.\n")
            sys.stderr.write("   Adicione NVIDIA_API_KEY=nvapi-... em .env.local\n")
            sys.exit(1)
        base_url = "https://integrate.api.nvidia.com/v1"
        auth_header = f"Bearer {api_key}"
    else:
        ollama_host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
        base_url = f"{ollama_host}/v1"
        auth_header = "Bearer ollama"

    endpoint = f"{base_url}/chat/completions"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": parsed.system},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": parsed.max_tokens,
        "temperature": parsed.temperature,
        "stream": False
    }

    # Thinking flag se especificado ou variável de ambiente
    thinking_env = os.environ.get("NIM_THINKING")
    enable_thinking = parsed.thinking
    if enable_thinking is None and thinking_env is not None:
        enable_thinking = thinking_env.lower() in ("true", "1", "yes")

    if enable_thinking is not None:
        payload["chat_template_kwargs"] = {"enable_thinking": bool(enable_thinking)}

    headers = {
        "Content-Type": "application/json",
        "Authorization": auth_header,
        "User-Agent": "Antigravity-NIM-Routing/1.0"
    }

    req = urllib.request.Request(endpoint, headers=headers, data=json.dumps(payload).encode("utf-8"))

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]

            if parsed.code_only or (parsed.output and any(parsed.output.endswith(ext) for ext in ['.ts', '.tsx', '.js', '.jsx', '.py', '.css', '.html', '.json', '.sql'])):
                # Extrair código de blocos markdown se existirem
                import re
                code_match = re.search(r"```(?:\w+)?\n([\s\S]*?)```", content)
                if code_match:
                    content = code_match.group(1)

            if parsed.output:
                out_dir = os.path.dirname(os.path.abspath(parsed.output))
                if out_dir and not os.path.exists(out_dir):
                    os.makedirs(out_dir, exist_ok=True)
                with open(parsed.output, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"✅ Conteúdo salvo com sucesso em: {parsed.output}")
            else:
                print(content)
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8")
        except Exception:
            pass

        # Se o modelo solicitado estiver com workers saturados (503), faz fallback para o modelo padrão ultra
        if e.code == 503 and model != DEFAULT_NIM_MODEL and backend == "nim":
            sys.stderr.write(f"⚠️ O modelo '{model}' atingiu limite de workers (HTTP 503). Redirecionando para '{DEFAULT_NIM_MODEL}'...\n")
            payload["model"] = DEFAULT_NIM_MODEL
            req_retry = urllib.request.Request(endpoint, headers=headers, data=json.dumps(payload).encode("utf-8"))
            try:
                with urllib.request.urlopen(req_retry, timeout=120) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    content = data["choices"][0]["message"]["content"]
                    if parsed.output:
                        with open(parsed.output, "w", encoding="utf-8") as f:
                            f.write(content)
                        print(f"✅ Conteúdo salvo com sucesso em: {parsed.output}")
                    else:
                        print(content)
                    return
            except Exception as retry_err:
                sys.stderr.write(f"❌ Falha no fallback: {retry_err}\n")

        sys.stderr.write(f"❌ Erro HTTP {e.code}: {e.reason}\n")
        if err_body:
            sys.stderr.write(f"{err_body}\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"❌ Erro na requisição: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
