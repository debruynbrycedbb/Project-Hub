# Project hub

One page that brings together three sites:

| Site | What it is | Address used |
| --- | --- | --- |
| Photography Globe | Photography portfolio on a 3D globe | `https://bdbphotography.site/` |
| CineVault | Movie and series tracker | `https://debruynbrycedbb.github.io/Movies-and-Series-Site/` |
| Ledgerline | Portfolio tracker | `https://debruynbrycedbb.github.io/Portfolio-Tracker-/` |

A sidebar lists the three sites. Clicking one opens it **inside the hub**, with a slim bar to go
back, reload, or open the site in its own tab. The homepage has a short card for each site.

Plain HTML, CSS and JavaScript. No build step, no npm, no accounts, nothing to pay for.

---

## It does not touch your other sites

- The hub lives in its **own repository**. Nothing was changed in the three site repositories.
- The hub only *links to* the sites (and shows them in a frame). It never reads their code or data.
- The hub saves **nothing** in the browser (no localStorage, no cookies, no service worker), so it
  can't clash with the data your sites keep.
- To scrap the hub, delete its repository. The three sites carry on exactly as before.

Bonus of being on the same `debruynbrycedbb.github.io` address as CineVault and Ledgerline: when
they open inside the hub they see the same saved data and sign-in as when you visit them directly.

---

## Live previews on the cards

On **your own devices**, two cards show your real data instead of the preview image:

- **CineVault:** your three highest-rated films with their posters, when you're signed in to
  CineVault in that browser.
- **Ledgerline:** your portfolio value, P&L, the last 30 days of value and your allocation, from
  Ledgerline's data in that browser. Ledgerline is quietly opened in the background so its prices
  refresh, and the card updates as they arrive.

How it works and what it means for privacy:

- The hub reads this data **only from the browser it's open in** (it shares the
  `debruynbrycedbb.github.io` address with both sites). Nothing is uploaded and nothing is added to the
  repository, so other visitors just see the preview images.
- It is **read-only**: the hub never changes your lists or your portfolio. CineVault is reached
  with your existing sign-in, exactly like a second CineVault tab; the hub never signs anyone in.
- Anyone using **your** browser will see these figures on the hub, the same as if they opened
  Ledgerline or CineVault there.
- To turn a live card off, delete its `live:` line in `projects.js`.
- If a site changes how it stores data, its card simply falls back to the preview image.

---

## Put it online (GitHub Pages, about 5 minutes)

1. On GitHub, create a new **public** repository, for example `Project-Hub`.
2. Upload everything in this folder to the root of the repository, including the hidden
   `.nojekyll` file. (On the GitHub website: **Add file → Upload files**, drag the folder's
   contents in, then **Commit changes**.)
3. Open the repository's **Settings → Pages**. Under *Build and deployment* choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, and press **Save**.
4. After a minute or two the hub is live at
   `https://debruynbrycedbb.github.io/Project-Hub/`
   (the last part is whatever you named the repository).

You can also double-click `index.html` to try it on your computer first.

---

## Check two addresses first

The Photography Globe address comes from the `CNAME` file in its repository. The other two are the
**standard** GitHub Pages addresses for those repositories, which I couldn't open from here to
confirm. Open each repository's **Settings → Pages**, copy the address shown at the top, and make
sure it matches the `url` in `projects.js`.

There are also older copies of both trackers in your GitHub (`Public-Movie-and-Series-Tracker`,
`Portfolio-Tracker`, `Portfolio-Tracker-Live`, `Port-Tracker-FINAL`). The hub points at the newest
ones: `Movies-and-Series-Site` and `Portfolio-Tracker-` (the version with the app icon). Change the
`url` if you meant a different one.

---

## Editing projects

Everything about the projects is in **`projects.js`**. Change a name, description, address or the
facts on a card there and the sidebar, homepage and viewer all update. The file explains each field
at the top.

- **Add a project:** copy one `{ ... }` block, give it a new `id`, and fill it in.
- **Reorder:** change the `order` numbers.
- **Not online yet:** set `status: 'placeholder'`. The card shows "Address not set" and can't be opened.
- **Always open in a new tab:** set `embed: false` (useful if a site ever stops working inside the hub).
- **Preview images:** put an image in `assets/previews/` and point `preview` at it. A screenshot
  of each site at 1200 × 750 would work well.

---

## How it works

| File | Job |
| --- | --- |
| `index.html` | Page structure |
| `styles.css` | All styling, same design language as the Photography Globe in blue |
| `app.js` | Builds the sidebar and cards, switches views, draws the homepage globe |
| `projects.js` | The list of projects (the only file you normally edit) |
| `live.js` | The live previews on the CineVault and Ledgerline cards |
| `assets/globe-data.js` | Coastlines and photo locations copied from the Photography Globe, for the homepage globe |
| `assets/previews/` | Card images: one of your French Alps photos, and two drawn illustrations |
| `assets/fonts/` | Archivo, Manrope and JetBrains Mono, the same fonts as the globe (free licences included) |

- **Addresses:** the hub uses `#/` for home and `#/photography`, `#/movies`, `#/portfolio` for each
  site, so the browser's back button works and you can bookmark a site inside the hub.
- **Switching is instant:** once a site has opened it stays loaded in the background, so going back
  to it keeps your place.
- **The homepage globe** is a light 2D drawing, not 3D. It stops whenever it can't be seen, and stays
  still if your device is set to reduce motion. The dots are your gallery locations.

---

## What was tested, and what wasn't

Tested in Chromium at desktop, laptop, tablet and phone sizes: layout, sidebar and phone menu,
keyboard navigation, reduced motion, back button, direct links, and opening Ledgerline inside the hub
(from a local copy).

Not tested, because this machine can't reach the live sites: loading the three **live** addresses
inside the hub, and Safari and Firefox. If a site doesn't appear inside the hub after deploying,
the bar at the top always has **Open in a new tab**, and you can set `embed: false` for that site.

One thing to know on phones: a site shown inside the hub has a little less room than when opened on
its own, because the hub's top bar stays visible. The ↗ button opens it full screen.
