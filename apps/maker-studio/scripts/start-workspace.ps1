$ErrorActionPreference = 'Stop'
$makerProject = Split-Path $PSScriptRoot -Parent
$skiProject = [IO.Path]::GetFullPath((Join-Path $makerProject '../on3p'))
# Dependencies are installed once at the repository root (npm workspaces).
$vite = [IO.Path]::GetFullPath((Join-Path $makerProject '../../node_modules/vite/bin/vite.js'))
$workspaceLogs = Join-Path $makerProject '../../work/table-demo'
New-Item -ItemType Directory -Force -Path $workspaceLogs | Out-Null
$workspaceNode = (Get-Command node.exe).Source
$workspaceServices = @(
  @{Name='Maker API';Port=5193;Root=$makerProject;Args='server/index.mjs';Log='workspace-api'},
  @{Name='Management and tables';Port=5192;Root=$makerProject;Args="`"$vite`" --configLoader native --host 127.0.0.1 --port 5192 --strictPort";Log='workspace-web'},
  @{Name='ON3P configurator';Port=5178;Root=$skiProject;Args="`"$vite`" --configLoader native --host 127.0.0.1 --port 5178 --strictPort";Log='workspace-skis'}
)
foreach ($workspaceService in $workspaceServices) {
  $workspaceSocket = [Net.Sockets.TcpClient]::new()
  $workspaceListening = $false
  try { $workspaceSocket.Connect('127.0.0.1', $workspaceService.Port); $workspaceListening = $true } catch { } finally { $workspaceSocket.Dispose() }
  if ($workspaceListening) { Write-Output "$($workspaceService.Name): port $($workspaceService.Port) is already in use; existing process left running."; continue }
  $workspaceProcess = Start-Process $workspaceNode -ArgumentList $workspaceService.Args -WorkingDirectory $workspaceService.Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $workspaceLogs ($workspaceService.Log+'.log')) -RedirectStandardError (Join-Path $workspaceLogs ($workspaceService.Log+'.err')) -PassThru
  Write-Output "$($workspaceService.Name): started as PID $($workspaceProcess.Id)"
}
Write-Output 'Management: http://127.0.0.1:5192/manage'
Write-Output 'Order handoff: http://127.0.0.1:5192/handoff'
Write-Output 'Skis: http://127.0.0.1:5178/'
Write-Output 'First visit: create your local maker password. Restart the API after server or product-adapter source changes.'
