@echo off
setlocal enabledelayedexpansion
cd /d C:\almani-plataform
set LOG=C:\almani-plataform\log_backup.txt

echo === INICIO === > "%LOG%"
echo Hora: %time% >> "%LOG%"
for /d %%D in ("C:\Users\aless\OneDrive - ALMAN*") do set "DEST=%%D\Backups ALMANI"

echo DEST = %DEST% >> "%LOG%"
if not defined DEST (
  echo ERRO: pasta do OneDrive nao encontrada. >> "%LOG%"
  type "%LOG%"
  exit /b 1
)

if not exist "%DEST%" mkdir "%DEST%"
set "DATESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%"
set "FILE1=%DEST%\backup_%DATESTAMP%.sql"
set "FILE2=%DEST%\backup_dados_%DATESTAMP%.sql"

del /q "%FILE1%" "%FILE2%" 2>nul

echo --- Comando 1 (estrutura) --- >> "%LOG%"
supabase db dump -f "%FILE1%" >> "%LOG%" 2>&1
set "EXIT1=%errorlevel%"
echo Codigo de saida 1: %EXIT1% >> "%LOG%"
if %EXIT1% neq 0 (
  if exist "%FILE1%" del /q "%FILE1%"
  echo === FIM === >> "%LOG%"
  type "%LOG%"
  exit /b %EXIT1%
)

echo --- Comando 2 (dados) --- >> "%LOG%"
supabase db dump --data-only -f "%FILE2%" >> "%LOG%" 2>&1
set "EXIT2=%errorlevel%"
echo Codigo de saida 2: %EXIT2% >> "%LOG%"
if %EXIT2% neq 0 (
  if exist "%FILE2%" del /q "%FILE2%"
  echo === FIM === >> "%LOG%"
  type "%LOG%"
  exit /b %EXIT2%
)

echo === FIM === >> "%LOG%"
type "%LOG%"
exit /b 0