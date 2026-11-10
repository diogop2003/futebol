$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot
$toolsPath = Join-Path $repoRoot '.tools'
New-Item -ItemType Directory -Force -Path $toolsPath | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'api\.env'))) { throw 'Configure api/.env antes de iniciar. Consulte README.md.' }
$ownedProcesses = @()
function PortIsOpen([int]$Port) {
    $socket = New-Object Net.Sockets.TcpClient
    try { $socket.Connect('127.0.0.1',$Port); return $true } catch { return $false } finally { $socket.Dispose() }
}
$mariaExe = Join-Path $toolsPath 'mariadb\mariadb-11.4.5-winx64\bin\mariadbd.exe'
if ((Test-Path -LiteralPath $mariaExe) -and -not (PortIsOpen 3307)) {
    $configPath = Join-Path $toolsPath 'db-data\my.ini'
    $process = Start-Process -FilePath $mariaExe -ArgumentList @("--defaults-file=`"$configPath`"",'--bind-address=127.0.0.1','--port=3307') -WindowStyle Hidden -PassThru
    $ownedProcesses += $process.Id
}
$phpExe = (Get-Command php.exe).Source
$extensionPath = Join-Path (Split-Path $phpExe) 'ext'
if (-not (PortIsOpen 8000)) {
    $process = Start-Process -FilePath $phpExe -ArgumentList @('-d',"extension_dir=`"$extensionPath`"",'-d','extension=pdo_mysql','-S','127.0.0.1:8000','api/router.php') -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $toolsPath 'api.out.log') -RedirectStandardError (Join-Path $toolsPath 'api.err.log')
    $ownedProcesses += $process.Id
}
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'pelada-front\dist\pelada-web\browser\index.html'))) { throw 'Execute npm run build em pelada-front primeiro.' }
if (-not (PortIsOpen 4200)) {
    $process = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('scripts/preview.mjs') -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $toolsPath 'web.out.log') -RedirectStandardError (Join-Path $toolsPath 'web.err.log')
    $ownedProcesses += $process.Id
}
Write-Output 'Aplicação local: http://localhost:4200/?year=2026&month=10'
Write-Output 'Login: http://localhost:4200/login (use o e-mail e a senha que você cadastrou).'
if ($ownedProcesses.Count -gt 0) {
    Write-Output "Processos iniciados nesta execução: $($ownedProcesses -join ', ')."
    Write-Output 'Para encerrar os novos processos, use Stop-Process -Id com os IDs acima.'
} else {
    Write-Output 'Os serviços já estavam em execução. Nenhum novo processo foi necessário.'
}
Write-Output 'Os dados do MariaDB permanecem em .tools/db-data.'
