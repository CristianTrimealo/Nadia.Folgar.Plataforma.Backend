param(
  [switch]$Staged
)

$ErrorActionPreference = 'Stop'

$patterns = @(
  @{
    Name = 'Anthropic API key'
    Regex = 'sk-ant-api[0-9A-Za-z_-]*-[0-9A-Za-z_-]{20,}'
  },
  @{
    Name = 'MongoDB URI with credentials'
    Regex = 'mongodb(\+srv)?://[^:/\s]+:[^@\s]+@'
  },
  @{
    Name = 'Env-style secret assignment'
    Regex = '(?im)^\s*[A-Z0-9_]*(API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*(?!changeme|placeholder|example|dev-secret|dev-refresh)[^#\s]{20,}'
  }
)

$allowedFiles = @(
  '.env.example',
  'scripts/guard-secrets.ps1'
)

function Get-ScanFiles {
  if ($Staged) {
    return git diff --cached --name-only --diff-filter=ACMR
  }

  return git ls-files
}

function Get-FileContent {
  param([string]$Path)

  if ($Staged) {
    return git show ":$Path" 2>$null
  }

  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    return Get-Content -LiteralPath $Path -Raw
  }

  return $null
}

$findings = New-Object System.Collections.Generic.List[string]

foreach ($file in Get-ScanFiles) {
  if ([string]::IsNullOrWhiteSpace($file)) {
    continue
  }

  $normalized = $file -replace '\\', '/'

  if ($allowedFiles -contains $normalized) {
    continue
  }

  $content = Get-FileContent -Path $file

  if ($null -eq $content) {
    continue
  }

  foreach ($pattern in $patterns) {
    if ($content -match $pattern.Regex) {
      $findings.Add("$normalized -> $($pattern.Name)")
    }
  }
}

if ($findings.Count -gt 0) {
  Write-Error "Potential secrets found:`n$($findings -join "`n")`nMove real credentials to .env or your secret manager before committing."
  exit 1
}

Write-Host 'Secret scan passed.'
