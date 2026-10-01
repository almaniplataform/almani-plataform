@echo off
setlocal enabledelayedexpansion
cd /d C:\almani-plataform

for /d %%D in ("C:\Users\aless\OneDrive - ALMAN*") do set "DEST=%%D\Backups ALMANI"

if not defined DEST (
  echo ERRO: pasta do OneDrive nao encontrada.
  exit /b 1
)

if not exist "%DEST%" mkdir "%DEST%"

set "DATESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%"
set "FILE1=%DEST%\backup_%DATESTAMP%.sql"
set "FILE2=%DEST%\backup_dados_%DATESTAMP%.sql"

del /q "%FILE1%" "%FILE2%" 2>nul

echo Gerando backup de estrutura...
call supabase db dump -f "%FILE1%"
if errorlevel 1 (
  echo ERRO: falha ao gerar backup de estrutura.
  if exist "%FILE1%" del /q "%FILE1%"
  exit /b 1
)

echo Gerando backup de dados...
call supabase db dump --data-only -f "%FILE2%"
if errorlevel 1 (
  echo ERRO: falha ao gerar backup de dados.
  if exist "%FILE2%" del /q "%FILE2%"
  exit /b 1
)

echo Backup concluido.
exit /b 0