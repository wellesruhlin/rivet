$ErrorActionPreference = 'Stop'
$studioProject = Split-Path $PSScriptRoot -Parent
$studioLogs = Join-Path (Split-Path (Split-Path $studioProject -Parent) -Parent) 'work/table-demo'
New-Item -ItemType Directory -Force -Path $studioLogs | Out-Null
$studioNode = (Get-Command node.exe).Source
$studioServices = @(
  @{ Name='API'; Port=5193; Arguments=@('server/index.mjs'); Log='server' },
  @{ Name='Web'; Port=5192; Arguments=@('node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5192','--strictPort'); Log='web' }
)
foreach ($studioService in $studioServices) {
  $studioSocket = [System.Net.Sockets.TcpClient]::new()
  $studioListener = $false
  try { $studioSocket.Connect('127.0.0.1', $studioService.Port); $studioListener = $true } catch { } finally { $studioSocket.Dispose() }
  if ($studioListener) {
    Write-Output "$($studioService.Name) port $($studioService.Port) already has a listener; leaving it untouched."
  } else {
    $studioProcess = Start-Process -FilePath $studioNode -ArgumentList $studioService.Arguments -WorkingDirectory $studioProject -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $studioLogs "$($studioService.Log).log") -RedirectStandardError (Join-Path $studioLogs "$($studioService.Log)-error.log")
    Write-Output "$($studioService.Name) started: PID $($studioProcess.Id)"
  }
}
Write-Output 'Table demo: http://127.0.0.1:5192/'
Write-Output 'API: http://127.0.0.1:5193/api/products'
