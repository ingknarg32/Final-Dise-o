/**
 * Pruebas de extremo a extremo de PC-Builder AR (Chrome headless + Chrome DevTools Protocol).
 *
 * Qué hace:
 *   1. Sirve la carpeta del proyecto por HTTP en un puerto local.
 *   2. Genera un video falso (y4m) con el marcador Hiro y lo entrega a Chrome como "cámara".
 *   3. Recorre la app en un viewport móvil (390x844 @2x) y registra cada caso de prueba.
 *   4. Guarda tests/results/results.json y las capturas usadas como evidencia.
 *
 * Requisitos: Node >= 22 (WebSocket global) y Chrome/Edge. Sin dependencias npm.
 * Uso:  node tests/run-e2e.mjs        (CHROME_PATH=... si Chrome no está en una ruta estándar)
 *
 * Limitaciones (importante al interpretar): la cámara es simulada, el render es por software (SwiftShader)
 * y el entorno es de escritorio; NO sustituye una prueba en celulares reales.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'tests', 'results');
mkdirSync(OUT, { recursive: true });
const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHROME = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find(existsSync);
if (!CHROME) { console.error('No se encontró Chrome/Edge. Defina CHROME_PATH.'); process.exit(2); }

/* ---------------- servidor estático ---------------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.dat': 'application/octet-stream', '.hiro': 'text/plain' };
const server = createServer((q, r) => {
  const f = resolve(ROOT, '.' + decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT + sep) || !existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
}).listen(PORT, '127.0.0.1');

/* ---------------- cliente CDP mínimo ---------------- */
async function launch(port, extraArgs, viewport) {
  const profile = mkdtempSync(join(tmpdir(), 'pcb-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...extraArgs, 'about:blank'], { stdio: 'ignore' });
  let tabs;
  for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.some(t => t.type === 'page')) break; } catch {} await sleep(250); }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = new Map();
  const c = { errors: [], warnings: [], urls: [] };
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') c.errors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    else if (m.method === 'Runtime.consoleAPICalled') {
      const txt = m.params.args.map(a => a.value ?? a.description).join(' ');
      if (m.params.type === 'error') c.errors.push('console.error ' + txt); else if (m.params.type === 'warning') c.warnings.push(txt);
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') c.errors.push('log ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    else if (m.method === 'Network.requestWillBeSent') c.urls.push(m.params.request.url);
  });
  c.send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  c.ev = async expr => { const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
  c.shot = async name => { const r = await c.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); };
  c.goto = async url => { await c.send('Page.navigate', { url }); await sleep(2500); };
  c.close = () => { try { ws.close(); } catch {} proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  for (const d of ['Runtime', 'Log', 'Page', 'Network']) await c.send(d + '.enable');
  if (viewport) await c.send('Emulation.setDeviceMetricsOverride', viewport);
  return c;
}
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };

/* ---------------- video falso con el marcador Hiro ---------------- */
async function makeHiroVideo(file) {
  const c = await launch(9334, []);
  await c.goto(`${BASE}/assets/hiro.png`);
  const b64 = await c.ev(`(async()=>{const im=document.querySelector('img');await im.decode();
    const k=document.createElement('canvas');k.width=640;k.height=480;const g=k.getContext('2d');
    g.fillStyle='#d9d9d9';g.fillRect(0,0,640,480);g.save();g.translate(320,250);g.rotate(0.12);g.drawImage(im,-170,-170,340,340);g.restore();
    const a=new Uint8Array(g.getImageData(0,0,640,480).data.buffer);let s='';for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000));return btoa(s)})()`);
  c.close();
  const rgba = Buffer.from(b64, 'base64'), W = 640, H = 480;
  const Y = Buffer.alloc(W * H), U = Buffer.alloc(W * H / 4), V = Buffer.alloc(W * H / 4);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    Y[y * W + x] = clamp(16 + 0.257 * r + 0.504 * g + 0.098 * b, 16, 235);
    if (!(x & 1) && !(y & 1)) { const j = (y >> 1) * (W >> 1) + (x >> 1); U[j] = clamp(128 - 0.148 * r - 0.291 * g + 0.439 * b, 16, 240); V[j] = clamp(128 + 0.439 * r - 0.368 * g - 0.071 * b, 16, 240); }
  }
  const parts = [Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420jpeg\n`)];
  for (let f = 0; f < 30; f++) parts.push(Buffer.from('FRAME\n'), Y, U, V);
  writeFileSync(file, Buffer.concat(parts));
}

/* ---------------- registro de casos ---------------- */
const results = [];
function record(id, req, desc, expected, observed, pass) {
  results.push({ id, requirement: req, description: desc, expected, observed, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${desc}  -> ${observed}`);
}
const EXPECTED_LABELS = { cpu: 4, ram: 4, gpu: 5, motherboard: 7 };
const COMPS = ['cpu', 'ram', 'gpu', 'motherboard'];
const visibleScreens = `[...document.querySelectorAll('.screen')].filter(s=>!s.classList.contains('hidden')).map(s=>s.dataset.screen).join(',')`;
const liveTracks = `[...document.querySelectorAll('video')].flatMap(v=>v.srcObject?v.srcObject.getTracks().filter(t=>t.readyState==='live'):[]).length`;

