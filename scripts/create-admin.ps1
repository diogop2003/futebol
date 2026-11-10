param([Parameter(Mandatory=$true)][string]$Name,[Parameter(Mandatory=$true)][string]$Email)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot
$phpExe = (Get-Command php.exe).Source
$extensionPath = Join-Path (Split-Path $phpExe) 'ext'
$secret = Read-Host 'Senha do primeiro administrador (12 a 72 bytes)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
$previousOutputEncoding = $OutputEncoding
try {
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $plainText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $plainText | & $phpExe -d "extension_dir=$extensionPath" -d extension=pdo_mysql (Join-Path $repoRoot 'api\console.php') create-admin "--name=$Name" "--email=$Email"
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o administrador.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $plainText = $null
    $OutputEncoding = $previousOutputEncoding
    $secret.Dispose()
}
