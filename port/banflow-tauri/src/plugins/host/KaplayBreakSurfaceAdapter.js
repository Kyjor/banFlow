import kaplay from 'kaplay';

/**
 * Kaplay-backed implementation of breakSurface (renderer hidden from plugins).
 * TTF text in Kaplay 3001 breaks when using transform.color (bitmap-only).
 * UI labels render as HTML overlays; game rects stay on canvas.
 *
 * @param {import('banflow-plugin-api').BreakSurfaceCreateOpts} opts
 * @returns {import('banflow-plugin-api').BreakSurfaceSession}
 */
export function createBreakSurfaceSession(opts) {
  const { mount, width, height, scene } = opts;

  mount.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%;height:100%;';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = 'display:block;width:100%;height:100%;';

  const labelLayer = document.createElement('div');
  labelLayer.style.cssText =
    'position:absolute;inset:0;pointer-events:none;overflow:hidden;';

  wrapper.appendChild(canvas);
  wrapper.appendChild(labelLayer);
  mount.appendChild(wrapper);

  const k = kaplay({
    width,
    height,
    canvas,
    background: [135, 206, 235],
    font: 'sans-serif',
  });

  const entities = [];
  const entityById = new Map();
  const domLabels = [];
  const keyCallbacks = new Map();
  const registeredKeys = new Set();
  let tickHandler = null;
  let destroyed = false;
  let clickLocked = false;

  function track(obj, id) {
    entities.push(obj);
    if (id) entityById.set(id, obj);
    return obj;
  }

  function clearDomLabels() {
    domLabels.forEach((el) => el.remove());
    domLabels.length = 0;
  }

  /** HTML text — reliable in Tauri webview; Kaplay TTF labels corrupt easily. */
  function addDomLabel(text, x, y, { size = 12, color = '#1a1a1a', center = false } = {}) {
    const el = document.createElement('span');
    el.textContent = text;
    el.style.cssText = [
      'position:absolute',
      `left:${x}px`,
      `top:${y}px`,
      `font:${size}px system-ui,sans-serif`,
      `color:${color}`,
      'pointer-events:none',
      'white-space:nowrap',
      'line-height:1.2',
      'text-shadow:0 0 2px rgba(255,255,255,0.6)',
      center ? 'transform:translate(-50%,-50%)' : '',
    ].join(';');
    labelLayer.appendChild(el);
    domLabels.push(el);
    return el;
  }

  function registerKeyRouter(key) {
    if (registeredKeys.has(key)) return;
    registeredKeys.add(key);
    k.onKeyPress(key, () => {
      const cbs = keyCallbacks.get(key);
      if (!cbs) return;
      cbs.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error(`[breakSurface] key handler (${key}):`, err);
        }
      });
    });
  }

  const surface = {
    handle: k,
    onTick(callback) {
      tickHandler = callback;
    },
    onKeyPress(key, callback) {
      if (!keyCallbacks.has(key)) keyCallbacks.set(key, new Set());
      keyCallbacks.get(key).add(callback);
      registerKeyRouter(key);
    },
    addRect({ id, x, y, width: w, height: h, color: rgb }) {
      const c = rgb || [100, 100, 100];
      return track(
        k.add([
          k.rect(w, h),
          k.pos(x, y),
          k.color(c[0], c[1], c[2]),
          k.outline(1, k.rgb(40, 40, 40)),
          `break-${id}`,
        ]),
        id,
      );
    },
    addText(label, x, y, size = 12) {
      addDomLabel(label, x, y, { size, color: '#1a1a1a' });
    },
    addZone({ id, x, y, width: w, height: h, color: rgb, label, onClick }) {
      const c = rgb || [90, 140, 90];
      const zone = track(
        k.add([
          k.rect(w, h),
          k.pos(x, y),
          k.area(),
          k.color(c[0], c[1], c[2]),
          k.outline(1, k.rgb(30, 30, 30)),
          'break-zone',
          `break-${id}`,
        ]),
        id,
      );
      zone.onClick(() => {
        if (clickLocked || destroyed) return;
        clickLocked = true;
        requestAnimationFrame(() => {
          try {
            if (!destroyed) onClick();
          } finally {
            requestAnimationFrame(() => {
              clickLocked = false;
            });
          }
        });
      });
      if (label) {
        addDomLabel(label, x + w / 2, y + h / 2, {
          size: 11,
          color: '#ffffff',
          center: true,
        });
      }
    },
    setPosition(id, x, y) {
      const obj = entityById.get(id);
      if (obj) obj.pos = k.vec2(x, y);
    },
    clear() {
      tickHandler = null;
      entities.forEach((obj) => {
        try {
          k.destroy(obj);
        } catch {
          /* already destroyed */
        }
      });
      entities.length = 0;
      entityById.clear();
      clearDomLabels();
    },
  };

  k.scene('break-plugin', () => {
    const result = scene(surface);
    if (result && typeof result.then === 'function') {
      result.catch((err) => console.error('[breakSurface] scene error:', err));
    }
    k.onUpdate(() => {
      if (destroyed || !tickHandler) return;
      tickHandler(k.dt());
    });
  });

  k.go('break-plugin');

  return {
    destroy() {
      destroyed = true;
      tickHandler = null;
      keyCallbacks.clear();
      surface.clear();
      mount.innerHTML = '';
      try {
        k.quit();
      } catch {
        /* already quit */
      }
    },
    pause() {},
    resume() {},
    resize(w, h) {
      canvas.width = w;
      canvas.height = h;
    },
  };
}
