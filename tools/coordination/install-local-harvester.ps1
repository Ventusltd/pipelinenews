param(
  [string]$Repository = 'C:\Users\vikra\OneDrive\Documents\GitHub\pipelinenews',
  [string]$TaskName = 'GlobalGrid2050-Claude-Codex-Continuity'
)
$ErrorActionPreference = 'Stop'
$repoPath = [System.IO.Path]::GetFullPath($Repository)
$scriptPath = Join-Path $repoPath 'tools\coordination\export-last-24h.mjs'
if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Exporter not found: $scriptPath" }
$node = (Get-Command node -ErrorAction Stop).Source
$arguments = '"' + $scriptPath + '" --hours 24 --output "' +
  (Join-Path $repoPath 'docs\coordination\.local\transcripts-last-24h.jsonl') + '"'
$action = New-ScheduledTaskAction -Execute $node -Argument $arguments -WorkingDirectory $repoPath
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 15)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Description 'Local-only 24-hour Claude/Codex transcript ledger' -Force
Write-Host "Installed $TaskName. Output remains local and Git-ignored."
