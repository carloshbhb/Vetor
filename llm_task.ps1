<#
.SYNOPSIS
    Antigravity NIM Routing - PowerShell Wrapper
.DESCRIPTION
    Delega tarefas pesadas para NVIDIA NIM ou Ollama local.
.EXAMPLE
    .\llm_task.ps1 "Escreva uma função TypeScript para validar CPF"
    .\llm_task.ps1 -Model "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning" "Explique o algoritmo"
#>
param(
    [Parameter(Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$PromptArgs,
    [string]$Model,
    [string]$File,
    [string]$Output,
    [switch]$CodeOnly,
    [switch]$ListModels,
    [string]$Backend,
    [switch]$Thinking,
    [switch]$NoThinking,
    [string]$System,
    [int]$MaxTokens
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pyScript = Join-Path $scriptDir "llm_task.py"

$passArgs = @()
if ($Model) { $passArgs += @("--model", $Model) }
if ($File) { $passArgs += @("--file", $File) }
if ($Output) { $passArgs += @("--output", $Output) }
if ($CodeOnly) { $passArgs += "--code-only" }
if ($ListModels) { $passArgs += "--list-models" }
if ($Backend) { $passArgs += @("--backend", $Backend) }
if ($Thinking) { $passArgs += "--thinking" }
if ($NoThinking) { $passArgs += "--no-thinking" }
if ($System) { $passArgs += @("--system", $System) }
if ($MaxTokens) { $passArgs += @("--max-tokens", $MaxTokens) }

if ($PromptArgs) {
    $passArgs += $PromptArgs
}

& python $pyScript @passArgs
