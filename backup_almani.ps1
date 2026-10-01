$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$localBackupDir = 'C:\Backups\ALMANI'
$oneDriveRoot = Get-ChildItem -Path 'C:\Users\aless' -Directory -Filter 'OneDrive - ALMAN*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $oneDriveRoot) {
    throw 'Pasta do OneDrive (OneDrive - ALMANI) nao foi encontrada em C:\Users\aless.'
}
$oneDriveBackupDir = Join-Path $oneDriveRoot.FullName 'Backups ALMANI'
$logDir = Join-Path $scriptDir 'logs'
$today = Get-Date -Format 'yyyyMMdd'
$localBackupFile = Join-Path $localBackupDir "backup_$today.sql"
$oneDriveBackupFile = Join-Path $oneDriveBackupDir "backup_$today.sql"
$logFile = Join-Path $logDir "backup_$today.log"
$retentionDays = 14

# Preencha com os dados do seu banco Supabase
# A conexão pode ser obtida em Supabase -> Project Settings -> Database -> Connection string
$env:PGHOST = 'aws-0-sa-east-1.pooler.supabase.com'          # ex.: db.xxxxxxxxxxxxxx.supabase.co
$env:PGPORT = '5432'
$env:PGUSER = 'postgres.hgexdlzritmvlrmpzloc'
$env:PGDATABASE = 'postgres'
$env:PGPASSWORD = 'Almani@111403@'

if ($env:PGHOST -eq 'DB_HOST_AQUI' -or $env:PGPASSWORD -eq 'SENHA_DO_BANCO_AQUI') {
    throw 'Configure os valores reais de PGHOST e PGPASSWORD no arquivo backup_almani.ps1 antes de agendar.'
}

New-Item -ItemType Directory -Force -Path $localBackupDir | Out-Null
New-Item -ItemType Directory -Force -Path $oneDriveBackupDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$pgDumpCandidates = @(
    'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe',
    'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe',
    'C:\Program Files\PostgreSQL\15\bin\pg_dump.exe',
    'C:\Program Files\PostgreSQL\14\bin\pg_dump.exe',
    'C:\Program Files\PostgreSQL\13\bin\pg_dump.exe'
)

$pgDump = $pgDumpCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $pgDump) {
    throw 'pg_dump.exe nao foi encontrado. Instale o PostgreSQL Client Tools ou o PostgreSQL completo e tente novamente.'
}

Get-ChildItem -Path $localBackupDir -Filter 'backup_*.sql' -File |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$retentionDays) } |
    Remove-Item -Force

Get-ChildItem -Path $oneDriveBackupDir -Filter 'backup_*.sql' -File |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$retentionDays) } |
    Remove-Item -Force

if (Test-Path $localBackupFile) {
    Remove-Item $localBackupFile -Force
}

try {
    & $pgDump `
        --host=$env:PGHOST `
        --port=$env:PGPORT `
        --username=$env:PGUSER `
        --dbname=$env:PGDATABASE `
        --file="$localBackupFile" `
        --clean `
        --if-exists `
        --no-owner `
        --no-privileges `
        *> $logFile

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump falhou com codigo $LASTEXITCODE. Consulte $logFile"
    }

    if (-not (Test-Path $localBackupFile)) {
        throw "Arquivo de backup nao foi criado: $localBackupFile"
    }

    $fileInfo = Get-Item $localBackupFile
    if ($fileInfo.Length -le 0) {
        throw "Arquivo de backup vazio: $localBackupFile"
    }

    Copy-Item -Path $localBackupFile -Destination $oneDriveBackupFile -Force

    Write-Host "Backup OK: $localBackupFile"
    Write-Host "Copia no OneDrive: $oneDriveBackupFile"
    Write-Host "Tamanho: $($fileInfo.Length) bytes"
}
catch {
    if (Test-Path $localBackupFile) {
        Remove-Item $localBackupFile -Force
    }
    Write-Error $_.Exception.Message
    exit 1
}
