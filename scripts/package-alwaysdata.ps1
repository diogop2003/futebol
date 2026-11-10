param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot
$browserRoot = Join-Path $repoRoot 'pelada-front\dist\pelada-web\browser'
if (-not $SkipBuild) {
    & npm.cmd --prefix (Join-Path $repoRoot 'pelada-front') run build
    if ($LASTEXITCODE -ne 0) { throw 'O build falhou; nenhum pacote foi publicado.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $browserRoot 'index.html'))) { throw 'Build Angular não encontrado.' }
$stamp = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,6)
$releaseRoot = Join-Path $repoRoot ".tools\alwaysdata\$stamp"
$packageRoot = Join-Path $releaseRoot 'pelada'
$publicRoot = Join-Path $packageRoot 'public'
$apiRoot = Join-Path $packageRoot 'api'
New-Item -ItemType Directory -Path $publicRoot,$apiRoot,(Join-Path $publicRoot 'api'),(Join-Path $packageRoot 'legacy') -Force | Out-Null
Get-ChildItem -LiteralPath $browserRoot -Force | Copy-Item -Destination $publicRoot -Recurse
foreach ($name in @('bootstrap.php','console.php','src','migrations','public')) {
    Copy-Item -LiteralPath (Join-Path $repoRoot "api\$name") -Destination $apiRoot -Recurse
}
foreach ($name in @('original','extracted.json','consistent.json','REVIEW.md')) {
    Copy-Item -LiteralPath (Join-Path $repoRoot "legacy\$name") -Destination (Join-Path $packageRoot 'legacy') -Recurse
}
Copy-Item -LiteralPath (Join-Path $repoRoot 'deploy\alwaysdata\public.htaccess') -Destination (Join-Path $publicRoot '.htaccess')
Copy-Item -LiteralPath (Join-Path $repoRoot 'deploy\alwaysdata\api-entry.php') -Destination (Join-Path $publicRoot 'api\index.php')
Copy-Item -LiteralPath (Join-Path $repoRoot 'deploy\alwaysdata\.env.example') -Destination (Join-Path $apiRoot '.env.example')
Copy-Item -LiteralPath (Join-Path $repoRoot 'docs\ALWAYSDATA.md') -Destination (Join-Path $packageRoot 'LEIA-ME.md')
$phpExe = (Get-Command php.exe).Source
$extensionPath = Join-Path (Split-Path $phpExe) 'ext'
$backupPath = Join-Path $packageRoot 'banco.sql'
& $phpExe -d "extension_dir=$extensionPath" -d extension=pdo_mysql (Join-Path $repoRoot 'scripts\export-database.php') "--output=$backupPath"
if ($LASTEXITCODE -ne 0) { throw 'Falha no backup; o pacote não foi concluído. Inicie o MariaDB e tente novamente.' }
# Use .NET to retain dotfiles (.htaccess and .env.example) in the archive.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $releaseRoot 'pelada-alwaysdata.zip'
[System.IO.Compression.ZipFile]::CreateFromDirectory($packageRoot, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $true)
Write-Output "Pacote pronto: $zipPath"
Write-Output "Pasta para envio por SFTP: $packageRoot"
Write-Output 'O pacote contém o banco atual e deve ficar privado. Envie a pasta pelada para /home/SUA_CONTA/ e configure o site para servir apenas pelada/public.'