/* ---------------- ejecución ---------------- */
const y4m = join(tmpdir(), 'pcb-hiro.y4m');
await makeHiroVideo(y4m);
const c = await launch(9333, ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=' + y4m.replaceAll('\\', '/')], MOBILE);
const env = await c.ev('navigator.userAgent');
const meta = { chrome: /Chrome\/[\d.]+/.exec(env)?.[0], viewport: '390x844 @2x (emulación móvil)', camera: 'cámara simulada con el marcador Hiro (640x480)', render: 'software (SwiftShader)', date: new Date().toISOString() };

await c.goto(`${BASE}/index.html`);

// TC01 · menú
const cards = await c.ev(`[...document.querySelectorAll('#menu-grid .comp-card')].map(b=>b.dataset.comp).join(',')`);
record('TC01', 'FR1, FR4', 'El menú lista los 4 componentes', 'cpu,ram,gpu,motherboard', cards, cards === COMPS.join(','));
await c.shot('01-menu');

// TC13 · objetivos táctiles (menú)
const minSize = async () => c.ev(`Math.round(Math.min(...[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>{const r=b.getBoundingClientRect();return Math.min(r.width,r.height)})))`);
const sizes = { menu: await minSize() };

const perComp = {}, layout = {};
for (const id of COMPS) {
  await c.ev(`document.querySelector('[data-comp=${id}]').click()`);
  const sel = await c.ev(`JSON.stringify({screen:${visibleScreens},title:document.querySelector('#select-title').textContent,concept:document.querySelector('#select-concept').textContent.length})`);
  const s = JSON.parse(sel);
  record(`TC02-${id}`, 'FR2', `Seleccionar ${id} abre su ficha`, 'pantalla select + título + concepto', sel, s.screen === 'select' && s.title.length > 0 && s.concept > 20);
  if (id === 'cpu') { await c.shot('02-select'); sizes.select = await minSize(); }

  const ms = await c.ev(`(async()=>{const t0=performance.now();document.querySelector('#btn-start-ar').click();
    while(!PCBuilder.state.markerSeen){if(performance.now()-t0>20000)return -1;await new Promise(r=>setTimeout(r,50))}return Math.round(performance.now()-t0)})()`);
  await sleep(1200);
  const st = JSON.parse(await c.ev(`JSON.stringify({screen:${visibleScreens},status:document.querySelector('#status-text').textContent,
    model:!!document.querySelector('.pc-model'),labels:document.querySelectorAll('.part-label').length,videos:document.querySelectorAll('video').length,tracks:${liveTracks},
    entities:document.querySelectorAll('.pc-model *').length,
    tris:(()=>{let t=0;document.querySelector('.pc-model').object3D.traverse(o=>{if(o.geometry){const g=o.geometry;t+=(g.index?g.index.count:g.attributes.position.count)/3}});return Math.round(t)})()})`));
  perComp[id] = { ms, ...st };
  record(`TC03-${id}`, 'FR2, NFR1', `Sesión AR de ${id}: marcador detectado y modelo anclado`, 'estado «Marcador detectado», modelo presente, cámara activa',
    `${st.status}; modelo=${st.model}; etiquetas=${st.labels}; detección en ${ms} ms`, st.screen === 'ar' && /detectado|detected/i.test(st.status) && st.model && st.videos === 1 && st.tracks === 1 && st.labels === EXPECTED_LABELS[id]);
  await c.shot(`03-ar-${id}`);
  layout[id] = JSON.parse(await c.ev(`JSON.stringify((()=>{const m=document.querySelector('#ar-menu').getBoundingClientRect(),k=document.querySelector('#btn-rotate').getBoundingClientRect();
    return {inner:[innerWidth,innerHeight],menuRight:Math.round(m.right),rotateBottom:Math.round(k.bottom)}})())`));
  if (id === 'cpu') sizes.ar = await minSize();

  if (id === 'gpu') {   // rotar / detalles se prueban sobre un componente completo
    const sp0 = await c.ev(`document.querySelector('.pc-model').getAttribute('spin').speed`);
    await c.ev(`document.querySelector('#btn-rotate').click()`);
    const sp1 = await c.ev(`document.querySelector('.pc-model').getAttribute('spin').speed`);
    await c.ev(`document.querySelector('#btn-rotate').click()`);
    const sp2 = await c.ev(`document.querySelector('.pc-model').getAttribute('spin').speed`);
    record('TC04', 'FR2', 'Rotar pausa y reanuda el giro', 'velocidad >0 → 0 → >0', `${sp0} → ${sp1} → ${sp2}`, sp0 > 0 && sp1 === 0 && sp2 > 0);
    await c.ev(`document.querySelector('#btn-details').click()`); await sleep(500);
    const d1 = JSON.parse(await c.ev(`JSON.stringify({vis:[...document.querySelectorAll('.part-label')].filter(l=>l.object3D.visible).length,panel:!document.querySelector('#ar-parts').classList.contains('hidden'),items:document.querySelectorAll('#ar-parts-list li').length,pressed:document.querySelector('#btn-details').getAttribute('aria-pressed')})`));
    await c.shot('04-ar-gpu-details');
    await c.ev(`document.querySelector('#btn-details').click()`); await sleep(300);
    const d2 = JSON.parse(await c.ev(`JSON.stringify({vis:[...document.querySelectorAll('.part-label')].filter(l=>l.object3D.visible).length,panel:!document.querySelector('#ar-parts').classList.contains('hidden')})`));
    record('TC05', 'FR2', 'Detalles muestra/oculta etiquetas 3D y lista de partes', 'ON: 5 etiquetas + panel; OFF: 0 + sin panel',
      `ON ${JSON.stringify(d1)}; OFF ${JSON.stringify(d2)}`, d1.vis === 5 && d1.panel && d1.items === 5 && d1.pressed === 'true' && d2.vis === 0 && !d2.panel);
  }

  // "Menú" recarga la página (AR.js no admite una 2.ª sesión en la misma página). El estado de la cámara se
  // registra en beforeunload, es decir, DESPUÉS de stopScene() y justo antes de la recarga.
  await c.ev(`window.addEventListener('beforeunload',()=>sessionStorage.setItem('t-rel',JSON.stringify({videos:document.querySelectorAll('video').length,scenes:document.querySelectorAll('a-scene').length,tracks:${liveTracks}})))`);
  await c.ev(`document.querySelector('#ar-menu').click()`); await sleep(3000);   // recarga + 3 s en el menú
  const rel = JSON.parse(await c.ev(`JSON.stringify({screen:${visibleScreens},...JSON.parse(sessionStorage.getItem('t-rel')||'{}')})`));
  record(`TC06-${id}`, 'FR3', `Menú desde la vista AR (${id}) libera la cámara y vuelve al menú`, 'pantalla menu; 0 videos; 0 escenas; 0 pistas activas', JSON.stringify(rel),
    rel.screen === 'menu' && rel.videos === 0 && rel.scenes === 0 && rel.tracks === 0);
}
const okAll = COMPS.every(i => perComp[i].ms > 0);
record('TC07', 'FR3', 'Cuatro sesiones AR consecutivas (3 s de pausa en el menú entre sesiones)', '4 sesiones con marcador detectado', COMPS.map(i => `${i}:${perComp[i].ms}ms`).join(' '), okAll);

// TC17 · maquetación móvil: AR.js redimensiona <body> al tamaño del video; la interfaz debe seguir dentro de la ventana
const lay = COMPS.map(i => layout[i]);
record('TC17', 'NFR2', 'En viewport móvil (390x844) los controles de la vista AR quedan dentro de la ventana', 'ventana 390x844; Menú y Rotar visibles',
  lay.map(l => `${l.inner.join('x')} menu→${l.menuRight} rotar↓${l.rotateBottom}`)[0] + ' (×4 componentes)',
  lay.every(l => l.inner[0] === MOBILE.width && l.inner[1] === MOBILE.height && l.menuRight <= MOBILE.width && l.rotateBottom <= MOBILE.height));

// TC16 · estabilidad: 6 sesiones seguidas con la pausa que antes provocaba el fallo de AR.js
const stab = [];
for (let i = 0; i < 6; i++) {
  await c.ev(`document.querySelector('[data-comp=gpu]').click()`);
  stab.push(await c.ev(`(async()=>{const t0=performance.now();document.querySelector('#btn-start-ar').click();
    while(!PCBuilder.state.markerSeen){if(performance.now()-t0>20000)return -1;await new Promise(r=>setTimeout(r,50))}return Math.round(performance.now()-t0)})()`));
  await c.ev(`document.querySelector('#ar-menu').click()`); await sleep(3000);
}
record('TC16', 'FR3', 'Estabilidad: 6 sesiones AR seguidas con pausa de 3 s (regresión del fallo idPatt)', '6/6 con marcador detectado', `${stab.filter(x => x > 0).length}/6 (${stab.join(', ')} ms)`, stab.every(x => x > 0));

// TC08 · vista previa
for (const id of COMPS) {
  await c.ev(`document.querySelector('[data-comp=${id}]').click()`);
  await c.ev(`document.querySelector('#btn-start-preview').click()`); await sleep(1800);
  const pv = JSON.parse(await c.ev(`JSON.stringify({screen:${visibleScreens},model:!!document.querySelector('.pc-model'),videos:document.querySelectorAll('video').length,status:document.querySelector('#status-text').textContent})`));
  record(`TC08-${id}`, 'NFR1', `Vista previa 3D de ${id} sin cámara`, 'modelo presente, 0 videos', JSON.stringify(pv), pv.screen === 'ar' && pv.model && pv.videos === 0);
  if (id === 'ram') await c.shot('05-preview-ram');
  await c.ev(`document.querySelector('#ar-menu').click()`); await sleep(400);
}

// TC09 · idioma
await c.ev(`document.querySelector('[data-lang=en]').click()`);
const en = JSON.parse(await c.ev(`JSON.stringify({lang:document.documentElement.lang,pick:document.querySelector('[data-i18n=pick]').textContent,mb:document.querySelector('[data-comp=motherboard] span:nth-of-type(2)').textContent})`));
await c.shot('06-menu-en');
await c.ev(`document.querySelector('[data-lang=es]').click()`);
record('TC09', 'NFR3', 'Cambio de idioma ES→EN actualiza la interfaz', 'lang=en, «Select a component», «Motherboard»', JSON.stringify(en), en.lang === 'en' && en.pick === 'Select a component' && en.mb === 'Motherboard');

// TC13 · objetivos táctiles
const minAll = Math.min(...Object.values(sizes));
record('TC13', 'NFR3', 'Todos los botones visibles miden ≥ 44 px (WCAG 2.5.5)', '≥ 44 px', JSON.stringify(sizes) + ' px', minAll >= 44);

// TC14 · enlace directo
await c.goto(`${BASE}/index.html#gpu+preview`);
const dl = JSON.parse(await c.ev(`JSON.stringify({screen:${visibleScreens},title:document.querySelector('#ar-title').textContent,model:!!document.querySelector('.pc-model')})`));
record('TC14', 'NFR1', 'Enlace directo #gpu+preview abre la vista previa de la GPU', 'ar, GPU, modelo', JSON.stringify(dl), dl.screen === 'ar' && dl.title === 'GPU' && dl.model);

// TC11 / TC12 · red y consola
const origins = [...new Set(c.urls.filter(u => /^https?:/.test(u)).map(u => new URL(u).origin))];
record('TC11', 'NFR1', 'Ninguna petición a servidores externos durante toda la sesión', `solo ${BASE}`, origins.join(', '), origins.length === 1 && origins[0] === BASE);
record('TC12', 'NFR3', 'Sin errores de JavaScript ni de consola', '0 errores', c.errors.length ? [...new Set(c.errors)].join(' | ') : '0 errores', c.errors.length === 0);
const warnings = [...new Set(c.warnings)].map(w => w.slice(0, 110));
c.close();

// TC10 · cámara no disponible / denegada (Chrome sin cámara simulada)
const n = await launch(9335, [], MOBILE);
await n.goto(`${BASE}/index.html#cpu`);
const gum = await n.ev(`navigator.mediaDevices.getUserMedia({video:true}).then(()=>'ok').catch(e=>e.name)`);
await n.ev(`document.querySelector('#btn-start-ar').click()`); await sleep(7000);   // error de cámara -> recarga a la ficha con aviso
const er = JSON.parse(await n.ev(`JSON.stringify({screen:${visibleScreens},msg:document.querySelector('#select-error').textContent,videos:document.querySelectorAll('video').length,scenes:document.querySelectorAll('a-scene').length})`));
await n.shot('07-camera-error');
record('TC10', 'NFR3', 'Sin cámara/permiso la app vuelve a la ficha con un mensaje claro', `getUserMedia=${gum}; pantalla select + mensaje; sin escena`, JSON.stringify(er),
  gum !== 'ok' && er.screen === 'select' && er.msg.length > 20 && er.scenes === 0);
n.close();

/* ---------------- resumen ---------------- */
const pass = results.filter(r => r.pass).length;
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ meta, summary: { total: results.length, passed: pass }, perComponent: perComp, touchTargetsPx: sizes, origins, consoleWarnings: warnings, results }, null, 2));
console.log(`\n${pass}/${results.length} casos aprobados. Resultados en tests/results/`);
server.close();
process.exit(pass === results.length ? 0 : 1);
