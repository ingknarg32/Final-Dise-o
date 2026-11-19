# PC-Builder AR

Aplicación web de realidad aumentada (**AR.js + A-Frame + Tailwind CSS**) para aprender Arquitectura de
Computadores: un menú interactivo permite explorar en 3D una **CPU, RAM, GPU y placa base** sobre el
marcador Hiro. Desarrollada para la *Guía de laboratorio 05 – Diseño de Interfaces* y alineada con el
artículo `pc_builder_ar_ieee` y el póster académico.

## Cómo ejecutarla

No hay dependencias que instalar: AR.js 3.4.5, A-Frame 1.3.0 y Tailwind 3.4.1 están en `lib/` y los
datos de AR.js (parámetros de cámara y patrón Hiro) en `data/`. Solo hay que servir la carpeta por HTTP:

```bash
python -m http.server 8000      # luego abrir http://localhost:8000
```

* **En el mismo computador**: `http://localhost` permite usar la cámara.
* **En un celular**: los navegadores exigen **HTTPS** para la cámara. Opciones: GitHub Pages / Netlify
  (carpeta estática), o un túnel temporal, p. ej. `cloudflared tunnel --url http://localhost:8000`
  (la URL pública es accesible por cualquiera que la tenga mientras el túnel esté activo).
* **Sin cámara**: botón *Vista previa 3D* (arrastrar para girar, rueda/pellizco para acercar).

Abrir el marcador `assets/hiro.png` impreso o en otra pantalla y apuntar la cámara.

Enlaces directos útiles: `#cpu`, `#ram`, `#gpu`, `#motherboard` (abre la ficha) y `#gpu+preview`
(abre la vista previa 3D).

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Tres pantallas: Menú → Componente seleccionado → Vista AR |
| `css/style.css` | Estilos propios (botones táctiles ≥ 44 px, foco visible, fondo transparente en AR) |
| `js/models.js` | **Capa 3D**: modelos con primitivas de A-Frame (sin archivos externos), etiquetas, giro |
| `js/app.js` | **Capa 2D / control**: estados, textos ES/EN, ciclo de vida de la escena y cámara, errores |
| `lib/`, `data/`, `assets/` | Bibliotecas fijadas por versión, datos de AR.js y marcador Hiro |
| `notebook/Algoritmos_Extraction_RA.ipynb` | Comparativo SIFT · SURF · ORB para Google Colab |
| `informe/Informe_Guia05_PC-Builder_AR.docx` | Informe de laboratorio (formato de la guía) |

## Correspondencia con el paper y el póster

| Paper / póster | Implementación |
|---|---|
| FR1–FR4 (menú, modelo 3D, volver al menú, 4 componentes) | `index.html`, `js/app.js`, `js/models.js` |
| NFR1 sin instalación · NFR2 mobile-first | Todo corre en el navegador; Tailwind responsivo |
| NFR3 heurísticas y accesibilidad | Estado visible, control del usuario, `aria-pressed`, `role="status"`, contraste y objetivos táctiles |
| Arquitectura de 3 capas (Fig. 3) | Tailwind (2D) · A-Frame (3D) · AR.js (cámara y seguimiento) |
| Flujo de estados (Fig. 2) | Menú → Componente seleccionado → Vista AR → Menú |
| Póster Fig. 1: botones *Rotate / Details* y «Marker detected» | Botones Rotar / Detalles e indicador de marcador |

## Pruebas

```bash
node tests/run-e2e.mjs      # requiere Node >= 22 y Chrome/Edge (CHROME_PATH si no está en una ruta estándar)
```

27 casos de extremo a extremo (menú, ficha, sesión AR con marcador Hiro simulado, Rotar/Detalles, liberación de la
cámara, vista previa, idioma, errores de cámara, peticiones externas, errores de consola, tamaño de botones,
estabilidad de 6 sesiones seguidas). Resultados y capturas en `tests/results/`.
**Alcance:** cámara simulada, render por software y viewport móvil emulado; **no sustituye una prueba en un celular físico**.

Hallazgos de estas pruebas ya corregidos en el código:
* AR.js inicia su sistema en *toda* escena A-Frame: la «vista previa sin cámara» abría la cámara y pedía un archivo a
  `ar-js-org.github.io`. Se protege el sistema para que solo actúe si la escena declara `arjs`.
* AR.js 3.4.5 falla (`TypeError ... idPatt`) al iniciar una segunda sesión en la misma página tras una pausa.
  Por eso **«Menú» desde la vista AR recarga la página** (la cámara se libera antes); tras recargar, el destino se restaura.

## Limitaciones conocidas

* Los modelos son esquemáticos (primitivas), no réplicas de un producto.
* `lib/tailwind.js` es el *Play CDN* de Tailwind: adecuado para laboratorio; para producción conviene compilar el CSS.
* SURF está patentado y no viene en OpenCV estándar; el notebook usa AKAZE como sustituto y lo indica en la tabla.
