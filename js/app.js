/**
 * PC-Builder AR - capa de interfaz y control (2D) + ciclo de vida de la escena AR
 * ---------------------------------------------------------------
 * Flujo (Fig. 2 del paper):
 *   Menú --tap--> Componente seleccionado --Iniciar AR--> Vista AR --Menú--> Menú
 *
 * Capas (Fig. 3): 2D Tailwind (este archivo + index.html)
 *                 3D A-Frame  (js/models.js)
 *                 AR AR.js    (escena creada en startScene)
 */
(function () {
  'use strict';

  /* ================= Contenido bilingüe ================= */
  var I18N = {
    es: {
      kicker: 'Realidad aumentada · Educación',
      tagline: 'Explora el hardware de un PC en 3D sobre tu entorno y aprende Arquitectura de Computadores a tu ritmo.',
      pick: 'Selecciona un componente',
      available: '4 modelos disponibles',
      markerTitle: 'Necesitas el marcador Hiro',
      markerText: 'Imprímelo o ábrelo en otra pantalla. El modelo 3D se ancla sobre él al apuntar la cámara.',
      markerOpen: 'Abrir marcador Hiro',
      back: 'Menú',
      conceptLabel: 'Concepto de Arquitectura de Computadores',
      cameraWhy: 'La cámara se usa solo para detectar el marcador y anclar el modelo 3D. El video se procesa en tu dispositivo: no se graba ni se envía.',
      startAR: 'Iniciar AR (usar cámara)',
      preview: 'Vista previa 3D (sin cámara)',
      rotate: 'Rotar',
      details: 'Detalles',
      loading: 'Iniciando cámara…',
      markerFound: 'Marcador detectado',
      markerSearch: 'Apunta al marcador Hiro',
      previewMode: 'Vista previa 3D',
      previewHint: 'Arrastra para girar · rueda o dos dedos para acercar',
      errDenied: 'No se concedió acceso a la cámara. Actívalo en los permisos del navegador o usa la vista previa 3D.',
      errInsecure: 'El navegador solo permite la cámara en páginas HTTPS (o localhost). Abre la app con HTTPS o usa la vista previa 3D.',
      errGeneric: 'No se pudo iniciar la cámara. Revisa que ninguna otra app la esté usando o prueba la vista previa 3D.',
      open: 'Abrir'
    },
    en: {
      kicker: 'Augmented reality · Education',
      tagline: 'Explore PC hardware in 3D over your surroundings and learn Computer Architecture at your own pace.',
      pick: 'Select a component',
      available: '4 models available',
      markerTitle: 'You need the Hiro marker',
      markerText: 'Print it or open it on another screen. The 3D model anchors on it when you point the camera.',
      markerOpen: 'Open Hiro marker',
      back: 'Menu',
      conceptLabel: 'Computer Architecture concept',
      cameraWhy: 'The camera is used only to detect the marker and anchor the 3D model. Video is processed on your device: it is not recorded or sent.',
      startAR: 'Start AR (use camera)',
      preview: '3D preview (no camera)',
      rotate: 'Rotate',
      details: 'Details',
      loading: 'Starting camera…',
      markerFound: 'Marker detected',
      markerSearch: 'Point at the Hiro marker',
      previewMode: '3D preview',
      previewHint: 'Drag to rotate · wheel or two fingers to zoom',
      errDenied: 'Camera access was not granted. Enable it in the browser permissions or use the 3D preview.',
      errInsecure: 'Browsers only allow the camera on HTTPS pages (or localhost). Open the app over HTTPS or use the 3D preview.',
      errGeneric: 'The camera could not be started. Check that no other app is using it, or try the 3D preview.',
      open: 'Open'
    }
  };

  var COMP = {
    es: {
      cpu: {
        name: 'CPU', full: 'Unidad Central de Procesamiento',
        concept: 'Procesamiento: ejecuta instrucciones mediante la unidad de control y la unidad aritmético-lógica (ALU).',
        desc: 'Es el «cerebro» del computador: repite el ciclo captar–decodificar–ejecutar sobre las instrucciones de los programas.',
        facts: ['Unidad de control: decodifica instrucciones y coordina al resto del sistema.', 'ALU: realiza las operaciones aritméticas y lógicas.', 'Registros y caché L1/L2/L3 dan acceso rápido a los datos.'],
        parts: {
          ihs: ['Disipador integrado (IHS)', 'Tapa metálica que conduce el calor del chip hacia el disipador.'],
          pins: ['Contactos', 'Almohadillas doradas (LGA) que llevan señales y energía al socket.'],
          substrate: ['Sustrato (PCB)', 'Placa que conecta el chip de silicio con los contactos.'],
          notch: ['Marca de orientación', 'Indica cómo alinear la CPU con el socket.']
        }
      },
      ram: {
        name: 'RAM', full: 'Memoria de acceso aleatorio',
        concept: 'Memoria principal: almacenamiento temporal de los programas en ejecución y de sus datos.',
        desc: 'Guarda lo que la CPU necesita ahora mismo. Es mucho más rápida que el disco, pero volátil: pierde su contenido sin energía.',
        facts: ['Acceso directo a cualquier dirección de memoria.', 'Se instala en ranuras DIMM de la placa base (DDR4/DDR5).', 'Volátil: no conserva los datos al apagar.'],
        parts: {
          chips: ['Chips DRAM', 'Celdas que almacenan los bits de datos.'],
          contacts: ['Contactos dorados', 'Entran en la ranura DIMM y llevan datos, direcciones y energía.'],
          notch: ['Muesca', 'Evita insertar el módulo al revés o de una generación incompatible.'],
          label: ['Etiqueta', 'Indica la capacidad y la velocidad del módulo.']
        }
      },
      gpu: {
        name: 'GPU', full: 'Unidad de Procesamiento Gráfico',
        concept: 'Procesamiento paralelo especializado, principalmente para cargas gráficas.',
        desc: 'Reúne miles de núcleos sencillos que aplican la misma operación a muchos datos a la vez: ideal para gráficos y también para IA.',
        facts: ['Tiene memoria dedicada (VRAM).', 'Se conecta a la placa base por la ranura PCIe x16.', 'Ventiladores y disipador evacuan el calor que genera.'],
        parts: {
          fans: ['Ventiladores', 'Mueven aire a través del disipador para enfriar el chip.'],
          shroud: ['Carcasa y disipador', 'Protege la tarjeta y guía el flujo de aire.'],
          pcie: ['Conector PCIe', 'Bus de alta velocidad hacia la placa base.'],
          bracket: ['Panel de salidas', 'Puertos de video (HDMI / DisplayPort).'],
          power: ['Alimentación auxiliar', 'Entrega la energía extra que no da la ranura PCIe.']
        }
      },
      motherboard: {
        name: 'Placa base', full: 'Motherboard',
        concept: 'Interconexión: buses y sockets que enlazan todos los componentes.',
        desc: 'Es la red que comunica CPU, memoria, GPU y almacenamiento; además reparte la energía y aloja el chipset.',
        facts: ['El socket aloja la CPU.', 'Las ranuras DIMM y PCIe reciben la RAM y la GPU.', 'El chipset y los buses coordinan la comunicación.'],
        parts: {
          socket: ['Socket de CPU', 'Zona donde se instala el procesador.'],
          dimm: ['Ranuras DIMM', 'Reciben los módulos de RAM.'],
          pcie: ['Ranuras PCIe', 'Reciben la GPU y otras tarjetas de expansión.'],
          chipset: ['Chipset', 'Coordina la comunicación entre CPU y periféricos.'],
          vrm: ['Reguladores (VRM)', 'Convierten la energía a la tensión que usa la CPU.'],
          io: ['Panel de E/S', 'Puertos USB, red y audio hacia el exterior.'],
          atx: ['Conector ATX', 'Entrada de energía desde la fuente de poder.']
        }
      }
    },
    en: {
      cpu: {
        name: 'CPU', full: 'Central Processing Unit',
        concept: 'Processing: executes instructions through the control unit and the arithmetic-logic unit (ALU).',
        desc: 'The computer\'s "brain": it repeats the fetch–decode–execute cycle over the instructions of every program.',
        facts: ['Control unit: decodes instructions and coordinates the rest of the system.', 'ALU: performs arithmetic and logic operations.', 'Registers and L1/L2/L3 cache give fast access to data.'],
        parts: {
          ihs: ['Integrated heat spreader (IHS)', 'Metal lid that conducts chip heat to the cooler.'],
          pins: ['Contacts', 'Gold pads (LGA) carrying signals and power to the socket.'],
          substrate: ['Substrate (PCB)', 'Board connecting the silicon die to the contacts.'],
          notch: ['Orientation mark', 'Shows how to align the CPU with the socket.']
        }
      },
      ram: {
        name: 'RAM', full: 'Random Access Memory',
        concept: 'Main memory: temporary storage for running programs and their data.',
        desc: 'Holds what the CPU needs right now. Much faster than disk, but volatile: it loses its content without power.',
        facts: ['Direct access to any memory address.', 'Installed in the motherboard DIMM slots (DDR4/DDR5).', 'Volatile: it does not keep data when powered off.'],
        parts: {
          chips: ['DRAM chips', 'Cells that store the data bits.'],
          contacts: ['Gold contacts', 'Enter the DIMM slot and carry data, addresses and power.'],
          notch: ['Notch', 'Prevents inserting the module backwards or of an incompatible generation.'],
          label: ['Label', 'States the module capacity and speed.']
        }
      },
      gpu: {
        name: 'GPU', full: 'Graphics Processing Unit',
        concept: 'Specialized parallel processing, mainly for graphics workloads.',
        desc: 'Gathers thousands of simple cores that apply the same operation to many data at once: ideal for graphics and also for AI.',
        facts: ['Has dedicated memory (VRAM).', 'Connects to the motherboard through the PCIe x16 slot.', 'Fans and heatsink remove the heat it produces.'],
        parts: {
          fans: ['Fans', 'Push air through the heatsink to cool the chip.'],
          shroud: ['Shroud and heatsink', 'Protects the card and guides airflow.'],
          pcie: ['PCIe connector', 'High-speed bus to the motherboard.'],
          bracket: ['Output bracket', 'Video ports (HDMI / DisplayPort).'],
          power: ['Auxiliary power', 'Supplies the extra power the PCIe slot cannot.']
        }
      },
      motherboard: {
        name: 'Motherboard', full: 'Motherboard',
        concept: 'Interconnection: buses and sockets that link all components.',
        desc: 'The network that connects CPU, memory, GPU and storage; it also distributes power and hosts the chipset.',
        facts: ['The socket hosts the CPU.', 'DIMM and PCIe slots receive the RAM and the GPU.', 'The chipset and buses coordinate communication.'],
        parts: {
          socket: ['CPU socket', 'Where the processor is installed.'],
          dimm: ['DIMM slots', 'Receive the RAM modules.'],
          pcie: ['PCIe slots', 'Receive the GPU and other expansion cards.'],
          chipset: ['Chipset', 'Coordinates communication between CPU and peripherals.'],
          vrm: ['Voltage regulators (VRM)', 'Convert power to the voltage the CPU uses.'],
          io: ['I/O panel', 'USB, network and audio ports to the outside.'],
          atx: ['ATX connector', 'Power input from the power supply.']
        }
      }
    }
  };

  /* Iconos SVG sencillos (trazo = currentColor) */
  var ICONS = {
    cpu: '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="16" y="16" width="32" height="32" rx="3"/><rect x="25" y="25" width="14" height="14" rx="1"/><path d="M24 8v8M32 8v8M40 8v8M24 48v8M32 48v8M40 48v8M8 24h8M8 32h8M8 40h8M48 24h8M48 32h8M48 40h8"/></svg>',
    ram: '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="6" y="20" width="52" height="22" rx="2"/><path d="M13 27h6v8h-6zM23 27h6v8h-6zM33 27h6v8h-6zM43 27h6v8h-6z"/><path d="M10 48v4M16 48v4M22 48v4M28 48v4M38 48v4M44 48v4M50 48v4"/></svg>',
    gpu: '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="5" y="16" width="54" height="26" rx="3"/><circle cx="23" cy="29" r="8"/><circle cx="43" cy="29" r="8"/><path d="M23 24v10M18 29h10M43 24v10M38 29h10M12 48h22"/></svg>',
    motherboard: '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="8" y="8" width="48" height="48" rx="3"/><rect x="16" y="16" width="14" height="14"/><path d="M38 14v20M44 14v20M50 14v20M16 42h24M16 50h24"/></svg>'
  };

  /* ================= Estado ================= */
  var state = { lang: 'es', comp: null, mode: null, spin: true, details: false };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var t = function (k) { return I18N[state.lang][k]; };
  var C = function (id) { return COMP[state.lang][id]; };

  /* ================= Pantallas ================= */
  function showScreen(name) {
    $$('.screen').forEach(function (s) { s.classList.toggle('hidden', s.dataset.screen !== name); });
    document.documentElement.classList.toggle('ar-active', name === 'ar');
    var focus = { menu: '#menu-title', select: '#select-title' }[name];
    if (focus) { var f = $(focus); if (f) f.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach(function (n) { n.textContent = t(n.dataset.i18n); });
    $$('.lang-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)); });
    renderMenu();
    if (state.comp) { renderSelect(); renderAR(); }
    setStatus(state.markerSeen);
  }

  function renderMenu() {
    $('#menu-grid').innerHTML = Models.ids.map(function (id) {
      var c = C(id);
      return '<button type="button" class="comp-card" data-comp="' + id + '">' +
        '<span class="text-sky-300">' + ICONS[id] + '</span>' +
        '<span class="text-xl font-bold text-white">' + c.name + '</span>' +
        '<span class="text-xs text-slate-400 leading-snug">' + c.full + '</span></button>';
    }).join('');
  }

  function renderSelect() {
    var c = C(state.comp);
    $('#select-icon').innerHTML = ICONS[state.comp];
    $('#select-title').textContent = c.name;
    $('#select-full').textContent = c.full;
    $('#select-concept').textContent = c.concept;
    $('#select-desc').textContent = c.desc;
    $('#select-facts').innerHTML = c.facts.map(function (f) { return '<li>' + f + '</li>'; }).join('');
  }

  function renderAR() {
    var c = C(state.comp);
    $('#ar-title').textContent = c.name;
    $('#ar-full').textContent = c.full;
    $('#ar-concept').textContent = c.concept;
    $('#ar-parts-list').innerHTML = Object.keys(c.parts).map(function (k) {
      return '<li><span class="font-semibold text-white">' + c.parts[k][0] + '</span>' +
             '<span class="block text-slate-300">' + c.parts[k][1] + '</span></li>';
    }).join('');
    $('#btn-rotate').setAttribute('aria-pressed', String(state.spin));
    $('#btn-details').setAttribute('aria-pressed', String(state.details));
    $('#ar-parts').classList.toggle('hidden', !state.details);
    if (state.mode) mountModel();
  }

  function setStatus(found) {
    state.markerSeen = !!found;
    var dot = $('#status-dot'), txt = $('#status-text');
    if (state.mode === 'preview') {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-sky-400'; txt.textContent = t('previewMode');
    } else if (found) {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400'; txt.textContent = t('markerFound');
    } else {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400'; txt.textContent = t('markerSearch');
    }
  }

  /* ================= Modelo 3D en la escena ================= */
  function mountModel() {
    var host = $('#host');
    if (!host) return;
    host.innerHTML = '';
    var m = Models.build(state.comp);
    var parts = C(state.comp).parts;
    m.parts.forEach(function (p) {
      var l = document.createElement('a-entity');
      l.setAttribute('position', p.pos.join(' '));
      l.setAttribute('tag', 'text: ' + parts[p.key][0] + '; mode: sprite; size: ' + (0.065 / m.scale).toFixed(3) + '; color: #ffffff');   // 0.065 = alto en unidades del marcador
      l.setAttribute('visible', String(state.details));
      l.classList.add('part-label');
      m.root.appendChild(l);
    });
    m.root.setAttribute('spin', 'speed: ' + (state.spin ? 0.7 : 0));
    host.appendChild(m.root);
  }

  /* ================= Escena AR / vista previa ================= */
  var cleanupFns = [];

  /* El sistema 'arjs' de AR.js se inicia en TODA escena A-Frame, tenga o no el atributo `arjs`: en la vista
     previa "sin cámara" abría la cámara y pedía datos a ar-js-org.github.io (hallazgo de las pruebas E2E).
     Se protege su init para que solo actúe cuando la escena declara `arjs`. */
  (function guardArjs() {
    var S = AFRAME.systems && AFRAME.systems.arjs;
    if (!S || !S.prototype.init) return;
    var wrap = function (name) {
      var orig = S.prototype[name];
      if (!orig) return;
      S.prototype[name] = function () {
        var scene = this.sceneEl || this.el;
        if (scene && scene.hasAttribute && !scene.hasAttribute('arjs')) return;   // escena sin AR (vista previa)
        return orig.apply(this, arguments);
      };
    };
    wrap('init'); wrap('tick');
  })();

  AFRAME.registerComponent('drag-rotate', {            // solo vista previa: girar con el puntero
    init: function () {
      var self = this, down = false, lx = 0, ly = 0, pts = {}, pinch = 0;
      function root() { return document.querySelector('.pc-model'); }
      function onDown(e) {
        if (e.target.tagName !== 'CANVAS') return;
        pts[e.pointerId] = e; down = true; lx = e.clientX; ly = e.clientY;
        var r = root(); if (r) self.speed = r.getAttribute('spin').speed, r.setAttribute('spin', 'speed: 0');
      }
      function onMove(e) {
        if (!down) return;
        pts[e.pointerId] = e;
        var ids = Object.keys(pts);
        if (ids.length === 2) {                         // pellizco = zoom
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          if (pinch) zoom((pinch - d) * 0.01);
          pinch = d; return;
        }
        var r = root(); if (!r) return;
        var rot = r.object3D.rotation;
        rot.y += (e.clientX - lx) * 0.01;
        rot.x = Math.max(-0.9, Math.min(0.9, rot.x + (e.clientY - ly) * 0.005));
        lx = e.clientX; ly = e.clientY;
      }
      function onUp(e) {
        delete pts[e.pointerId]; pinch = 0;
        if (Object.keys(pts).length === 0 && down) {
          down = false;
          var r = root(); if (r) r.setAttribute('spin', 'speed: ' + (state.spin ? 0.7 : 0));
        }
      }
      function zoom(dz) {
        var cam = document.querySelector('#cam'); if (!cam) return;
        var p = cam.object3D.position, k = Math.max(0.6, Math.min(3, p.length() + dz)) / p.length();
        p.multiplyScalar(k);
      }
      function onWheel(e) { if (e.target.tagName === 'CANVAS') { e.preventDefault(); zoom(e.deltaY * 0.002); } }
      window.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      window.addEventListener('wheel', onWheel, { passive: false });
      this.off = function () {
        window.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('wheel', onWheel);
      };
    },
    remove: function () { if (this.off) this.off(); }
  });

  var LIGHTS = '<a-light type="ambient" color="#ffffff" intensity="0.85"></a-light>' +
               '<a-light type="directional" color="#ffffff" intensity="0.9" position="1 3 2"></a-light>';

  var SCENE_AR =
    '<a-scene id="scene" embedded vr-mode-ui="enabled: false" renderer="alpha: true; antialias: true; logarithmicDepthBuffer: true" ' +
    'arjs="sourceType: webcam; trackingMethod: best; debugUIEnabled: false; cameraParametersUrl: data/camera_para.dat;">' + LIGHTS +
    '<a-marker id="anchor" type="pattern" url="data/patt.hiro" smooth="true" smoothCount="8" smoothTolerance="0.01" smoothThreshold="2">' +
    '<a-entity id="host"></a-entity></a-marker><a-entity camera></a-entity></a-scene>';

  var SCENE_PREVIEW =
    '<a-scene id="scene" class="preview-scene" embedded vr-mode-ui="enabled: false" background="color: #0b1530" ' +
    'renderer="antialias: true" drag-rotate>' + LIGHTS +
    '<a-circle radius="0.8" rotation="-90 0 0" position="0 -0.002 0" material="color:#334155;roughness:1"></a-circle>' +
    '<a-plane width="1" height="1" rotation="-90 0 0" position="0 -0.001 0" material="src: assets/hiro.png;shader:flat"></a-plane>' +
    '<a-entity id="host"></a-entity>' +
    '<a-entity id="cam" camera position="0 0.62 1.1" rotation="-29 0 0" look-controls="enabled: false" wasd-controls="enabled: false"></a-entity></a-scene>';

  function showSelectError(msg) {
    var e = $('#select-error');
    e.textContent = msg; e.classList.toggle('hidden', !msg);
  }

  function startScene(mode) {
    showSelectError('');
    if (mode === 'ar' && !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      showSelectError(t('errInsecure')); return;
    }
    stopScene();
    state.mode = mode;
    state.markerSeen = false;
    $('#ar-loader').classList.toggle('hidden', mode !== 'ar');
    $('#preview-hint').classList.toggle('hidden', mode !== 'preview');
    showScreen('ar');
    setStatus(false);
    document.body.insertAdjacentHTML('afterbegin', mode === 'ar' ? SCENE_AR : SCENE_PREVIEW);
    renderAR();                                         // monta el modelo en #host

    var scene = $('#scene');
    var hideLoader = function () { $('#ar-loader').classList.add('hidden'); };
    if (mode === 'ar') {
      scene.addEventListener('camera-init', hideLoader);
      window.addEventListener('arjs-video-loaded', hideLoader);
      // AR.js emite 'camera-error' en window SIN datos del error y escribe el detalle en #error-popup (1 s después)
      var onCamError = function () {
        setTimeout(function () {
          if (state.mode !== 'ar') return;
          var pop = document.getElementById('error-popup');
          var denied = /NotAllowed|Security|Permission/i.test(pop ? pop.textContent : '');
          endSession(denied ? 'errDenied' : 'errGeneric');
        }, 1200);
      };
      window.addEventListener('camera-error', onCamError);
      cleanupFns.push(function () { window.removeEventListener('camera-error', onCamError); });
      var anchor = $('#anchor');
      anchor.addEventListener('markerFound', function () { hideLoader(); setStatus(true); });
      anchor.addEventListener('markerLost', function () { setStatus(false); });
      var timer = setTimeout(hideLoader, 12000);       // el aviso de carga nunca debe quedarse colgado
      cleanupFns.push(function () { clearTimeout(timer); window.removeEventListener('arjs-video-loaded', hideLoader); });
    }
  }

  function stopScene() {
    cleanupFns.forEach(function (f) { f(); }); cleanupFns = [];
    $$('video').forEach(function (v) {                  // libera la cámara
      if (v.srcObject) v.srcObject.getTracks().forEach(function (tr) { tr.stop(); });
      v.remove();
    });
    var s = $('a-scene'); if (s) s.remove();
    $$('.arjs-loader, #arjs-video, #error-popup').forEach(function (n) { n.remove(); });
    state.mode = null;
  }

  /* AR.js 3.4.5 no admite bien iniciar una segunda sesión de cámara en la misma página: tras una pausa
     el rastreo falla (TypeError 'idPatt', medido en tests/run-e2e.mjs). Por eso, después de una sesión AR,
     el regreso al menú o a la ficha recarga la página; el destino se pasa por sessionStorage. */
  function fresh(next) {
    stopScene();                                        // libera la cámara antes de recargar
    try { sessionStorage.setItem('pcb-next', JSON.stringify(next || {})); } catch (e) {}
    history.replaceState(null, '', location.pathname + location.search);   // quita el #hash para no reentrar
    location.reload();
  }
  function endSession(errKey) {                         // error de cámara -> ficha del componente con aviso
    fresh({ comp: state.comp, err: errKey });
  }

  /* ================= Eventos ================= */
  document.addEventListener('click', function (ev) {
    var card = ev.target.closest('[data-comp]');
    if (card) { state.comp = card.dataset.comp; showSelectError(''); renderSelect(); showScreen('select'); return; }
    var lang = ev.target.closest('[data-lang]');
    if (lang) { state.lang = lang.dataset.lang; applyI18n(); try { localStorage.setItem('pcb-lang', state.lang); } catch (e) {} }
  });

  $('#select-back').addEventListener('click', function () { showScreen('menu'); });
  $('#btn-start-ar').addEventListener('click', function () { startScene('ar'); });
  $('#btn-start-preview').addEventListener('click', function () { startScene('preview'); });
  $('#ar-menu').addEventListener('click', function () {
    if (state.mode === 'ar') fresh({});                 // se usó AR.js: página limpia (ver fresh)
    else { stopScene(); showScreen('menu'); }           // vista previa: no hay estado de AR.js que limpiar
  });

  $('#btn-rotate').addEventListener('click', function () {
    state.spin = !state.spin;
    this.setAttribute('aria-pressed', String(state.spin));
    var r = $('.pc-model'); if (r) r.setAttribute('spin', 'speed: ' + (state.spin ? 0.7 : 0));
  });
  $('#btn-details').addEventListener('click', function () {
    state.details = !state.details;
    this.setAttribute('aria-pressed', String(state.details));
    $('#ar-parts').classList.toggle('hidden', !state.details);
    $$('.part-label').forEach(function (l) { l.setAttribute('visible', String(state.details)); });
  });

  window.addEventListener('pagehide', stopScene);       // nunca dejar la cámara encendida

  /* ================= Arranque ================= */
  try { var saved = localStorage.getItem('pcb-lang'); if (saved && I18N[saved]) state.lang = saved; } catch (e) {}
  applyI18n();
  showScreen('menu');

  // Destino tras una recarga controlada (ver fresh): menú, o ficha del componente con un aviso de error
  var next = null;
  try { next = JSON.parse(sessionStorage.getItem('pcb-next') || 'null'); sessionStorage.removeItem('pcb-next'); } catch (e) {}
  if (next && next.comp && COMP.es[next.comp]) {
    state.comp = next.comp; renderSelect(); showScreen('select');
    if (next.err) showSelectError(t(next.err));
  }

  // Enlaces directos: index.html#gpu  -> abre la ficha de la GPU
  //                   index.html#gpu+preview -> abre la vista previa 3D (no requiere cámara)
  function deepLink() {
    var m = /^#(cpu|ram|gpu|motherboard)(\+preview)?$/.exec(location.hash);
    if (!m) return;
    stopScene();
    state.comp = m[1]; renderSelect(); showScreen('select');
    if (m[2]) startScene('preview');
  }
  if (!next) deepLink();
  window.addEventListener('hashchange', deepLink);

  // Ganchos de depuración/pruebas (no afectan al uso normal)
  window.PCBuilder = { state: state, start: startScene, stop: stopScene, select: function (id) { state.comp = id; renderSelect(); } };
})();
