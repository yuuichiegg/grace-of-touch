/**
 * Grace Engine v1.0 — Unified 3D Customizer Framework
 * © 2024-2026 Grace of Touch Co. All rights reserved.
 *
 * Shared core for all Grace of Touch 3D apps:
 * - RocketCraft CAD, WanCraft 3D, Bowl Stand Designer,
 *   3D Box Customizer, Drone Port, 3D Relief STL, Resonance Drum
 *
 * Usage:
 *   const engine = new GraceEngine('#canvas', { grid: true, export: ['stl','gltf'] });
 *   engine.add(myMesh);
 *   engine.onExport('stl', () => engine.exportSTL(myMesh, 'model.stl'));
 */

(function(global) {
  'use strict';

  // ─── Version ───
  const VERSION = '1.0.0';

  // ─── GraceEngine Core ───
  class GraceEngine {
    constructor(canvasSelector, options = {}) {
      this.options = Object.assign({
        fov: 45,
        near: 0.1,
        far: 5000,
        background: 0x1a1a2e,
        grid: true,
        gridSize: 20,
        gridDivisions: 20,
        gridColor1: 0x333355,
        gridColor2: 0x222244,
        antialias: true,
        shadows: false,
        ambientIntensity: 0.6,
        ambientColor: 0xffffff,
        dirLightIntensity: 0.8,
        dirLightColor: 0xffffff,
        dirLightPos: [5, 10, 7],
        orbitControls: true,
        transformControls: false,
        export: ['stl'], // supported: 'stl', 'gltf', 'obj'
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      }, options);

      this.canvas = typeof canvasSelector === 'string'
        ? document.querySelector(canvasSelector) : canvasSelector;
      if (!this.canvas) throw new Error('GraceEngine: canvas not found');

      this._objects = [];
      this._animCallbacks = [];
      this._exportHandlers = {};
      this._disposed = false;

      this._initRenderer();
      this._initScene();
      this._initCamera();
      this._initLights();
      if (this.options.grid) this._initGrid();
      if (this.options.orbitControls) this._initOrbitControls();
      this._initResize();
      this._startLoop();
    }

    // ─── Renderer ───
    _initRenderer() {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: this.options.antialias,
        alpha: false,
        preserveDrawingBuffer: true, // needed for screenshot/export
      });
      this.renderer.setPixelRatio(this.options.pixelRatio);
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
      if (this.options.shadows) {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    }

    // ─── Scene ───
    _initScene() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.options.background);
    }

    // ─── Camera ───
    _initCamera() {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      this.camera = new THREE.PerspectiveCamera(this.options.fov, w / h, this.options.near, this.options.far);
      this.camera.position.set(8, 6, 8);
      this.camera.lookAt(0, 0, 0);
    }

    // ─── Lights ───
    _initLights() {
      this.ambientLight = new THREE.AmbientLight(this.options.ambientColor, this.options.ambientIntensity);
      this.scene.add(this.ambientLight);

      this.dirLight = new THREE.DirectionalLight(this.options.dirLightColor, this.options.dirLightIntensity);
      this.dirLight.position.set(...this.options.dirLightPos);
      if (this.options.shadows) {
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(1024, 1024);
      }
      this.scene.add(this.dirLight);
    }

    // ─── Grid ───
    _initGrid() {
      this.grid = new THREE.GridHelper(
        this.options.gridSize, this.options.gridDivisions,
        this.options.gridColor1, this.options.gridColor2
      );
      this.grid.material.transparent = true;
      this.grid.material.opacity = 0.4;
      this.scene.add(this.grid);
    }

    // ─── OrbitControls ───
    _initOrbitControls() {
      if (typeof THREE.OrbitControls === 'undefined') {
        console.warn('GraceEngine: OrbitControls not loaded');
        return;
      }
      this.controls = new THREE.OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 100;
    }

    // ─── Resize ───
    _initResize() {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._disposed) return;
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
      this._resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }

    // ─── Animation Loop ───
    _startLoop() {
      const animate = () => {
        if (this._disposed) return;
        requestAnimationFrame(animate);
        if (this.controls && this.controls.update) this.controls.update();
        for (const cb of this._animCallbacks) cb(this);
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    }

    // ─── Public API ───

    /** Add object to scene */
    add(obj) {
      this.scene.add(obj);
      this._objects.push(obj);
      return this;
    }

    /** Remove object from scene */
    remove(obj) {
      this.scene.remove(obj);
      this._objects = this._objects.filter(o => o !== obj);
      return this;
    }

    /** Register animation callback */
    onAnimate(callback) {
      this._animCallbacks.push(callback);
      return this;
    }

    /** Set camera position */
    setCameraPos(x, y, z) {
      this.camera.position.set(x, y, z);
      this.camera.lookAt(0, 0, 0);
      return this;
    }

    /** Set scene background color */
    setBackground(color) {
      this.scene.background = new THREE.Color(color);
      return this;
    }

    /** Adjust lighting */
    setLighting({ ambient, directional, position } = {}) {
      if (ambient !== undefined) this.ambientLight.intensity = ambient;
      if (directional !== undefined) this.dirLight.intensity = directional;
      if (position) this.dirLight.position.set(...position);
      return this;
    }

    // ─── Export: STL ───
    exportSTL(object, filename = 'model.stl') {
      if (typeof THREE.STLExporter === 'undefined') {
        console.error('GraceEngine: STLExporter not loaded');
        return;
      }
      const exporter = new THREE.STLExporter();
      const data = exporter.parse(object || this.scene, { binary: true });
      this._download(data, filename, 'application/octet-stream');
    }

    // ─── Export: glTF ───
    exportGLTF(object, filename = 'model.glb') {
      if (typeof THREE.GLTFExporter === 'undefined') {
        console.error('GraceEngine: GLTFExporter not loaded');
        return;
      }
      const exporter = new THREE.GLTFExporter();
      exporter.parse(object || this.scene, (result) => {
        const blob = result instanceof ArrayBuffer
          ? new Blob([result], { type: 'application/octet-stream' })
          : new Blob([JSON.stringify(result)], { type: 'application/json' });
        this._download(blob, filename);
      }, (err) => console.error('glTF export error:', err), { binary: filename.endsWith('.glb') });
    }

    // ─── Export: OBJ ───
    exportOBJ(object, filename = 'model.obj') {
      if (typeof THREE.OBJExporter === 'undefined') {
        console.error('GraceEngine: OBJExporter not loaded');
        return;
      }
      const exporter = new THREE.OBJExporter();
      const data = exporter.parse(object || this.scene);
      this._download(new Blob([data], { type: 'text/plain' }), filename);
    }

    // ─── Export: Screenshot ───
    exportScreenshot(filename = 'screenshot.png') {
      this.renderer.render(this.scene, this.camera);
      this.canvas.toBlob((blob) => {
        if (blob) this._download(blob, filename);
      });
    }

    // ─── Download Helper ───
    _download(data, filename, mime) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    // ─── Dispose ───
    dispose() {
      this._disposed = true;
      if (this._resizeObserver) this._resizeObserver.disconnect();
      if (this.controls) this.controls.dispose();
      this.renderer.dispose();
      this._animCallbacks = [];
      this._objects = [];
    }

    // ─── Version ───
    static get version() { return VERSION; }
  }

  // ─── GraceUI: Shared UI components ───
  class GraceUI {
    /**
     * Create a slider control
     * @param {HTMLElement} container
     * @param {object} opts - { label, min, max, value, step, onChange }
     */
    static slider(container, opts = {}) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12px;color:#ccc;';
      const label = document.createElement('span');
      label.textContent = opts.label || '';
      label.style.minWidth = '60px';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = opts.min ?? 0; input.max = opts.max ?? 100;
      input.value = opts.value ?? 50; input.step = opts.step ?? 1;
      input.style.cssText = 'flex:1;accent-color:#00e5ff;';
      const valSpan = document.createElement('span');
      valSpan.textContent = input.value;
      valSpan.style.cssText = 'min-width:32px;text-align:right;font-family:monospace;font-size:11px;';
      input.addEventListener('input', () => {
        valSpan.textContent = input.value;
        if (opts.onChange) opts.onChange(parseFloat(input.value));
      });
      wrap.append(label, input, valSpan);
      container.appendChild(wrap);
      return input;
    }

    /**
     * Create color swatch buttons
     * @param {HTMLElement} container
     * @param {Array<string>} colors - hex color strings
     * @param {function} onChange - callback(hexColor)
     */
    static colorSwatches(container, colors, onChange) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;';
      colors.forEach(c => {
        const btn = document.createElement('button');
        btn.style.cssText = `width:28px;height:28px;border-radius:6px;border:2px solid transparent;
          background:${c};cursor:pointer;transition:all .15s;`;
        btn.addEventListener('click', () => {
          wrap.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = '#00e5ff';
          if (onChange) onChange(c);
        });
        wrap.appendChild(btn);
      });
      container.appendChild(wrap);
      return wrap;
    }

    /**
     * Create export button toolbar
     * @param {HTMLElement} container
     * @param {object} handlers - { stl: fn, gltf: fn, obj: fn, screenshot: fn }
     */
    static exportToolbar(container, handlers = {}) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;';
      const btnStyle = `padding:6px 14px;border-radius:6px;border:1px solid #00e5ff;
        background:rgba(0,229,255,0.08);color:#00e5ff;cursor:pointer;font-size:11px;
        font-family:'Courier New',monospace;transition:all .15s;`;

      const formats = [
        { key: 'stl', label: '📦 STL' },
        { key: 'gltf', label: '🎨 glTF' },
        { key: 'obj', label: '📄 OBJ' },
        { key: 'screenshot', label: '📸 Screenshot' },
      ];
      formats.forEach(f => {
        if (!handlers[f.key]) return;
        const btn = document.createElement('button');
        btn.style.cssText = btnStyle;
        btn.textContent = f.label;
        btn.addEventListener('click', handlers[f.key]);
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(0,229,255,0.2)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(0,229,255,0.08)'; });
        wrap.appendChild(btn);
      });
      container.appendChild(wrap);
      return wrap;
    }

    /**
     * Create sidebar panel
     * @param {object} opts - { title, width, position }
     */
    static createSidebar(opts = {}) {
      const panel = document.createElement('div');
      const w = opts.width || '280px';
      const pos = opts.position || 'right';
      panel.style.cssText = `position:absolute;top:0;${pos}:0;width:${w};height:100%;
        background:rgba(15,15,30,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        border-${pos === 'right' ? 'left' : 'right'}:1px solid rgba(0,229,255,0.12);
        overflow-y:auto;padding:16px;z-index:10;font-family:'Noto Sans JP',sans-serif;`;
      if (opts.title) {
        const h = document.createElement('div');
        h.style.cssText = "font-family:'Orbitron',monospace;font-size:14px;color:#00e5ff;letter-spacing:0.1em;margin-bottom:12px;";
        h.textContent = opts.title;
        panel.appendChild(h);
      }
      return panel;
    }
  }

  // ─── GraceAuth: License / Source protection ───
  class GraceAuth {
    static init() {
      // DevTools blocking
      document.addEventListener('contextmenu', e => e.preventDefault());
      document.addEventListener('keydown', e => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || (e.ctrlKey && e.key === 'u'))
          e.preventDefault();
      });
      console.log('%c⚠ WARNING', 'color:red;font-size:24px;font-weight:bold;');
      console.log('%c© 2024-2026 Grace of Touch Co. All rights reserved.', 'color:red;font-size:12px;');
    }

    /** Firebase license check (returns Promise<boolean>) */
    static async checkLicense(uid) {
      if (!window.firebase || !firebase.firestore) return false;
      try {
        const doc = await firebase.firestore().collection('subscriptions').doc(uid).get();
        if (!doc.exists) return false;
        const data = doc.data();
        return data.plan === 'pro' && data.expiresAt && data.expiresAt.toDate() > new Date();
      } catch (e) { return false; }
    }
  }

  // ─── Expose ───
  global.GraceEngine = GraceEngine;
  global.GraceUI = GraceUI;
  global.GraceAuth = GraceAuth;

})(typeof window !== 'undefined' ? window : this);
