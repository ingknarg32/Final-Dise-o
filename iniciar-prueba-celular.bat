@echo off
rem Prueba desde el CELULAR: servidor local + tunel HTTPS temporal (requiere cloudflared e internet).
rem Si el computador no tiene cloudflared, usa Netlify Drop o GitHub Pages (ver LEEME-UNIVERSIDAD.txt).
cd /d "%~dp0"

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo.
  echo  cloudflared no esta instalado en este computador.
  echo  Opciones: instalarlo ^(winget install Cloudflare.cloudflared^) o publicar la carpeta en Netlify Drop / GitHub Pages.
  echo  Mientras tanto puedes usar iniciar-servidor.bat para la prueba local con webcam.
  echo.
  pause
  exit /b 1
)

echo.
echo  1^) Se abre el servidor local en otra ventana ^(puerto 8000^).
start "Servidor PC-Builder AR" cmd /k "%~dp0_server.bat"
timeout /t 3 /nobreak >nul
echo  2^) Se abre el marcador en este computador: ponlo a pantalla completa ^(F11^) con brillo alto.
start "" "http://localhost:8000/marcador.html"
echo  3^) Abajo aparecera una URL https://....trycloudflare.com  -^>  abrela en el celular.
echo     La URL es publica mientras esto este abierto. Cierra esta ventana al terminar.
echo.
cloudflared tunnel --url http://localhost:8000
pause
