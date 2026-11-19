/**
 * PC-Builder AR - capa 3D (A-Frame)
 * ---------------------------------------------------------------
 * Construye los 4 componentes (CPU, RAM, GPU, Motherboard) usando solo
 * primitivas de A-Frame: no hay modelos externos, asi la app funciona
 * sin red y se mantiene ligera en moviles de gama media (NFR1).
 *
 * Contrato con la capa 2D:  Models.build(id) -> { root, parts }
 *   root  : <a-entity> con el modelo (aun sin insertar en la escena)
 *   parts : [{ key, pos:[x,y,z] }]  puntos donde se muestran etiquetas
 */
(function () {
  'use strict';

  /* ---------- componentes A-Frame auxiliares ---------- */

  // Gira una entidad alrededor de Y. speed en rad/s (0 = detenida).
  AFRAME.registerComponent('spin', {
    schema: { speed: { type: 'number', default: 0 } },
    tick: function (t, dt) {
      if (this.data.speed) this.el.object3D.rotation.y += this.data.speed * dt / 1000;
    }
  });

  // Texto renderizado en <canvas> (no depende de fuentes remotas).
  //   mode: 'sprite' = etiqueta que siempre mira a la camara
  //         'flat'   = texto plano apoyado sobre una superficie
  AFRAME.registerComponent('tag', {
    schema: {
      text: { default: '' },
      mode: { default: 'sprite' },
      size: { default: 0.1 },
      color: { default: '#ffffff' },
      bg: { default: 'rgba(11,21,48,0.92)' },
      border: { default: '#38bdf8' }
    },
    init: function () {
      var d = this.data, fs = 44;
      var c = document.createElement('canvas'), g = c.getContext('2d');
      var font = '700 ' + fs + 'px "Segoe UI", system-ui, sans-serif';
      g.font = font;
      var tw = Math.ceil(g.measureText(d.text).width);
      var padX = d.mode === 'sprite' ? 30 : 10, padY = d.mode === 'sprite' ? 18 : 6;
      c.width = tw + padX * 2;
      c.height = fs + padY * 2;
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (d.mode === 'sprite') {
        var r = c.height / 2, w = c.width, h = c.height, b = 3;
        g.beginPath();
        g.moveTo(r, b); g.lineTo(w - r, b); g.arc(w - r, h / 2, r - b, -Math.PI / 2, Math.PI / 2);
        g.lineTo(r, h - b); g.arc(r, h / 2, r - b, Math.PI / 2, Math.PI * 1.5); g.closePath();
        g.fillStyle = d.bg; g.fill();
        g.lineWidth = b; g.strokeStyle = d.border; g.stroke();
      }
      g.fillStyle = d.color;
      g.fillText(d.text, c.width / 2, c.height / 2 + 2);

      var tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      var aspect = c.width / c.height, obj;
      if (d.mode === 'sprite') {
        obj = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tex, depthTest: false, transparent: true, toneMapped: false
        }));
        obj.scale.set(d.size * aspect, d.size, 1);
        obj.renderOrder = 999;
      } else {
        obj = new THREE.Mesh(
          new THREE.PlaneGeometry(d.size * aspect, d.size),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
        );
        obj.rotation.x = -Math.PI / 2;
      }
      this.el.setObject3D('tag', obj);
    },
    remove: function () { this.el.removeObject3D('tag'); }
  });

  /* ---------- helpers de construccion ---------- */

  function node(parent, tag, o) {
    var e = document.createElement(tag);
    var x = o.x || 0, y = o.y || 0, z = o.z || 0;
    var rx = o.rx || 0, ry = o.ry || 0, rz = o.rz || 0;
    var skip = { x: 1, y: 1, z: 1, rx: 1, ry: 1, rz: 1, color: 1, metal: 1, rough: 1, emissive: 1 };
    for (var k in o) if (!skip[k]) e.setAttribute(k, o[k]);
    e.setAttribute('position', x + ' ' + y + ' ' + z);
    if (rx || ry || rz) e.setAttribute('rotation', rx + ' ' + ry + ' ' + rz);
    if (o.color) {
      var m = 'color:' + o.color + ';metalness:' + (o.metal != null ? o.metal : 0.1) +
              ';roughness:' + (o.rough != null ? o.rough : 0.65);
      if (o.emissive) m += ';emissive:' + o.emissive + ';emissiveIntensity:0.9';
      e.setAttribute('material', m);
    }
    parent.appendChild(e);
    return e;
  }
  function box(p, o) { return node(p, 'a-box', o); }
  function cyl(p, o) { o['segments-radial'] = o['segments-radial'] || 32; return node(p, 'a-cylinder', o); }
  function group(p, o) { return node(p || document.createElement('a-entity'), 'a-entity', o || {}); }

  var GOLD = '#d4af37';

  /* ---------- CPU ---------- */
  function buildCPU() {
    var root = document.createElement('a-entity');
    box(root, { width: 1.0, height: 0.05, depth: 1.0, y: 0.025, color: '#1f7a3a', metal: 0.1 });           // sustrato
    box(root, { width: 0.64, height: 0.06, depth: 0.64, y: 0.08, color: '#cfd6de', metal: 0.95, rough: 0.22 }); // IHS
    box(root, { width: 0.5, height: 0.012, depth: 0.5, y: 0.116, color: '#b4bec9', metal: 0.95, rough: 0.3 });
    var t = document.createElement('a-entity');
    t.setAttribute('position', '0 0.123 0');
    t.setAttribute('tag', 'text: CPU; mode: flat; size: 0.17; color: #334155');
    root.appendChild(t);
    for (var side = 0; side < 4; side++) {                                                                      // contactos
      var holder = group(root, { ry: side * 90 });
      for (var i = -4; i <= 4; i++) {
        box(holder, { width: 0.05, height: 0.012, depth: 0.03, x: i * 0.085, y: 0.056, z: 0.42, color: GOLD, metal: 1, rough: 0.3 });
      }
    }
    box(root, { width: 0.07, height: 0.012, depth: 0.07, x: -0.44, y: 0.056, z: -0.44, ry: 45, color: GOLD, metal: 1, rough: 0.3 }); // muesca
    return {
      root: root,
      parts: [
        { key: 'ihs', pos: [0, 0.22, 0] },
        { key: 'pins', pos: [0.15, 0.17, 0.62] },
        { key: 'substrate', pos: [0.62, 0.12, -0.2] },
        { key: 'notch', pos: [-0.6, 0.17, -0.52] }
      ],
      scale: 0.62
    };
  }

  /* ---------- RAM (modulo DIMM) ---------- */
  function buildRAM() {
    var root = document.createElement('a-entity');
    box(root, { width: 1.5, height: 0.03, depth: 0.13, y: 0.015, z: 0.19, color: '#0f172a', metal: 0.2 });     // ranura
    box(root, { width: 1.4, height: 0.035, depth: 0.4, y: 0.05, color: '#15803d', metal: 0.1 });               // PCB
    for (var i = 0; i < 8; i++) {                                                                               // chips DRAM
      box(root, { width: 0.14, height: 0.022, depth: 0.13, x: -0.6 + i * 0.172 + (i > 3 ? 0.04 : 0), y: 0.078, z: -0.07, color: '#0b0f19', metal: 0.4, rough: 0.35 });
    }
    box(root, { width: 0.2, height: 0.01, depth: 0.075, x: 0.55, y: 0.073, z: 0.1, color: '#0b0f19' });        // SPD
    box(root, { width: 0.5, height: 0.004, depth: 0.09, x: -0.35, y: 0.069, z: 0.12, color: '#f1f5f9', rough: 0.9 }); // etiqueta
    box(root, { width: 1.3, height: 0.004, depth: 0.05, y: 0.069, z: 0.16, color: GOLD, metal: 1, rough: 0.28 });     // contactos
    box(root, { width: 0.03, height: 0.006, depth: 0.05, x: 0.12, y: 0.07, z: 0.18, color: '#0f172a' });       // muesca
    return {
      root: root,
      parts: [
        { key: 'chips', pos: [-0.2, 0.2, -0.1] },
        { key: 'contacts', pos: [0.3, 0.17, 0.32] },
        { key: 'notch', pos: [0.12, 0.2, 0.3] },
        { key: 'label', pos: [-0.5, 0.17, 0.2] }
      ],
      scale: 0.46
    };
  }

  /* ---------- GPU ---------- */
  function buildGPU() {
    var root = document.createElement('a-entity');
    box(root, { width: 1.7, height: 0.04, depth: 0.5, y: 0.03, color: '#0f172a', metal: 0.3 });                // PCB
    box(root, { width: 1.62, height: 0.2, depth: 0.5, x: 0.04, y: 0.15, color: '#1f2937', metal: 0.6, rough: 0.35 }); // carcasa
    box(root, { width: 1.62, height: 0.012, depth: 0.035, x: 0.04, y: 0.254, z: 0.2, color: '#22d3ee', emissive: '#22d3ee' });
    [-0.38, 0.46].forEach(function (fx) {                                                                       // ventiladores
      cyl(root, { radius: 0.29, height: 0.004, x: fx, y: 0.252, color: '#0b0f19', metal: 0.2 });
      var f = group(root, { x: fx, y: 0.262 });
      f.setAttribute('spin', 'speed: 7');
      for (var i = 0; i < 7; i++) {
        var arm = group(f, { ry: i * (360 / 7) });
        box(arm, { width: 0.22, height: 0.006, depth: 0.075, x: 0.15, rx: 18, color: '#64748b', metal: 0.3 });
      }
      cyl(root, { radius: 0.06, height: 0.03, x: fx, y: 0.268, color: '#334155', metal: 0.6 });
    });
    box(root, { width: 0.02, height: 0.3, depth: 0.6, x: -0.86, y: 0.15, color: '#cbd5e1', metal: 0.9, rough: 0.3 }); // bracket
    [-0.17, 0, 0.17].forEach(function (pz) {
      box(root, { width: 0.035, height: 0.05, depth: 0.1, x: -0.872, y: 0.2, z: pz, color: '#020617' });
    });
    box(root, { width: 0.6, height: 0.012, depth: 0.04, x: -0.45, y: 0.03, z: 0.265, color: GOLD, metal: 1, rough: 0.28 }); // PCIe
    box(root, { width: 0.14, height: 0.06, depth: 0.09, x: 0.76, y: 0.28, z: -0.18, color: '#111827' });       // alimentacion
    return {
      root: root,
      parts: [
        { key: 'fans', pos: [0.04, 0.45, 0] },
        { key: 'shroud', pos: [0.04, 0.4, 0.38] },
        { key: 'pcie', pos: [-0.35, 0.2, 0.45] },
        { key: 'bracket', pos: [-0.86, 0.45, 0] },
        { key: 'power', pos: [0.76, 0.45, -0.18] }
      ],
      scale: 0.4
    };
  }

  /* ---------- Placa base ---------- */
  function buildMB() {
    var root = document.createElement('a-entity');
    box(root, { width: 1.5, height: 0.04, depth: 1.5, y: 0.02, color: '#14532d', metal: 0.15 });               // PCB
    box(root, { width: 0.34, height: 0.03, depth: 0.34, x: -0.15, y: 0.055, z: -0.3, color: '#9ca3af', metal: 0.8, rough: 0.3 }); // socket
    box(root, { width: 0.26, height: 0.02, depth: 0.26, x: -0.15, y: 0.075, z: -0.3, color: '#1e293b', metal: 0.5 });
    for (var i = 0; i < 4; i++) {                                                                               // ranuras DIMM
      box(root, { width: 0.05, height: 0.04, depth: 0.78, x: 0.38 + i * 0.09, y: 0.06, z: -0.3, color: i % 2 ? '#374151' : '#0f172a' });
    }
    box(root, { width: 0.85, height: 0.035, depth: 0.07, x: -0.2, y: 0.0575, z: 0.25, color: '#e5e7eb', metal: 0.2 });  // PCIe x16
    box(root, { width: 0.85, height: 0.035, depth: 0.07, x: -0.2, y: 0.0575, z: 0.52, color: '#e5e7eb', metal: 0.2 });
    box(root, { width: 0.22, height: 0.08, depth: 0.22, x: 0.45, y: 0.08, z: 0.5, color: '#475569', metal: 0.85, rough: 0.3 }); // chipset
    box(root, { width: 0.1, height: 0.1, depth: 0.55, x: -0.55, y: 0.09, z: -0.3, color: '#334155', metal: 0.85, rough: 0.3 });  // VRM
    box(root, { width: 0.55, height: 0.1, depth: 0.1, x: -0.15, y: 0.09, z: -0.64, color: '#334155', metal: 0.85, rough: 0.3 });
    box(root, { width: 0.12, height: 0.2, depth: 0.6, x: -0.69, y: 0.14, z: -0.3, color: '#111827', metal: 0.5 });      // panel E/S
    [-0.42, -0.3, -0.18].forEach(function (pz, i) {
      box(root, { width: 0.02, height: 0.07, depth: 0.09, x: -0.755, y: 0.15, z: pz, color: ['#2563eb', '#f59e0b', '#16a34a'][i] });
    });
    box(root, { width: 0.06, height: 0.06, depth: 0.26, x: 0.71, y: 0.07, z: 0.0, color: '#f8fafc' });                   // ATX
    return {
      root: root,
      parts: [
        { key: 'socket', pos: [-0.15, 0.25, -0.3] },
        { key: 'dimm', pos: [0.52, 0.22, -0.7] },
        { key: 'pcie', pos: [-0.2, 0.2, 0.52] },
        { key: 'chipset', pos: [0.45, 0.25, 0.5] },
        { key: 'vrm', pos: [-0.5, 0.25, -0.72] },
        { key: 'io', pos: [-0.69, 0.4, -0.3] },
        { key: 'atx', pos: [0.71, 0.2, 0.0] }
      ],
      scale: 0.46
    };
  }

  var BUILDERS = { cpu: buildCPU, ram: buildRAM, gpu: buildGPU, motherboard: buildMB };

  window.Models = {
    ids: ['cpu', 'ram', 'gpu', 'motherboard'],
    build: function (id) {
      var m = BUILDERS[id]();
      m.root.setAttribute('scale', m.scale + ' ' + m.scale + ' ' + m.scale);
      m.root.setAttribute('spin', 'speed: 0');
      m.root.classList.add('pc-model');
      return m;
    }
  };
})();
