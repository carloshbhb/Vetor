# Set GitHub Secrets from .env.local
$Repo = "carloshbhb/Vetor"
$EnvFile = ".env.local"

if (!(Test-Path $EnvFile)) {
    Write-Error "Arquivo .env.local nao encontrado!"
    exit 1
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and !$line.StartsWith("#")) {
        $eq = $line.IndexOf("=")
        if ($gt -gt 0) {
            $key = $line.Substring(0, $eq).Trim()
            $val = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
            $envVars[$key] = $val
        }
    }
}

$secretMap = @{
    "NEXT_PUBLIC_SUPABASE_URL"    = "SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_KEY"        = "SUPABASE_SERVICE_KEY"
    "GROQ_API_KEY"                = "GROQ_API_KEY"
    "OPENAI_API_KEY"              = "OPENAI_API_KEY"
    "GITHUB_TOKEN"                = "GITHUB_TOKEN"
    "GITHUB_REPO"                 = "GITHUB_REPO"
    "PEXELS_API_KEY"              = "PEXELS_API_KEY"
    "INDEXNOW_API_KEY"            = "INDEXNOW_API_KEY"
    "INDEXNOW_LOCATION_ID"        = "INDEXNOW_LOCATION_ID"
    "GOOGLE_INDEXING_API_KEY"     = "GOOGLE_INDEXING_API_KEY"
    "SITE_URL"                    = "SITE_URL"
    "CRON_SECRET"                 = "CRON_SECRET"
    "ADMIN_PASSWORD"              = "ADMIN_PASSWORD"
    "YOUTUBE_CLIENT_ID"           = "YOUTUBE_CLIENT_ID"
    "YOUTUBE_CLIENT_SECRET"       = "YOUTUBE_CLIENT_SECRET"
    "YOUTUBE_REFRESH_TOKEN"       = "YOUTUBE_REFRESH_TOKEN"
    "NEXT_PUBLIC_SITE_URL"        = "NEXT_PUBLIC_SITE_URL"
}

$setCount = 0
$skipCount = 0

foreach ($mapping in $secretMap.GetEnumerator()) {
    $envKey = $mapping.Key
    $secretName = $mapping.Value

    if ($envVars.ContainsKey($envKey) -and -not [string]::IsNullOrWhiteSpace($envVars[$envKey])) {
        $value = $envVars[$envKey]
        $masked = if ($value.Length -gt 12) { $value.Substring(0, 6) + "..." + $value.Substring($value.Length - 4) } else { "***" }

        Write-Host "  Configurando $secretName ($masked)..." -NoNewline

        try {
            echo $value | gh secret set $secretName --repo $Repo 2>&1 | Out-Null
            Write-Host " OK" -ForegroundColor Green
            $setCount++
        } catch {
            Write-Host " ERR: $_" -ForegroundColor Red
            $skipCount++
        }
    } else {
        Write-Host "  $secretName: vazio, pulando..." -ForegroundColor Yellow
        $skipCount++
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Secrets configurados: $setCount"
Write-Host "Pulados (vazios): $skipCount"
Write-Host "Verifique em: https://github.com/$Repo/settings/secrets/actions"
Write-Host "========================================"
