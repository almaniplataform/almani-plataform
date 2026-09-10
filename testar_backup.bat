@echo off
cd /d C:\almani-plataform
set LOG=C:\almani-plataform\log_backup.txt
echo === INICIO === > "%LOG%"
echo Hora: %time% >> "%LOG%"
for /d %%D in ("C:\Users\aless\OneDrive - ALMAN*") do set "DEST=%%D\Backups ALMANI"
echo DEST = %DEST% >> "%LOG%"
echo --- Comando 1 (estrutura) --- >> "%LOG%"
supabase db dump -f "%DEST%\backup_%date:~6,4%%date:~3,2%%date:~0,2%.sql" >> "%LOG%" 2>&1
echo Codigo de saida 1: %errorlevel% >> "%LOG%"
echo --- Comando 2 (dados) --- >> "%LOG%"
supabase db dump --data-only -f "%DEST%\backup_dados_%date:~6,4%%date:~3,2%%date:~0,2%.sql" >> "%LOG%" 2>&1
echo Codigo de saida 2: %errorlevel% >> "%LOG%"
echo === FIM === >> "%LOG%"
type "%LOG%"
pause