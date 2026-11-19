@echo off
rem Prueba LOCAL de PC-Builder AR (no necesita internet ni instalar nada).
rem Camara del propio computador: funciona porque http://localhost cuenta como contexto seguro.
cd /d "%~dp0"
start "Servidor PC-Builder AR" cmd /k "%~dp0_server.bat"
timeout /t 3 /nobreak >nul
start "" "http://localhost:8000/"
echo.
echo  App:       http://localhost:8000/
echo  Marcador:  http://localhost:8000/marcador.html   (abrelo en otra pantalla o imprimelo)
echo.
echo  Para detener el servidor, cierra la ventana "Servidor PC-Builder AR".
echo.
pause
