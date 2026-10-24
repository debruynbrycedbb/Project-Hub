/* ==========================================================================
   Project hub: behaviour
   - Builds the sidebar and homepage cards from projects.js
   - Routes with the address hash (#/ is home, #/movies opens a project)
   - Opens each site inside the hub in its own frame, kept loaded so
     switching back is instant and the site keeps its place
   - Draws the homepage constellation
   The hub stores nothing in the browser, so it can never clash with the
   saved data of the sites it opens.
   ========================================================================== */

(function () {
  'use strict';

  const config = window.HUB_CONFIG || { hub: {}, projects: [] };
  const hub = config.hub || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = window.matchMedia('(max-width: 899px)');

  const projects = (config.projects || [])
    .filter((p) => p && p.id && p.name)
    .map((p, i) => ({ ...p, order: Number.isFinite(p.order) ? p.order : 100 + i }))
    .sort((a, b) => a.order - b.order)
    .map((p) => ({ ...p, available: p.status !== 'placeholder' && isWebAddress(p.url) }));

  const byId = new Map(projects.map((p) => [p.id, p]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const shell = $('[data-shell]');
  const main = $('#main');
  const home = $('[data-home]');
  const viewer = $('[data-viewer]');
  const frames = $('[data-frames]');
  const status = $('[data-frame-status]');

  const icons = {
    external:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  };

  function isWebAddress(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v; // only used for the fixed icons above
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c) node.append(c);
    return node;
  }

  function prettyUrl(url) {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  function hrefFor(p) {
    if (!p.available) return undefined;
    return p.embed === false ? p.url : `#/${p.id}`;
  }

  /* ------------------------------------------------------------ text */

  if (hub.tag || hub.owner) $('[data-hub-tag]').textContent = hub.tag || hub.owner;
  if (hub.headline) $('[data-hub-headline]').textContent = hub.headline;
  $('[data-hub-intro]').textContent = hub.intro || '';
  $('[data-year]').textContent = String(new Date().getFullYear());
  if (hub.owner) $('[data-owner]').textContent = hub.owner;

  /* ------------------------------------------------------------ sidebar */

  const sideList = $('[data-side-list]');
  for (const p of projects) {
    const external = p.embed === false;
    const link = el(
      p.available ? 'a' : 'span',
      {
        class: 'side-link',
        href: hrefFor(p),
        target: external ? '_blank' : undefined,
        rel: external ? 'noopener' : undefined,
        'data-nav': p.id,
        'aria-disabled': p.available ? undefined : 'true',
      },
      [
        el('span', { class: 'side-thumb', 'aria-hidden': 'true' }, [
          p.preview ? el('img', { src: p.preview, alt: '', loading: 'lazy', decoding: 'async' }) : null,
        ]),
        el('span', { class: 'side-text' }, [
          el('span', { class: 'side-name', text: p.name }),
          el('span', { class: 'side-cat', text: p.available ? p.category || '' : 'Address not set' }),
        ]),
      ],
    );
    const ext = p.available
      ? el('a', {
          class: 'side-ext',
          href: p.url,
          target: '_blank',
          rel: 'noopener',
          'aria-label': `Open ${p.name} in a new tab`,
          html: icons.external,
        })
      : null;
    sideList.append(el('li', { class: `side-item${external ? ' side-item--external' : ''}` }, [link, ext]));
  }

  // Say which sites open inside the hub and which open in their own tab.
  {
    const names = (list) => list.map((p) => p.name).join(list.length > 2 ? ', ' : ' and ').replace(/, ([^,]*)$/, ' and $1');
    const inside = projects.filter((p) => p.available && p.embed !== false);
    const outside = projects.filter((p) => p.available && p.embed === false);
    const foot = $('[data-side-foot]');
    if (foot && outside.length && inside.length) {
      foot.textContent = `${names(inside)} ${inside.length > 1 ? 'open' : 'opens'} here. ${names(outside)} ${outside.length > 1 ? 'open' : 'opens'} in ${outside.length > 1 ? 'their' : 'its'} own tab.`;
    } else if (foot && outside.length) {
      foot.textContent = 'Each site opens in its own tab.';
    }
  }

  /* ------------------------------------------------------------ cards */

  const cardList = $('[data-cards]');
  projects.forEach((p, i) => {
    const external = p.embed === false;
    const facts = (p.facts || []).slice(0, 3);
    const card = el('li', { class: `card${p.available ? '' : ' is-placeholder'}`, style: `--i:${i + 3}`, 'data-card': p.id }, [
      el('div', { class: 'card-media' }, [
        p.preview
          ? el('img', {
              src: p.preview,
              alt: p.previewAlt || '',
              loading: i === 0 ? 'eager' : 'lazy',
              decoding: 'async',
              width: '1200',
              height: '750',
            })
          : null,
      ]),
      el('div', { class: 'card-body' }, [
        el('h3', { class: 'card-name' }, [
          p.available
            ? el(
                'a',
                {
                  class: 'card-link',
                  href: hrefFor(p),
                  target: external ? '_blank' : undefined,
                  rel: external ? 'noopener' : undefined,
                },
                [el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', { text: p.name })],
              )
            : el('span', { class: 'card-link' }, [
                el('span', { class: 'dot', 'aria-hidden': 'true' }),
                el('span', { text: p.name }),
              ]),
        ]),
        el('p', { class: 'card-cat', text: p.category || '' }),
        el('p', { class: 'card-desc', text: p.description || '' }),
        facts.length
          ? el(
              'dl',
              { class: 'stats' },
              facts.map((f) => el('div', {}, [el('dt', { text: f.label }), el('dd', { text: f.value })])),
            )
          : null,
        el('div', { class: 'card-actions' }, [
          p.available
            ? el('span', { class: 'cta', 'aria-hidden': 'true', html: `<span>${external ? 'Open site' : 'Open here'}</span>${external ? icons.external : icons.arrow}` })
            : el('span', { class: 'card-missing', text: 'Add the address in projects.js to open this site' }),
          p.available && !external
            ? el('a', {
                class: 'card-ext',
                href: p.url,
                target: '_blank',
                rel: 'noopener',
                'aria-label': `Open ${p.name} in a new tab`,
                html: `<span aria-hidden="true">New tab</span>${icons.external}`,
              })
            : null,
        ]),
      ]),
    ]);
    cardList.append(card);
  });

  document.querySelectorAll('.hero-text > *').forEach((n, i) => n.style.setProperty('--i', i));

  /* ------------------------------------------------------------ viewer */

  const frameCache = new Map();
  let current = null;
  let slowTimer = 0;

  function frameFor(p) {
    let f = frameCache.get(p.id);
    if (f) return f;
    f = el('iframe', {
      class: 'site-frame',
      title: p.name,
      src: p.url,
      allow: 'fullscreen; clipboard-write',
      'data-project': p.id,
    });
    f.dataset.state = 'loading';
    f.addEventListener('load', () => {
      f.dataset.state = 'loaded';
      f.classList.add('is-ready');
      if (current === p) showLoaded();
    });
    frames.append(f);
    frameCache.set(p.id, f);
    return f;
  }

  function showLoading(p) {
    viewer.classList.remove('is-loaded');
    void viewer.offsetWidth; // restart the progress line
    viewer.classList.add('is-loading');
    $('[data-status-name]').textContent = p.name;
    $('[data-status-text]').textContent = 'Loading';
    const ext = $('[data-status-ext]');
    ext.href = p.url;
    ext.hidden = true;
    status.hidden = false;
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => {
      if (current !== p) return;
      $('[data-status-text]').textContent =
        'This is taking a while. The site may be offline, or it may not allow being shown inside another page.';
      ext.hidden = false;
    }, 12000);
  }

  function showLoaded() {
    clearTimeout(slowTimer);
    viewer.classList.remove('is-loading');
    viewer.classList.add('is-loaded');
    status.hidden = true;
  }

  function openProject(p) {
    current = p;
    const f = frameFor(p);
    for (const other of frameCache.values()) other.hidden = other !== f;
    if (f.dataset.state === 'loaded') showLoaded();
    else showLoading(p);

    $('[data-viewer-title]').textContent = p.name;
    $('[data-viewer-url]').textContent = prettyUrl(p.url);
    $('[data-viewer-ext]').href = p.url;
    $('[data-viewer-ext]').setAttribute('aria-label', `Open ${p.name} in a new tab`);

    const note = $('[data-viewer-note]');
    note.hidden = !p.embedNote;
    if (p.embedNote) {
      $('[data-viewer-note-text]').textContent = p.embedNote;
      const link = $('[data-viewer-note-link]');
      link.href = p.url;
      link.setAttribute('aria-label', `Open ${p.name} in a new tab with your usual data`);
    }
  }

  $('[data-reload]').addEventListener('click', () => {
    if (!current) return;
    const f = frameFor(current);
    f.dataset.state = 'loading';
    f.classList.remove('is-ready');
    showLoading(current);
    f.src = current.url;
  });

  /* ------------------------------------------------------------ routing */

  const topTitle = $('[data-topbar-title]');
  const topExt = $('[data-topbar-ext]');
  let firstRoute = true;

  function route() {
    const id = decodeURIComponent(location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || '');
    const p = byId.get(id);
    const showProject = p && p.available && p.embed !== false;

    if (showProject) {
      home.hidden = true;
      viewer.hidden = false;
      openProject(p);
      document.title = `${p.name} · ${hub.title || 'Project hub'}`;
      topTitle.textContent = p.name;
      topExt.href = p.url;
      topExt.setAttribute('aria-label', `Open ${p.name} in a new tab`);
      topExt.hidden = false;
      graph.stop();
    } else {
      if (id && location.hash !== '#/') history.replaceState(null, '', '#/');
      current = null;
      clearTimeout(slowTimer);
      viewer.hidden = true;
      home.hidden = false;
      for (const f of frameCache.values()) f.hidden = true;
      document.title = `${hub.title || 'Project hub'} · ${hub.owner || ''}`.replace(/ · $/, '');
      topTitle.textContent = hub.title || 'Project hub';
      topExt.hidden = true;
      main.scrollTop = 0;
      graph.start();
    }

    for (const a of document.querySelectorAll('[data-nav]')) {
      const active = showProject ? a.dataset.nav === p.id : a.dataset.nav === 'home';
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }

    closeMenu(false);

    // Move focus for keyboard and screen reader users after they navigate.
    if (!firstRoute) {
      if (showProject && !smallScreen.matches) $('[data-viewer-title]').focus({ preventScroll: true });
      else main.focus({ preventScroll: true });
    }
    firstRoute = false;
  }

  /* ------------------------------------------------------------ mobile menu */

  const toggle = $('[data-menu-toggle]');
  const scrim = $('[data-scrim]');
  const sidebar = $('[data-sidebar]');

  function openMenu() {
    shell.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    scrim.hidden = false;
    main.inert = true;
    const target = sidebar.querySelector('[aria-current="page"]') || sidebar.querySelector('a');
    if (target) target.focus({ preventScroll: true });
  }

  function closeMenu(returnFocus = true) {
    if (!shell.classList.contains('menu-open')) return;
    shell.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    main.inert = false;
    setTimeout(() => {
      if (!shell.classList.contains('menu-open')) scrim.hidden = true;
    }, 350);
    if (returnFocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => {
    if (shell.classList.contains('menu-open')) closeMenu();
    else openMenu();
  });
  scrim.addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
  smallScreen.addEventListener('change', () => {
    closeMenu(false);
    sidebar.inert = false;
  });
  // Tapping the current page's link in the drawer still closes it.
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#"]')) closeMenu(false);
  });

  /* ------------------------------------------------------------ constellation */

  const graphProjects = projects.filter((p) => p.available);
  const graph = createConstellation($('[data-graph]'), {
    names: graphProjects.map((p) => p.name),
    host: $('.home'),
    floor: $('.cards'),
    avoid: [$('.hero-title'), $('.hero-intro'), $('.tag')],
  });
  // Hovering or focusing a card or a sidebar link lights up its site in the graph.
  graphProjects.forEach((p, i) => {
    document.querySelectorAll(`[data-card="${p.id}"], .side-link[data-nav="${p.id}"]`).forEach((n) => {
      const on = () => graph.focus(i);
      const off = () => graph.focus(-1);
      n.addEventListener('pointerenter', on);
      n.addEventListener('pointerleave', off);
      n.addEventListener('focusin', on);
      n.addEventListener('focusout', off);
    });
  });

  /* ------------------------------------------------------------ start */

  window.addEventListener('hashchange', route);

  const startsHome = !byId.has(location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]);
  if (startsHome && !reduceMotion.matches) {
    shell.classList.add('is-entering');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        shell.classList.add('has-entered');
        shell.classList.remove('is-entering');
      }),
    );
  }
  route();

  /* ==================================================================
     Homepage constellation: the hub and each site as bright nodes in a
     drifting field of connected points. Signals travel between the hub
     and each site, the points ease away from the pointer, and hovering a
     card lights up its site. Built from projects.js, so a new project adds
     a node. Paused whenever it can't be seen (another view open, tab
     hidden, scrolled away) and still when reduced motion is on.
     ================================================================== */

  function createConstellation(canvas, opts) {
    const noop = { start() {}, stop() {}, focus() {} };
    if (!canvas || !canvas.getContext) return noop;
    const ctx = canvas.getContext('2d');
    if (!ctx) return noop;

    const TAU = Math.PI * 2;
    const RAD = Math.PI / 180;
    const ACCENT = [92, 178, 255];
    const SOFT = [170, 214, 255];
    const INK = [232, 237, 245];
    const INK3 = [95, 107, 128];
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = (s) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);

    const names = opts.names;
    const avoidEls = opts.avoid || [];
    const host = opts.host || canvas;
    const floorEl = opts.floor;
    let W = 0, H = 0, S = 0, dpr = 1, cssW = 0, compact = false;
    let hub = [0, 0], base = [], angles = [], pts = [], avoid = [], hubLabelAt = null;
    let focusIdx = -1, mouse = null;
    let running = false, wanted = false, visible = true, raf = 0, last = 0;

    /* ---------- layout ---------- */

    function layout() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = rect.width;
      W = canvas.width = Math.round(rect.width * dpr);
      H = canvas.height = Math.round(rect.height * dpr);
      compact = cssW < 400 || smallScreen.matches;

      // Keep labels off the headline and intro.
      avoid = avoidEls.filter(Boolean).map((el) => {
        const r = el.getBoundingClientRect();
        const pad = 10;
        return [(r.left - rect.left - pad) * dpr, (r.top - rect.top - pad) * dpr, (r.right - rect.left + pad) * dpr, (r.bottom - rect.top + pad) * dpr];
      });

      // Fit the drawing between the top of the page and the cards, so nothing lands on a card.
      let floorY = H;
      if (floorEl) {
        const f = floorEl.getBoundingClientRect();
        if (f.height) floorY = clamp((f.top - rect.top - 18) * dpr, H * 0.45, H);
      }
      S = Math.min(W, floorY * 1.08);

      const n = names.length;
      angles = names.map((_, i) => (n === 3 ? [-150, -24, 112][i] : -150 + (360 / n) * i));
      let R = S * 0.3;
      // On wide layouts, keep the site nodes to the right of the headline and intro.
      const textRight = compact ? 0 : avoid.reduce((m, r) => Math.max(m, r[2]), 0);
      let hx = Math.max(W * 0.54, textRight + R * 0.87 + 30 * dpr);
      const maxX = W - R * 0.92 - 24 * dpr;
      if (hx > maxX) {
        R = clamp((W - 54 * dpr - textRight) / 1.79, S * 0.2, R);
        hx = Math.min(Math.max(W * 0.54, textRight + R * 0.87 + 30 * dpr), W - R * 0.92 - 24 * dpr);
      }
      hub = [hx, floorY * 0.5];
      base = angles.map((d) => [hub[0] + Math.cos(d * RAD) * R, hub[1] + Math.sin(d * RAD) * R * 0.92]);

      // "Project hub" sits in the widest gap between links.
      const sorted = angles.map((a) => ((a % 360) + 360) % 360).sort((a, b) => a - b);
      let gapMid = 45, gap = -1;
      sorted.forEach((a, i) => {
        const b = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360;
        if (b - a > gap) { gap = b - a; gapMid = (a + b) / 2; }
      });
      hubLabelAt = [Math.cos(gapMid * RAD), Math.sin(gapMid * RAD)];

      // About twice the points of the preview: density scales with the drawing's size.
      const count = Math.round(clamp(175 * Math.pow(cssW / 600, 2), 70, 200));
      if (pts.length !== count) {
        pts = Array.from({ length: count }, () => {
          const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * S * 0.45;
          const sp = S * (0.005 + Math.random() * 0.011), d = Math.random() * TAU;
          return {
            u: Math.cos(a) * r / S, v: Math.sin(a) * r * 0.92 / S,
            vx: Math.cos(d) * sp / S, vy: Math.sin(d) * sp / S,
            size: 0.7 + Math.random() * 0.8, alpha: 0.3 + Math.random() * 0.45,
          };
        });
      }
      return true;
    }

    /* ---------- drawing helpers ---------- */

    function glow(x, y, r, c, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(c, a));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    const PERIOD = 3.6, TRAVEL = 0.5, PING = 1.1;
    function signal(t, i) {
      const u = t / PERIOD + i / names.length;
      const cyc = Math.floor(u), f = u - cyc, out = cyc % 2 === 0;
      if (f < TRAVEL) return { s: ease(f / TRAVEL), out, ping: 0 };
      const since = (f - TRAVEL) * PERIOD;
      return { s: null, out, ping: since < PING ? 1 - since / PING : 0 };
    }

    let taken = []; // boxes already used this frame (nodes and placed labels)
    const overlaps = (box, list) => list.some((r) => box[0] < r[2] && box[2] > r[0] && box[1] < r[3] && box[3] > r[1]);
    const hits = (box) => overlaps(box, avoid) || overlaps(box, taken);

    // Draw text at the first candidate spot that stays in the drawing and clears the text, nodes and other labels.
    function place(str, spots, font, spacing, colour) {
      ctx.save();
      ctx.font = font;
      if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
      const w = ctx.measureText(str).width, h2 = 7 * dpr, pad = 8 * dpr;
      for (const s of spots) {
        const x0 = s.align === 'right' ? s.x - w : s.align === 'center' ? s.x - w / 2 : s.x;
        const box = [x0 - 3 * dpr, s.y - h2, x0 + w + 3 * dpr, s.y + h2];
        if (box[0] < pad || box[2] > W - pad || box[1] < pad || hits(box)) continue;
        ctx.textAlign = s.align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colour;
        ctx.fillText(str, s.x, s.y);
        taken.push(box);
        break;
      }
      ctx.restore();
    }

    // Name beside its node: preferred side, else the other side, else below, else left out.
    function label(nx, ny, text, preferLeft, a, hl) {
      if (compact || a <= 0.01) return;
      const fs = 10.5 * dpr, gap = 16 * dpr;
      const L = { x: nx - gap, y: ny, align: 'right' }, R = { x: nx + gap, y: ny, align: 'left' }, B = { x: nx, y: ny + 22 * dpr, align: 'center' };
      place(text.toUpperCase(), preferLeft ? [L, R, B] : [R, L, B], `600 ${fs}px Manrope, system-ui, sans-serif`, `${(fs * 0.2).toFixed(1)}px`, rgba(hl ? ACCENT : INK, a));
    }

    function siteNode(x, y, a, focus, ping) {
      const r = 3.6 * dpr;
      glow(x, y, r * (focus ? 9 : 6), ACCENT, (focus ? 0.5 : 0.3) * a);
      if (ping > 0) {
        ctx.strokeStyle = rgba(ACCENT, 0.7 * ping * a);
        ctx.lineWidth = dpr;
        ctx.beginPath(); ctx.arc(x, y, r * (2.2 + (1 - ping) * 4), 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = rgba(ACCENT, (focus ? 0.95 : 0.6) * a);
      ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba(focus ? INK : SOFT, a);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    function hubNode(x, y, t, ping) {
      const r = 5 * dpr;
      glow(x, y, r * 9, ACCENT, 0.28);
      if (ping > 0) {
        ctx.strokeStyle = rgba(ACCENT, 0.55 * ping);
        ctx.lineWidth = dpr;
        ctx.beginPath(); ctx.arc(x, y, r * (3.2 + (1 - ping) * 3), 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = rgba(ACCENT, 0.5);
      ctx.lineWidth = dpr;
      ctx.beginPath();
      for (let k = 0; k < 24; k++) {
        const ang = (k / 24) * TAU + t * 0.08;
        const r1 = r * 3.1, r2 = r * (k % 6 === 0 ? 3.9 : 3.5);
        ctx.moveTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1);
        ctx.lineTo(x + Math.cos(ang) * r2, y + Math.sin(ang) * r2);
      }
      ctx.stroke();
      ctx.strokeStyle = rgba(ACCENT, 0.85);
      ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba(INK, 1);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }

    function drawSignal(a, b, g, alpha) {
      if (g.s == null) return;
      const s = g.out ? g.s : 1 - g.s;
      const at = (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      for (let k = 6; k >= 1; k--) {
        const sk = g.out ? s - k * 0.018 : s + k * 0.018;
        if (sk < 0 || sk > 1) continue;
        const q = at(sk);
        ctx.fillStyle = rgba(SOFT, alpha * 0.35 * (1 - k / 7));
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.3 * dpr, 0, TAU); ctx.fill();
      }
      const p = at(s);
      glow(p[0], p[1], 9 * dpr, ACCENT, 0.55 * alpha);
      ctx.fillStyle = rgba(INK, alpha);
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.8 * dpr, 0, TAU); ctx.fill();
    }

    /* ---------- frame ---------- */

    function draw(t, dt) {
      if (!S) return;
      ctx.clearRect(0, 0, W, H);
      const lim = 0.46;

      // Move the points (stored relative to the hub, in units of S, so a resize keeps them in place)
      const m = mouse && [(mouse[0] - hub[0]) / S, (mouse[1] - hub[1]) / S];
      for (const p of pts) {
        p.u += p.vx * dt; p.v += p.vy * dt;
        const d = Math.hypot(p.u, p.v / 0.92);
        if (d > lim) { p.vx -= (p.u / d) * 0.01 * dt; p.vy -= (p.v / d) * 0.01 * dt; }
        if (m) {
          const mx = p.u - m[0], my = p.v - m[1], md = Math.hypot(mx, my), rr = 0.13;
          if (md < rr && md > 0.001) { const f = (1 - md / rr) * 0.6 * dt; p.u += (mx / md) * f; p.v += (my / md) * f; }
        }
      }
      const P = pts.map((p) => [hub[0] + p.u * S, hub[1] + p.v * S]);
      const sites = base.map((b, i) => [b[0] + Math.sin(t * 0.3 + i * 2) * S * 0.012, b[1] + Math.cos(t * 0.24 + i) * S * 0.012]);

      // Point-to-point links, batched by strength
      const maxD = S * 0.088, maxD2 = maxD * maxD, buckets = [[], [], [], []];
      for (let i = 0; i < P.length; i++) {
        const a = P[i];
        for (let j = i + 1; j < P.length; j++) {
          const b = P[j], dx = a[0] - b[0], dy = a[1] - b[1], d2 = dx * dx + dy * dy;
          if (d2 < maxD2) buckets[Math.min(3, Math.floor((1 - Math.sqrt(d2) / maxD) * 4))].push(a, b);
        }
      }
      ctx.lineWidth = dpr;
      buckets.forEach((b, k) => {
        if (!b.length) return;
        ctx.strokeStyle = rgba(ACCENT, 0.045 + k * 0.055);
        ctx.beginPath();
        for (let q = 0; q < b.length; q += 2) { ctx.moveTo(b[q][0], b[q][1]); ctx.lineTo(b[q + 1][0], b[q + 1][1]); }
        ctx.stroke();
      });

      // Each site gathers the points around it
      const near = S * 0.13;
      sites.forEach((s, i) => {
        ctx.strokeStyle = rgba(ACCENT, focusIdx === i ? 0.3 : 0.13);
        ctx.beginPath();
        for (const p of P) if (Math.abs(p[0] - s[0]) < near && Math.abs(p[1] - s[1]) < near && Math.hypot(p[0] - s[0], p[1] - s[1]) < near) { ctx.moveTo(s[0], s[1]); ctx.lineTo(p[0], p[1]); }
        ctx.stroke();
      });
      for (let i = 0; i < P.length; i++) {
        ctx.fillStyle = rgba(SOFT, pts[i].alpha);
        ctx.beginPath(); ctx.arc(P[i][0], P[i][1], pts[i].size * dpr, 0, TAU); ctx.fill();
      }

      // Sites linked to each other, faintly
      if (sites.length > 2) {
        ctx.setLineDash([2 * dpr, 5 * dpr]);
        ctx.strokeStyle = rgba(ACCENT, 0.16);
        ctx.beginPath();
        sites.forEach((s, i) => (i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hub to each site, with a signal going one way then the other
      let hubPing = 0;
      sites.forEach((s, i) => {
        const f = focusIdx === i, dim = focusIdx >= 0 && !f ? 0.45 : 1;
        ctx.strokeStyle = rgba(ACCENT, (f ? 0.85 : 0.42) * dim);
        ctx.lineWidth = (f ? 1.6 : 1.2) * dpr;
        ctx.beginPath(); ctx.moveTo(hub[0], hub[1]); ctx.lineTo(s[0], s[1]); ctx.stroke();
        const g = signal(t, i);
        if (!g.out) hubPing = Math.max(hubPing, g.ping);
        drawSignal(hub, s, g, dim);
      });

      hubNode(hub[0], hub[1], t, hubPing);
      sites.forEach((s, i) => {
        const g = signal(t, i), f = focusIdx === i, dim = focusIdx >= 0 && !f ? 0.55 : 1;
        siteNode(s[0], s[1], dim, f, g.out ? g.ping : 0);
      });

      // Labels: sites first, then "Project hub" if there's room
      const nr = 10 * dpr, hr = 26 * dpr;
      taken = sites.map((s) => [s[0] - nr, s[1] - nr, s[0] + nr, s[1] + nr]).concat([[hub[0] - hr, hub[1] - hr, hub[0] + hr, hub[1] + hr]]);
      sites.forEach((s, i) => {
        const f = focusIdx === i, dim = focusIdx >= 0 && !f ? 0.55 : 1;
        label(s[0], s[1], names[i], s[0] < hub[0], dim, f);
      });
      if (!compact) {
        const fs = 9.5 * dpr, d = 40 * dpr;
        const gx = hub[0] + hubLabelAt[0] * d, gy = hub[1] + hubLabelAt[1] * d;
        const gAlign = Math.abs(hubLabelAt[0]) < 0.3 ? 'center' : hubLabelAt[0] > 0 ? 'left' : 'right';
        place('PROJECT HUB', [
          { x: gx, y: gy, align: gAlign },
          { x: hub[0], y: hub[1] + d, align: 'center' },
          { x: hub[0], y: hub[1] - d, align: 'center' },
        ], `500 ${fs}px Manrope, system-ui, sans-serif`, `${(fs * 0.26).toFixed(1)}px`, rgba(INK3, 0.95));
      }
    }

    function frame(now) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      draw(now / 1000, dt);
      raf = requestAnimationFrame(frame);
    }
    const still = () => draw(7, 0);

    function update() {
      const should = wanted && visible && !document.hidden && !reduceMotion.matches;
      if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); }
      if (!running && wanted) still();
    }

    function resize() {
      if (layout()) {
        if (!running) still();
      }
    }

    layout();
    document.documentElement.classList.add('graph-ready');
    new ResizeObserver(resize).observe(canvas);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; update(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', update);
    reduceMotion.addEventListener('change', update);

    // The pointer nudges the points; the canvas itself stays click-through.
    host.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = canvas.getBoundingClientRect();
      mouse = [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr];
    });
    host.addEventListener('pointerleave', () => { mouse = null; });

    return {
      start() { wanted = true; requestAnimationFrame(resize); update(); },
      stop() { wanted = false; update(); },
      focus(i) { focusIdx = i; if (!running && wanted) still(); },
    };
  }
})();
