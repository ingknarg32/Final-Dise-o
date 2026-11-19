@echo off
rem Arranca el servidor estatico en el puerto 8000. Usa lo que haya: Python, py launcher o PowerShell.
cd /d "%~dp0"

python --version >nul 2>nul
if not errorlevel 1 (
  echo Servidor con Python en http://localhost:8000/
  python -m http.server 8000 --bind 127.0.0.1
  goto :fin
)

py --version >nul 2>nul
if not errorlevel 1 (
  echo Servidor con Python ^(py^) en http://localhost:8000/
  py -m http.server 8000 --bind 127.0.0.1
  goto :fin
)

echo Python no esta instalado: se usa el servidor de PowerShell.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"

:fin
pause
