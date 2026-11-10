param([Parameter(ValueFromRemainingArguments=$true)][string[]]$PhpArguments)
$ErrorActionPreference = 'Stop'
$phpExe = (Get-Command php.exe).Source
$extensionPath = Join-Path (Split-Path $phpExe) 'ext'
& $phpExe -d "extension_dir=$extensionPath" -d extension=pdo_mysql @PhpArguments
exit $LASTEXITCODE
