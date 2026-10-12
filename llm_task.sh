#!/usr/bin/env bash
# Antigravity NIM Routing - Bash Wrapper
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/llm_task.py" "$@" || python "$SCRIPT_DIR/llm_task.py" "$@"
