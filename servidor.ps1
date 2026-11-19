# Servidor estatico minimo para PC-Builder AR. Solo usa PowerShell (incluido en Windows): sin Python ni Node.
# Escucha unicamente en localhost:8000 (no se expone a la red).
param([int]$Port = 8000)

$root = (Resolve-Path $PSScriptRoot).Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.json' = 'application/json'; '.ipynb' = 'application/json'
  '.dat' = 'application/octet-stream'; '.hiro' = 'text/plain'; '.svg' = 'image/svg+xml'; '.docx' = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch {
  Write-Host "No se pudo abrir el puerto $Port (puede estar ocupado). Cierra otros servidores o cambia el puerto: servidor.ps1 -Port 8080" -ForegroundColor Red
  exit 1
}
Write-Host "PC-Builder AR en  http://localhost:$Port/   (Ctrl+C para detener)" -ForegroundColor Green

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '') { $rel = 'index.html' }
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      # evita salir de la carpeta del proyecto (../)
      if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
        $res.StatusCode = 404
      } else {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch { $res.StatusCode = 500 }
    finally { $res.Close() }
  }
} finally { $listener.Stop() }
