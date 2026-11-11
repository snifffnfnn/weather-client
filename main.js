// Weather Client website: download settings from config.js, the live aurora behind the hero,
// the screenshot viewer, and a few small touches. No libraries, no build step.
(() => {
  'use strict';

  const cfg = window.WEATHER_SITE || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- Download settings --------------------------------------------------------------------

  function formatSize(value) {
    if (typeof value === 'number' && value > 0) return `${Math.round(value / 1048576)} MB`;
    return typeof value === 'string' ? value : '';
  }

  function applyConfig() {
    const shown = {
      launcherVersion: cfg.launcherVersion,
      modVersion: cfg.modVersion,
      installerSize: formatSize(cfg.installerSize),
      sha256: cfg.sha256,
    };
    for (const el of $$('[data-cfg]')) {
      const value = shown[el.dataset.cfg];
      if (value) el.textContent = value;
    }
    const hasSha = /^[0-9a-f]{64}$/i.test(cfg.sha256 || '');
    const shaRow = $('.sha');
    if (shaRow && !hasSha) shaRow.hidden = true;
    const shaCode = $('code[data-cfg="sha256"]');
    if (shaCode && hasSha) {
      // Two even halves, so a narrow screen breaks the hash in the middle instead of leaving one
      // digit on a line of its own. <wbr> isn't copied with the text.
      shaCode.replaceChildren(cfg.sha256.slice(0, 32), document.createElement('wbr'), cfg.sha256.slice(32));
    }

    const url = typeof cfg.downloadUrl === 'string' ? cfg.downloadUrl.trim() : '';
    const cardButton = $('#download a[data-download]');
    if (!url) {
      // Not hosted yet: every Download button leads to the download section, which says so.
      const pending = $('.download-pending');
      if (pending) pending.hidden = false;
      if (cardButton) {
        cardButton.setAttribute('aria-disabled', 'true');
        cardButton.addEventListener('click', (e) => e.preventDefault());
      }
      return;
    }
    const started = $('.download-started');
    for (const a of $$('a[data-download]')) {
      a.href = url;
      if (cfg.installerName) a.setAttribute('download', cfg.installerName);
      a.addEventListener('click', () => {
        // The file downloads in place; show how to get past SmartScreen next to the download card.
        if (!started) return;
        started.hidden = false;
        if (!a.closest('#download')) {
          setTimeout(() => $('#download').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }), 120);
        }
      });
    }
  }

  // ---- Navigation ---------------------------------------------------------------------------

  function setupNav() {
    const nav = $('.nav');
    if (nav) {
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Highlight the link of the section in the middle of the screen.
    const links = new Map($$('.nav-links a[href^="#"]').map((a) => [a.getAttribute('href').slice(1), a]));
    if (links.size === 0 || !('IntersectionObserver' in window)) return;
    const inView = new Set();
    const order = [...links.keys()];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.id);
          else inView.delete(e.target.id);
        }
        const current = order.find((id) => inView.has(id));
        for (const [id, a] of links) {
          if (id === current) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const id of order) {
      const section = document.getElementById(id);
      if (section) io.observe(section);
    }
  }

  // ---- Screenshot viewer --------------------------------------------------------------------

  function setupLightbox() {
    const dialog = $('#lightbox');
    const buttons = $$('.shot');
    // The weather strip repeats pictures from the gallery: browse each picture once, in gallery order.
    const shots = buttons.filter((shot, i) => !buttons.slice(i + 1).some((later) => later.dataset.full === shot.dataset.full));
    if (!dialog || shots.length === 0) return;
    const img = $('img', dialog);
    const caption = $('.lightbox-caption', dialog);
    const canModal = typeof dialog.showModal === 'function';
    let index = 0;

    const show = (i, from) => {
      index = (i + shots.length) % shots.length;
      const shot = shots[index];
      const thumb = $('img', from || shot);
      // The thumbnail is already loaded, so show it at once and swap in the full size when ready.
      img.src = thumb.currentSrc || thumb.src;
      img.alt = thumb.alt;
      caption.textContent = shot.dataset.caption || '';
      const full = new Image();
      full.decoding = 'async';
      full.onload = () => {
        if (shots[index] === shot) img.src = full.src;
      };
      full.src = shot.dataset.full;
    };

    buttons.forEach((shot) =>
      shot.addEventListener('click', () => {
        if (!canModal) {
          window.open(shot.dataset.full, '_blank', 'noopener');
          return;
        }
        show(shots.findIndex((s) => s.dataset.full === shot.dataset.full), shot);
        document.documentElement.classList.add('modal-open');
        dialog.showModal();
      }),
    );

    const unlockScroll = () => document.documentElement.classList.remove('modal-open');
    const close = () => {
      unlockScroll();
      dialog.close();
    };
    // Esc closes the dialog natively; 'close' covers that path.
    dialog.addEventListener('close', unlockScroll);
    dialog.addEventListener('cancel', unlockScroll);
    // A click on the dimmed backdrop lands on the dialog itself.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close();
    });
    $('.lightbox-close', dialog).addEventListener('click', close);
    $('.lightbox-prev', dialog).addEventListener('click', () => show(index - 1));
    $('.lightbox-next', dialog).addEventListener('click', () => show(index + 1));
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else return;
      e.preventDefault();
    });

    // Swipe between screenshots on touch screens.
    let touchX = null;
    dialog.addEventListener('touchstart', (e) => (touchX = e.touches.length === 1 ? e.touches[0].clientX : null), { passive: true });
    dialog.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    });
  }

  // ---- Copy the installer's SHA-256 ---------------------------------------------------------

  function setupCopySha() {
    const button = $('[data-copy-sha]');
    if (!button) return;
    const label = $('.sha-label');
    const use = $('use', button);
    let timer = 0;
    button.addEventListener('click', async () => {
      const text = (cfg.sha256 || $('[data-cfg="sha256"]').textContent).trim();
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = legacyCopy(text);
      }
      if (!ok) return;
      button.classList.add('copied');
      use.setAttribute('href', '#i-check');
      if (label) label.textContent = 'Copied';
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.classList.remove('copied');
        use.setAttribute('href', '#i-copy');
        if (label) label.textContent = 'SHA-256';
      }, 1800);
    });
  }

  function legacyCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }

  // ---- The aurora behind the hero -----------------------------------------------------------
  // Weather Client's title-screen sky, the same shader as the launcher's backdrop: aurora curtains
  // across the whole sky over a mountain lake, stars, the odd shooting star. It renders below full
  // resolution, at most 30 frames a second, and stops while the hero is off screen or the tab is
  // hidden. With reduced motion it draws one still frame. Without WebGL the CSS gradient stays.

  function setupHeroSky() {
    const canvas = $('.hero-sky');
    if (!canvas) return;
    let gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    } catch {
      gl = null;
    }
    if (!gl) return;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader error');
      return s;
    };
    const program = gl.createProgram();
    try {
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link error');
    } catch (err) {
      console.warn('Aurora shader unavailable, keeping the plain sky.', err);
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    for (const name of ['res', 'time', 'speed', 'look', 'dim', 'fade', 'gain', 'scenery', 'horizon', 'cLow', 'cMid', 'cTop', 'glow']) {
      U[name] = gl.getUniformLocation(program, name);
    }
    // Weather Client's Aqua palette: curtain colours at the lower edge, middle and top.
    gl.uniform3f(U.cLow, 0.16, 1.0, 0.82);
    gl.uniform3f(U.cMid, 0.1, 0.78, 0.95);
    gl.uniform3f(U.cTop, 0.42, 0.36, 1.0);
    gl.uniform1f(U.speed, 1);
    gl.uniform1f(U.dim, 0);
    gl.uniform1f(U.fade, 1);
    gl.uniform1f(U.gain, 2.2);
    gl.uniform1f(U.scenery, 1);

    const anchor = $('#hero-title');
    const MAX_PIXELS = 1000000;
    let running = false;
    let raf = 0;
    let lastDraw = 0;
    let lastTick = 0;
    let skyTime = 40; // seconds of sky time; starts mid-show so the first frame has curtains up
    let mouseX = 0;
    let mouseY = 0;
    let lookX = 0;
    let lookY = 0;
    let heroVisible = true;
    let lost = false;

    const resize = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      // The sky is soft, so 60% of the screen's pixels looks the same and costs far less.
      let scale = Math.min(window.devicePixelRatio || 1, 2) * 0.6;
      const pixels = cw * ch * scale * scale;
      if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels);
      const w = Math.max(1, Math.round(cw * scale));
      const h = Math.max(1, Math.round(ch * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = () => {
      resize();
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.time, skyTime % 3600);
      gl.uniform2f(U.look, lookX, lookY);
      // A wide screen shows more sky above the text; a tall phone screen keeps the lake in view.
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      gl.uniform1f(U.horizon, aspect < 1 ? 0.26 : 0.2);
      if (anchor) {
        const c = canvas.getBoundingClientRect();
        const r = anchor.getBoundingClientRect();
        const sx = canvas.width / Math.max(1, c.width);
        const sy = canvas.height / Math.max(1, c.height);
        gl.uniform4f(U.glow, (r.left - c.left + r.width / 2) * sx, canvas.height - (r.top - c.top + r.height / 2) * sy, r.width * 0.55 * sx, 1);
      } else {
        gl.uniform4f(U.glow, 0, 0, 1, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!canvas.classList.contains('ready')) canvas.classList.add('ready');
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - lastDraw < 32) return; // ~30 FPS is plenty for a slow sky
      const dt = Math.min(0.1, (now - lastTick) / 1000);
      lastTick = now;
      lastDraw = now;
      skyTime += dt;
      const k = 1 - Math.exp(-dt * 2.5);
      lookX += (mouseX - lookX) * k;
      lookY += (mouseY - lookY) * k;
      draw();
    };

    const shouldRun = () => !lost && heroVisible && !document.hidden && !reduceMotion.matches;
    const update = () => {
      if (shouldRun() && !running) {
        running = true;
        lastTick = performance.now();
        lastDraw = 0;
        raf = requestAnimationFrame(frame);
      } else if (!shouldRun() && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
      // A still sky for reduced motion: one frame now, redrawn when the size changes.
      if (!lost && reduceMotion.matches) draw();
    };

    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = 1 - (e.clientY / window.innerHeight) * 2;
      },
      { passive: true },
    );
    document.addEventListener('visibilitychange', update);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        heroVisible = entries[entries.length - 1].isIntersecting;
        update();
      }).observe(canvas);
    }
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => {
        if (!running && !lost) draw();
      }).observe(canvas);
    }
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      lost = true;
      cancelAnimationFrame(raf);
      running = false;
      canvas.classList.remove('ready');
    });

    // Draw the first frame once the fonts are in, so the glow sits behind the final wordmark.
    const begin = () => {
      draw();
      update();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(begin, begin);
    else begin();
  }

  const VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

  // Ported unchanged from the launcher (launcher/src/renderer/components/AuroraSky.tsx), except
  // that the horizon height is a uniform and phones without highp fall back to mediump.
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 res;
uniform float time;
uniform float speed;
uniform vec2 look;
uniform float dim;
uniform float fade;
uniform float gain;
uniform float scenery;
uniform float horizon;
uniform vec3 cLow;
uniform vec3 cMid;
uniform vec3 cTop;
uniform vec4 glow;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm2(vec2 p) { return noise(p) * 0.66 + noise(p * 2.07 + vec2(17.1, 3.7)) * 0.34; }
float edge(float x, float seed) {
  return noise(vec2(x, seed)) * 0.6 + noise(vec2(x * 2.3 + 1.7, seed)) * 0.28 + noise(vec2(x * 5.1 + 3.1, seed)) * 0.12;
}
vec3 aurora(vec3 rd) {
  float az = atan(rd.x, rd.z);
  float e = rd.y / max(length(rd.xz), 0.0001);
  float t = time * speed;
  vec3 col = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float x = (az + look.x * 0.03 / (1.0 + fk * 0.6)) * (2.0 + fk * 1.1) + fk * 17.3;
    float drift = t * 0.02 * (1.0 + fk * 0.3);
    float amp = 0.11 - fk * 0.025;
    float b0 = edge(x * 0.6 + drift, fk * 7.0);
    float b1 = edge((x + 0.05) * 0.6 + drift, fk * 7.0);
    float ripple = (noise(vec2(x * 3.2 + t * 0.25, fk * 2.3 + 9.0)) - 0.5) * 0.03 + sin(x * 7.0 + t * 0.6 + b0 * 6.0) * 0.007;
    float tilt = (fk < 0.5 ? 0.07 : (fk < 1.5 ? -0.05 : 0.035)) * az;
    float base = 0.215 - fk * 0.07 + (b0 - 0.5) * amp + ripple + tilt;
    float fold = 1.0 + 1.4 * clamp(abs(b1 - b0) * amp / 0.05 * 5.0, 0.0, 1.0);
    float h = e - base;
    float rn = noise(vec2(x * 9.0 + t * 0.35, fk * 3.1));
    float fine = noise(vec2(x * 23.0 - t * 0.6, fk * 3.1 + 3.0));
    float rr = rn * 0.6 + fine * 0.4;
    float rays = 0.3 + 0.7 * rr * rr;
    float H = (0.11 - fk * 0.025) * (0.55 + 0.9 * rn);
    float hp = max(h, 0.0);
    float body = smoothstep(-0.003, 0.0015, h) * (exp(-hp / H) * 0.75 + exp(-hp / (H * 3.0)) * 0.25);
    float rim = exp(-abs(h) * 140.0) * 0.6;
    float under = h < 0.0 ? exp(h * 45.0) * 0.18 : 0.0;
    float floorP = fk < 0.5 ? 0.35 : 0.03;
    float patchy = floorP + (1.0 - floorP) * smoothstep(0.35, 0.8, noise(vec2(x * 1.3 - t * 0.035, fk * 5.0 + 1.0)));
    float breathe = 0.85 + 0.15 * sin(t * 0.3 + fk * 2.0);
    float strength = fk < 0.5 ? 1.0 : (fk < 1.5 ? 0.6 : 0.35);
    float gl = ((body + rim) * rays + under) * patchy * fold * breathe * strength;
    float hh = clamp(hp / (H * 2.2), 0.0, 1.0);
    vec3 tint = mix(cLow, cMid, smoothstep(0.0, 0.35, hh));
    tint = mix(tint, cTop, smoothstep(0.35, 1.0, hh));
    col += tint * gl;
  }
  return col * gain * 0.35 * smoothstep(0.0, 0.02, rd.y);
}
vec3 stars(vec3 rd, float pxAngle) {
  vec3 col = vec3(0.0);
  vec2 sp = vec2(atan(rd.x, rd.z), asin(clamp(rd.y, -1.0, 1.0)));
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float cells = 60.0 + fl * 75.0;
    vec2 g = sp * cells + vec2(fl * 13.7, fl * 7.1);
    vec2 id = floor(g);
    float h = hash12(id + fl * 31.7);
    if (h < 0.11 - fl * 0.025) {
      vec2 pos = vec2(hash12(id + 5.3), hash12(id + 9.1)) * 0.76 + 0.12;
      float dpx = length(fract(g) - pos) / (cells * pxAngle);
      float mag = hash12(id + 2.9);
      float size = 0.5 + 0.8 * mag;
      float b = exp(-dpx * dpx / (size * size));
      float tw = 0.72 + 0.28 * sin(time * (1.1 + 2.6 * hash12(id + 7.7)) + h * 91.0);
      vec3 tint = mix(vec3(0.70, 0.84, 1.0), vec3(1.0, 0.90, 0.78), hash12(id + 4.4));
      col += tint * b * tw * (0.18 + 1.3 * mag * mag * mag) * (1.0 - fl * 0.28);
    }
  }
  return col;
}
vec3 galaxy(vec3 rd) {
  float d = dot(rd, normalize(vec3(0.62, 0.42, -0.66)));
  float band = exp(-d * d * 22.0);
  vec2 p = vec2(atan(rd.x, rd.z) * 5.0, rd.y * 8.0);
  float dust = fbm2(p * 1.7) * 0.6 + fbm2(p * 4.3 + 3.0) * 0.4;
  return vec3(0.20, 0.30, 0.46) * band * smoothstep(0.35, 0.85, dust) * 0.10;
}
float farRidge(float x) {
  float n = 0.0;
  float a = 0.55;
  float f = 2.4;
  for (int i = 0; i < 5; i++) {
    float v = noise(vec2(x * f + 7.0, float(i) * 11.0));
    v = 1.0 - abs(v * 2.0 - 1.0);
    n += v * v * a;
    f *= 2.07;
    a *= 0.48;
  }
  return 0.012 + n * 0.075;
}
float nearRidge(float x) {
  float ground = 0.003 + fbm2(vec2(x * 3.2 + 40.0, 2.0)) * 0.022;
  float cell = x * 150.0;
  float id = floor(cell);
  float trees = 0.0;
  for (int k = -1; k <= 1; k++) {
    float cid = id + float(k);
    float size = hash12(vec2(cid, 9.0));
    float center = cid + 0.5 + (hash12(vec2(cid, 3.0)) - 0.5) * 0.7;
    float dx = abs(cell - center) / 150.0;
    float height = (0.004 + size * size * 0.017) * step(0.2, size);
    float notch = abs(fract((height - dx * 3.4) * 520.0) - 0.5) * 0.0011;
    trees = max(trees, height - dx * 3.4 - notch);
  }
  float forest = smoothstep(0.32, 0.55, fbm2(vec2(x * 5.0, 7.0)));
  return ground + max(trees, 0.0) * forest;
}
vec3 skyColor(vec3 rd, float pxAngle) {
  float e = max(rd.y, 0.0);
  vec3 col = mix(vec3(0.030, 0.095, 0.125), vec3(0.016, 0.040, 0.080), smoothstep(0.0, 0.16, e));
  col = mix(col, vec3(0.006, 0.012, 0.034), smoothstep(0.14, 0.75, e));
  col += cLow * 0.045 * exp(-e * 7.0);
  float t = time * speed;
  col += mix(cLow, cMid, 0.5) * 0.05 * smoothstep(0.3, 0.8, fbm2(rd.xz / (rd.y + 0.3) * 0.45 + vec2(t * 0.01, 0.0))) * exp(-e * 2.5);
  vec3 a = aurora(rd);
  float veil = clamp(dot(a, vec3(0.6)), 0.0, 1.0);
  col += (stars(rd, pxAngle) + galaxy(rd)) * smoothstep(0.0, 0.10, e) * (1.0 - 0.6 * veil);
  return col + a;
}
vec3 above(vec3 rd, float pxAngle, out float sky) {
  float az = atan(rd.x, rd.z);
  float e = rd.y / max(length(rd.xz), 0.0001);
  float hn = nearRidge(az + look.x * 0.012) * scenery;
  float hf = farRidge(az + look.x * 0.004) * scenery;
  sky = 0.0;
  if (e < hn) {
    vec3 col = vec3(0.004, 0.008, 0.014);
    col += cLow * 0.06 * exp(-(hn - e) * 520.0);
    return col;
  }
  if (e < hf) {
    vec3 col = vec3(0.016, 0.030, 0.052) * (0.8 + 0.4 * noise(vec2(az * 90.0, e * 140.0)));
    float snow = smoothstep(0.045, 0.075, hf) * (1.0 - smoothstep(0.004, 0.022, hf - e))
               * smoothstep(0.35, 0.65, noise(vec2(az * 160.0, e * 90.0)));
    col += vec3(0.08, 0.17, 0.21) * snow;
    col += cLow * 0.10 * exp(-(hf - e) * 260.0);
    col = mix(col, vec3(0.030, 0.090, 0.120), 0.55 * exp(-e * 70.0));
    return col;
  }
  sky = 1.0;
  return skyColor(rd, pxAngle);
}
vec3 meteor(vec2 uv) {
  float period = 6.5;
  float k = floor(time / period);
  float lt = time - k * period;
  float dur = 0.85;
  if (lt > dur || hash12(vec2(k, 3.0)) < 0.3) return vec3(0.0);
  vec2 start = vec2(hash12(vec2(k, 1.0)) * 1.4 - 0.7, 0.12 + hash12(vec2(k, 2.0)) * 0.3);
  float ang = -0.4 - hash12(vec2(k, 4.0)) * 0.5;
  float side = hash12(vec2(k, 5.0)) < 0.5 ? -1.0 : 1.0;
  vec2 dir = vec2(cos(ang) * side, sin(ang));
  float p = lt / dur;
  vec2 rel = uv - (start + dir * p * 0.55);
  float tail = 0.16 * min(1.0, p * 3.0);
  float along = dot(rel, -dir);
  if (along < -0.004 || along > tail) return vec3(0.0);
  float across = abs(rel.x * dir.y - rel.y * dir.x);
  float w = 0.0009 + 0.0011 * (1.0 - along / tail);
  float b = exp(-across * across / (w * w)) * pow(1.0 - clamp(along / tail, 0.0, 1.0), 1.6);
  b *= (1.0 - smoothstep(0.7, 1.0, p)) * smoothstep(0.0, 0.08, p);
  return vec3(0.80, 0.95, 1.0) * b * 1.6;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  float jitter = hash12(gl_FragCoord.xy + fract(time * 3.7) * 97.0);
  float F = 1.2;
  float pxAngle = 1.0 / (res.y * F);
  float tilt = scenery > 0.5 ? horizon : 0.5;
  vec3 rd = normalize(vec3(uv.x + look.x * 0.025, uv.y + tilt + look.y * 0.012, F));
  vec3 col;
  float sky;
  if (rd.y >= 0.0 || scenery < 0.5) {
    col = above(vec3(rd.x, abs(rd.y), rd.z), pxAngle, sky);
    col += meteor(uv) * sky;
  } else {
    float depth = -rd.y;
    vec2 wp = rd.xz / max(depth, 0.002);
    float ripple = (noise(vec2(wp.x * 1.6, wp.y * 0.35 - time * 0.35)) - 0.5)
                 + (noise(vec2(wp.x * 4.5 + time * 0.2, wp.y * 1.1 + time * 0.5)) - 0.5) * 0.5;
    vec3 rr = normalize(vec3(rd.x + ripple * 0.004, depth + ripple * (0.006 + depth * 0.05), rd.z));
    vec3 refl = above(rr, pxAngle, sky);
    float fres = 0.02 + 0.98 * pow(1.0 - clamp(depth * 1.1, 0.0, 1.0), 5.0);
    col = mix(vec3(0.003, 0.009, 0.015), refl * 0.92, fres);
  }
  vec2 gp = (gl_FragCoord.xy - glow.xy) / max(glow.z, 1.0);
  gp.x *= 0.42;
  col += mix(cLow, cMid, 0.55) * glow.w * 0.16 * exp(-dot(gp, gp) * 1.6);
  col *= 1.0 - 0.32 * pow(length(uv * vec2(0.85, 1.15)), 2.2);
  col = 1.0 - exp(-col * 1.3);
  col = mix(col, col * 0.34 + vec3(0.002, 0.005, 0.010), dim);
  col *= fade;
  col += (jitter - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

  // Start-up runs last, after the shader source above is defined.
  applyConfig();
  setupNav();
  setupLightbox();
  setupCopySha();
  setupHeroSky();
  for (const el of $$('[data-year]')) el.textContent = String(new Date().getFullYear());
})();
