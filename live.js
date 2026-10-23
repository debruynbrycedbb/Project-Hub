/* ==========================================================================
   Project hub: live previews
   Replaces a card's illustration with the viewer's own data, when this
   browser has some. Everyone else keeps seeing the illustration.

   READ-ONLY. The hub never writes to Ledgerline's or CineVault's data.
   It can read it because the hub and both sites share the same address
   (debruynbrycedbb.github.io), and so the same browser storage.

     ledgerline  Reads Ledgerline's saved book and price cache, and works out
                 the numbers with Ledgerline's own portfolio.js, so they match
                 the app exactly. Ledgerline is quietly opened in the
                 background so its prices refresh; the card updates as they do.
     cinevault   Uses this browser's CineVault sign-in, the same way a second
                 CineVault tab would, to fetch your three highest-rated films.
                 It never creates a sign-in: if you're not signed in to
                 CineVault in this browser, nothing happens.

   If anything fails (signed out, no data, a site changed), the card simply
   keeps its illustration.
   ========================================================================== */

(function () {
  'use strict';

  const isNum = (v) => typeof v === 'number' && isFinite(v);

  function readJSON(key, fallback) {
    try {
      const s = localStorage.getItem(key);
      return s == null ? fallback : JSON.parse(s);
    } catch {
      return fallback;
    }
  }

  const loaded = new Map();
  function loadScript(src) {
    if (!loaded.has(src)) {
      loaded.set(
        src,
        new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.onload = resolve;
          s.onerror = () => reject(new Error('Could not load ' + src));
          document.head.append(s);
        }),
      );
    }
    return loaded.get(src);
  }

  function h(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function relTime(t) {
    if (!isNum(t)) return '';
    const mins = Math.round((Date.now() - t) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  /* ==================================================================
     Ledgerline
     ================================================================== */

  const PT_KEYS = {
    transactions: 'pt:v1:book:transactions',
    settings: 'pt:v1:book:settings',
    overrides: 'pt:v1:book:overrides',
    cash: 'pt:v1:book:cash',
    quotes: 'pt:v1:market:quotes',
    fx: 'pt:v1:market:fx',
    snapshots: 'pt:v1:market:snapshots',
  };
  const FALLBACK_USD_EUR = 0.87; // same fallback Ledgerline uses before it has fetched a rate
  const CLASS_COLOURS = { stock: '#3987e5', etf: '#c98500', crypto: '#7c3aed', memecoin: '#d55181', cash: '#737883' };
  const CLASS_NAMES = { stock: 'Stocks', etf: 'ETFs', crypto: 'Crypto', memecoin: 'Memecoins', cash: 'Cash' };

  function hasLedgerData() {
    const txs = readJSON(PT_KEYS.transactions, null);
    return Array.isArray(txs) && txs.length > 0;
  }

  function ledgerSummary() {
    const P = window.PT && window.PT.portfolio;
    if (!P || !P.derive || !P.summarise) throw new Error('portfolio.js not available');

    const txs = readJSON(PT_KEYS.transactions, []);
    const settings = Object.assign({ baseCurrency: 'USD' }, readJSON(PT_KEYS.settings, {}));
    const overrides = readJSON(PT_KEYS.overrides, {});
    const quotes = readJSON(PT_KEYS.quotes, {});
    const fx = readJSON(PT_KEYS.fx, null);
    const usdToEur = fx && isNum(fx.usdToEur) ? fx.usdToEur : FALLBACK_USD_EUR;
    const rates = { EUR: 1 / usdToEur };

    let newest = 0;
    const derived = P.derive(txs, rates);
    // Same rule as Ledgerline's market.quoteFor: a manual price wins, else the last good quote.
    const summary = P.summarise(derived, (pos) => {
      const ov = overrides[pos.key];
      if (ov && isNum(ov.price)) return { price: ov.price, change24h: null };
      const q = quotes[pos.key];
      if (!q || !q.lastGood || !isNum(q.lastGood.price)) return null;
      if (q.lastGood.at > newest) newest = q.lastGood.at;
      return { price: q.lastGood.price, change24h: q.lastGood.change24h };
    });
    const cash = P.cash ? P.cash(readJSON(PT_KEYS.cash, [])).balance : 0;
    const snaps = readJSON(PT_KEYS.snapshots, []).filter((s) => isNum(s.t) && isNum(s.v));

    const base = settings.baseCurrency === 'EUR' ? 'EUR' : 'USD';
    const toBase = (usd) => (base === 'EUR' ? usd * usdToEur : usd);
    return { summary, cash, snaps, newest, base, toBase };
  }

  function money(v, base, compact) {
    const opts = { style: 'currency', currency: base, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2, minimumFractionDigits: 2 };
    if (compact && Math.abs(v) >= 100000) Object.assign(opts, { notation: 'compact', maximumFractionDigits: 1, minimumFractionDigits: 0 });
    return new Intl.NumberFormat(undefined, opts).format(v);
  }

  function sparkline(points, up) {
    const W = 300;
    const H = 64;
    const xs = points.map((p) => p.t);
    const ys = points.map((p) => p.v);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const sx = (t) => ((t - x0) / (x1 - x0 || 1)) * W;
    const sy = (v) => H - 4 - ((v - y0) / (y1 - y0 || 1)) * (H - 10);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.t).toFixed(1)} ${sy(p.v).toFixed(1)}`).join(' ');
    const colour = up ? '#3ddc97' : '#ff6b61';
    const id = 'lg' + Math.random().toString(36).slice(2, 8);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'lv-spark');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colour}" stop-opacity=".28"/><stop offset="1" stop-color="${colour}" stop-opacity="0"/></linearGradient></defs>` +
      `<path d="${line} L${W} ${H} L0 ${H} Z" fill="url(#${id})" stroke="none"/>` +
      `<path d="${line}" fill="none" stroke="${colour}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
    return svg;
  }

  function renderLedger(mount, data) {
    const { summary: s, cash, snaps, newest, base, toBase } = data;
    if (!s || s.value == null) return false;

    const panel = h('div', 'lv lv--ledger');
    const top = h('div', 'lv-top');
    const figure = h('div', 'lv-figure');
    figure.append(h('span', 'lv-label', 'Portfolio value'));
    figure.append(h('span', 'lv-value', money(toBase(s.value), base, true)));
    top.append(figure);
    if (s.pl != null) {
      const up = s.pl >= 0;
      const pill = h('span', `lv-pl ${up ? 'is-up' : 'is-down'}`, `${up ? '▲ +' : '▼ −'}${money(Math.abs(toBase(s.pl)), base, true)}`);
      if (isNum(s.plPct)) pill.append(h('span', 'lv-pct', ` (${up ? '+' : '−'}${Math.abs(s.plPct).toFixed(2)}%)`));
      top.append(pill);
    }
    panel.append(top);

    // Value history: the last 30 days of snapshots Ledgerline recorded.
    const since = Date.now() - 30 * 86400000;
    const recent = snaps.filter((p) => p.t >= since);
    if (recent.length >= 3) {
      panel.append(sparkline(recent, recent[recent.length - 1].v >= recent[0].v));
    } else {
      panel.append(h('div', 'lv-spacer'));
    }

    // Allocation by asset class, plus cash, as one bar.
    const parts = ['stock', 'etf', 'crypto', 'memecoin']
      .map((t) => ({ t, v: s.byClass && s.byClass[t] ? s.byClass[t].value : 0 }))
      .concat(cash > 0.005 ? [{ t: 'cash', v: cash }] : [])
      .filter((p) => p.v > 0);
    const total = parts.reduce((a, p) => a + p.v, 0);
    if (total > 0) {
      const bar = h('div', 'lv-bar');
      bar.setAttribute('role', 'img');
      bar.setAttribute(
        'aria-label',
        'Allocation: ' + parts.map((p) => `${CLASS_NAMES[p.t]} ${Math.round((p.v / total) * 100)}%`).join(', '),
      );
      parts.forEach((p) => {
        const seg = h('span');
        seg.style.flexGrow = String(p.v / total);
        seg.style.background = CLASS_COLOURS[p.t];
        bar.append(seg);
      });
      panel.append(bar);

      const legend = h('ul', 'lv-legend');
      legend.setAttribute('aria-hidden', 'true');
      parts.forEach((p) => {
        const li = h('li');
        const sw = h('i');
        sw.style.background = CLASS_COLOURS[p.t];
        li.append(sw, `${CLASS_NAMES[p.t]} ${Math.round((p.v / total) * 100)}%`);
        legend.append(li);
      });
      panel.append(legend);
    }

    const foot = h('p', 'lv-foot');
    foot.textContent = s.partial
      ? `${s.pricedCount} of ${s.openCount} holdings priced`
      : newest
        ? `Prices ${relTime(newest)}`
        : 'Manual prices';
    panel.append(foot);

    mount.replaceChildren(panel);
    mount.classList.add('is-live');
    return true;
  }

  async function ledgerline(project, mount, hooks) {
    if (!hasLedgerData()) return;
    window.PT = window.PT || {};
    window.PT.util = window.PT.util || { isNum };
    await loadScript(new URL('js/portfolio.js', project.url).href);

    const render = () => {
      try {
        renderLedger(mount, ledgerSummary());
      } catch (e) {
        console.warn('[hub] Ledgerline preview unavailable:', e);
      }
    };
    render();

    // Ledgerline writes fresh prices to storage while it runs; follow along.
    let timer = 0;
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.indexOf('pt:v1:') !== 0) return;
      clearTimeout(timer);
      timer = setTimeout(render, 250);
    });
    // Keep "Prices 3 min ago" honest while the page sits open.
    setInterval(render, 60000);

    // Open Ledgerline in the background so its prices refresh (it also makes opening it instant).
    if (hooks && hooks.prewarm) hooks.prewarm();
  }

  /* ==================================================================
     CineVault
     ================================================================== */

  const CV_AUTH_KEY = 'cinevault.auth';
  const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  function slugify(title) {
    return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Same order CineVault uses: your override, your own image file, then TMDB.
  function posterCandidates(title, siteUrl) {
    const abs = (u) => {
      try {
        return new URL(u, siteUrl).href;
      } catch {
        return null;
      }
    };
    const list = [];
    const override = readJSON('cinevault.posterOverrides.v1', {})[title.id];
    if (override) list.push(abs(override));
    const known = readJSON('cinevault.localPosters.v1', {})[title.id];
    if (known) list.push(abs(known));
    else ['jpg', 'jpeg', 'png', 'webp'].forEach((ext) => list.push(abs(`images/${slugify(title.title)}.${ext}`)));
    if (title.poster_path) list.push('https://image.tmdb.org/t/p/w342' + title.poster_path);
    return [...new Set(list.filter(Boolean))];
  }

  function posterImg(title, siteUrl) {
    const list = posterCandidates(title, siteUrl);
    const img = h('img');
    img.alt = '';
    img.decoding = 'async';
    let i = 0;
    img.onerror = () => {
      i += 1;
      if (i < list.length) img.src = list[i];
      else img.replaceWith(h('span', 'lv-poster-fallback', title.title));
    };
    img.onload = () => img.classList.add('is-loaded');
    if (list.length) img.src = list[0];
    return img;
  }

  async function cinevault(project, mount) {
    let stored = null;
    try {
      stored = localStorage.getItem(CV_AUTH_KEY);
    } catch {
      return;
    }
    if (!stored) return; // not signed in to CineVault in this browser

    await loadScript(SUPABASE_JS);
    await loadScript(new URL('config.js', project.url).href);
    // CineVault's config.js declares `const SITE` globally; read it rather than copying its keys here.
    // eslint-disable-next-line no-undef
    const site = typeof SITE !== 'undefined' ? SITE : null;
    if (!site || !window.supabase) return;

    const client = window.supabase.createClient(site.supabaseUrl, site.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: CV_AUTH_KEY },
    });
    const { data: sess } = await client.auth.getSession();
    if (!sess || !sess.session) return;

    const me = await client.rpc('me');
    const member = me.data && me.data[0];
    if (!member) return; // this browser's session isn't linked to a member

    const res = await client
      .from('user_titles')
      .select('rating, rated_at, t:titles!inner(id, kind, title, year, poster_path)')
      .eq('user_id', member.id)
      .eq('t.kind', 'movie')
      .not('rating', 'is', null)
      .order('rating', { ascending: false })
      .order('rated_at', { ascending: true })
      .limit(3);
    if (res.error || !res.data || !res.data.length) return;

    const panel = h('div', 'lv lv--cine');
    const row = h('ol', 'lv-posters');
    res.data.forEach((r) => {
      const li = h('li', 'lv-poster');
      const frame = h('span', 'lv-poster-img');
      frame.append(posterImg(r.t, project.url));
      li.append(frame);
      const score = h('span', 'lv-score', Number(r.rating).toFixed(1));
      li.append(score);
      li.append(h('span', 'visually-hidden', `${r.t.title}${r.t.year ? ` (${r.t.year})` : ''}, rated ${Number(r.rating).toFixed(1)} out of 10`));
      li.title = `${r.t.title}${r.t.year ? ` (${r.t.year})` : ''}`;
      row.append(li);
    });
    panel.append(row);
    const caption = h('p', 'lv-caption');
    caption.append(
      h('span', 'lv-caption-long', `${member.username}’s top ${res.data.length === 1 ? 'film' : `${res.data.length} films`}`),
      h('span', 'lv-caption-short', 'Top rated'),
    );
    caption.lastChild.setAttribute('aria-hidden', 'true');
    panel.append(caption);

    mount.replaceChildren(panel);
    mount.classList.add('is-live');
  }

  window.HubLive = {
    ledgerline: (p, mount, hooks) => ledgerline(p, mount, hooks).catch((e) => console.warn('[hub] Ledgerline preview unavailable:', e)),
    cinevault: (p, mount) => cinevault(p, mount).catch((e) => console.warn('[hub] CineVault preview unavailable:', e)),
  };
})();
