@echo off
setlocal
cd /d "C:\almani-plataform"
PowerShell -ExecutionPolicy Bypass -File "%cd%\backup_almani.ps1"
if errorlevel 1 (
    echo Falha no backup. Verifique o log em C:\almani-plataform\logs
    exit /b 1
)
