/* ==========================================================================
   Project hub: behaviour
   - Builds the sidebar and homepage cards from projects.js
   - Routes with the address hash (#/ is home, #/movies opens a project)
   - Opens each site inside the hub in its own frame, kept loaded so
     switching back is instant and the site keeps its place
   - Draws the homepage globe
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
    const card = el('li', { class: `card${p.available ? '' : ' is-placeholder'}`, style: `--i:${i + 3}` }, [
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
      globe.stop();
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
      globe.start();
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

  /* ------------------------------------------------------------ globe */

  const globe = createGlobe($('[data-globe]'));

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
     Homepage globe: an orthographic line drawing on a 2D canvas, built
     from the Photography Globe's own coastlines, with a marker for every
     place in its gallery. Cheap to draw, and paused whenever it can't be
     seen (another view open, tab hidden, scrolled away, reduced motion).
     ================================================================== */

  function createGlobe(canvas) {
    const noop = { start() {}, stop() {} };
    if (!canvas || !canvas.getContext) return noop;
    const ctx = canvas.getContext('2d');
    if (!ctx) return noop;

    const RAD = Math.PI / 180;
    const TILT = 24 * RAD; // lean the north towards the viewer: most places are in Europe
    const SPEED = 4.5 * RAD; // radians per second
    let lambda = -10 * RAD; // start with Europe and Africa facing
    let size = 0;
    let dpr = 1;
    let running = false;
    let wanted = false;
    let visible = true;
    let raf = 0;
    let last = 0;

    // Unit-sphere points, precomputed once.
    const toXYZ = (lat, lng) => {
      const la = lat * RAD;
      const lo = lng * RAD;
      return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
    };

    let coast = [];
    let places = [];
    const graticule = [];

    for (let lng = -180; lng < 180; lng += 20) {
      const line = [];
      for (let lat = -90; lat <= 90; lat += 3) line.push(toXYZ(lat, lng));
      graticule.push(line);
    }
    for (let lat = -60; lat <= 60; lat += 20) {
      const line = [];
      for (let lng = -180; lng <= 180; lng += 3) line.push(toXYZ(lat, lng));
      graticule.push(line);
    }

    function loadData() {
      const data = window.HUB_GLOBE;
      if (!data) return;
      try {
        const bin = Uint8Array.from(atob(data.coast), (c) => c.charCodeAt(0));
        const view = new DataView(bin.buffer);
        const count = view.getUint32(0, true);
        let offset = 4 + count * 4;
        for (let i = 0; i < count; i++) {
          const len = view.getUint32(4 + i * 4, true);
          const line = new Array(len);
          for (let j = 0; j < len; j++) {
            const lng = view.getInt16(offset, true) / 100;
            const lat = view.getInt16(offset + 2, true) / 100;
            offset += 4;
            line[j] = toXYZ(lat, lng);
          }
          coast.push(line);
        }
      } catch {
        coast = [];
      }
      places = (data.places || []).map((p) => toXYZ(p.lat, p.lng));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.round(rect.width);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      draw();
    }

    // Rotate around the vertical axis, then tilt. Returns [x, y, depth].
    function project(p, sinL, cosL, sinT, cosT) {
      const x = p[0] * cosL + p[2] * sinL;
      const z1 = -p[0] * sinL + p[2] * cosL;
      const y = p[1] * cosT - z1 * sinT;
      const z = p[1] * sinT + z1 * cosT;
      return [x, y, z];
    }

    function strokeLines(lines, r, cx, cy, trig) {
      ctx.beginPath();
      for (const line of lines) {
        let pen = false;
        for (const pt of line) {
          const [x, y, z] = project(pt, ...trig);
          if (z < 0) {
            pen = false;
            continue;
          }
          const px = cx + x * r;
          const py = cy - y * r;
          if (pen) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
          pen = true;
        }
      }
      ctx.stroke();
    }

    function draw() {
      if (!size) return;
      const w = canvas.width;
      const h = canvas.height;
      const r = w * 0.42;
      const cx = w / 2;
      const cy = h / 2;
      const trig = [Math.sin(lambda), Math.cos(lambda), Math.sin(TILT), Math.cos(TILT)];

      ctx.clearRect(0, 0, w, h);

      // Body of the sphere: lit from the upper left, like the photo globe.
      const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      body.addColorStop(0, 'rgba(38, 92, 170, 0.26)');
      body.addColorStop(0.7, 'rgba(10, 24, 52, 0.42)');
      body.addColorStop(1, 'rgba(4, 7, 13, 0.6)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = 'rgba(92, 178, 255, 0.09)';
      strokeLines(graticule, r, cx, cy, trig);

      ctx.lineWidth = 1.1 * dpr;
      ctx.strokeStyle = 'rgba(200, 222, 250, 0.42)';
      strokeLines(coast, r, cx, cy, trig);

      // Rim
      const rim = ctx.createRadialGradient(cx, cy, r * 0.94, cx, cy, r * 1.08);
      rim.addColorStop(0, 'rgba(92, 178, 255, 0)');
      rim.addColorStop(0.45, 'rgba(92, 178, 255, 0.16)');
      rim.addColorStop(1, 'rgba(92, 178, 255, 0)');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = 'rgba(92, 178, 255, 0.28)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Gallery places
      for (const pt of places) {
        const [x, y, z] = project(pt, ...trig);
        if (z < 0.05) continue;
        const px = cx + x * r;
        const py = cy - y * r;
        const fade = Math.min(1, (z - 0.05) * 3);
        ctx.fillStyle = `rgba(92, 178, 255, ${0.16 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, 7 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(170, 214, 255, ${0.95 * fade})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function frame(t) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      lambda += SPEED * dt;
      draw();
      raf = requestAnimationFrame(frame);
    }

    function update() {
      const should = wanted && visible && !document.hidden && !reduceMotion.matches;
      if (should && !running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    }

    loadData();
    resize();
    document.documentElement.classList.add('globe-ready');

    new ResizeObserver(resize).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        update();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', update);
    reduceMotion.addEventListener('change', () => {
      update();
      draw();
    });

    return {
      start() {
        wanted = true;
        requestAnimationFrame(resize);
        update();
      },
      stop() {
        wanted = false;
        update();
      },
    };
  }
})();
