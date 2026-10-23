/* ==========================================================================
   Project hub: the one file to edit.

   Add, remove or reorder projects here. The sidebar, the homepage cards and
   the in-hub viewer are all built from this list, so you never need to touch
   the HTML to change a project.

   Fields
     id          Short unique name, used in the address bar (#/movies).
     name        Shown in the sidebar and on the card.
     category    One short line under the name.
     description One or two sentences for the homepage card.
     url         The live address of the site. Must end with a slash.
     preview     Image for the card (any .jpg, .png, .webp or .svg in assets/previews/).
     previewAlt  Describes the image for screen readers. Leave '' if purely decorative.
     facts       Up to three short label/value pairs shown on the card.
     order       Lower numbers come first.
     status      Optional. 'placeholder' shows "Address not set" and disables opening.
     embed       true opens the site inside the hub; false always opens a new tab.
   ========================================================================== */

window.HUB_CONFIG = {
  hub: {
    title: 'Project hub',
    owner: 'Bryce de Bruyn',
    headline: 'Everything I build, in one place',
    intro: 'A photography portfolio, a movie tracker and a portfolio tracker. Pick one to open it here, or in its own tab.',
  },

  projects: [
    {
      id: 'photography',
      name: 'Photography Globe',
      category: 'Photography portfolio',
      description:
        'Spin an interactive 3D Earth, pick a location and fly down into its gallery.',
      // From the CNAME file in the Photography-Globe- repository.
      url: 'https://bdbphotography.site/',
      preview: 'assets/previews/photography.jpg',
      previewAlt: 'Snow-covered peaks under a blue sky in the French Alps',
      facts: [
        { label: 'Locations', value: '16' },
        { label: 'Built with', value: 'Astro, Three.js' },
      ],
      order: 1,
      embed: true,
    },
    {
      id: 'movies',
      name: 'CineVault',
      category: 'Movie and series tracker',
      description:
        'Rate films and series, log when you watched them, and compare tastes with friends and family.',
      // Standard GitHub Pages address for the Movies-and-Series-Site repository.
      // Confirm it matches Settings → Pages in that repository.
      url: 'https://debruynbrycedbb.github.io/Movies-and-Series-Site/',
      preview: 'assets/previews/movies.svg',
      previewAlt: '',
      facts: [
        { label: 'Sign in', value: 'Name and PIN' },
        { label: 'Built with', value: 'Supabase, TMDB' },
      ],
      order: 2,
      embed: true,
    },
    {
      id: 'portfolio',
      name: 'Ledgerline',
      category: 'Portfolio tracker',
      description:
        'Track stocks, ETFs, crypto and memecoins with prices that refresh on their own.',
      // Standard GitHub Pages address for the Portfolio-Tracker- repository.
      // Confirm it matches Settings → Pages in that repository.
      url: 'https://debruynbrycedbb.github.io/Portfolio-Tracker-/',
      preview: 'assets/previews/portfolio.svg',
      previewAlt: '',
      facts: [
        { label: 'Your data', value: 'Stays in your browser' },
        { label: 'Built with', value: 'HTML, CSS, JS' },
      ],
      order: 3,
      embed: true,
    },
  ],
};
