@echo off
cd /d C:\almani-plataform

for /d %%D in ("C:\Users\aless\OneDrive - ALMAN*") do set "DEST=%%D\Backups ALMANI"

echo Gerando backup de estrutura...
call supabase db dump -f "%DEST%\backup_%date:~6,4%%date:~3,2%%date:~0,2%.sql"

echo Gerando backup de dados...
call supabase db dump --data-only -f "%DEST%\backup_dados_%date:~6,4%%date:~3,2%%date:~0,2%.sql"

echo Backup concluido
pause