$ErrorActionPreference = 'Stop'

$port = 3000
$connections = netstat -ano | Select-String "LISTENING" | Where-Object { $_.Line -match "[:.]$port\s" }

foreach ($connection in $connections) {
  $parts = ($connection.Line -split '\s+') | Where-Object { $_ }
  $processId = [int]$parts[-1]

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    continue
  }

  $isNode = $process.Name -eq 'node.exe'
  $looksLikeThisBackend =
    $process.CommandLine -like '*Nadia.Folgar.Plataforma.Backend*' -or
    $process.CommandLine -like '*dist/main*'

  if ($isNode -and $looksLikeThisBackend) {
    Write-Host "Cerrando backend anterior en puerto $port (PID $processId)..."
    Stop-Process -Id $processId -Force
    continue
  }

  throw "El puerto $port esta ocupado por PID $processId ($($process.Name)): $($process.CommandLine)"
}
