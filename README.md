# @rmacfie • PWA Hub — v1.4.1

A lightweight, installable Progressive Web App that serves as Roberto S. Macfie's personal launcher for PWAs and digital projects. It is designed for GitHub Pages and intentionally uses no framework, build system, database, or third-party JavaScript.

## v1.4.1 — MPDGI Hub Integration

Version 1.4.1 adds **MPDGI Hub** as the third launcher app at `https://hub.mpdgi.org/`, reuses its official icon as a local asset, updates Service Worker precaching, and corrects the QR fallback path introduced by the v1.4.0 folder reorganization. The approved compact visual design remains unchanged.

## v1.4.0 — Structured Repository

Version 1.4.0 keeps the approved compact launcher interface intact and reorganizes the repository for cleaner long-term maintenance.

### Root files

Only the core project entry and documentation files remain loose at the repository root:

- `index.html` — application entry page.
- `sw.js` — root Service Worker so its scope continues to cover the entire PWA.
- `manifest.json` — installable PWA manifest.
- `README.md` — repository documentation.
- `.nojekyll` — GitHub Pages configuration.

### Organized folders

```text
pwa-hub/
├── index.html
├── sw.js
├── manifest.json
├── README.md
├── .nojekyll
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   ├── config.json
│   ├── links.json
│   └── changelog.json
├── assets/
│   ├── profile/
│   │   └── avatar.jpg
│   ├── icons/
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192.png
│   │   └── icon-512.svg
│   ├── logos/
│   │   ├── glp1-icon.png
│   │   ├── ai-council-icon.png
│   │   └── mpdgi-hub-icon.svg
│   └── qr/
│       └── qr-hub.svg
└── .github/
    └── workflows/
        └── validate.yml
```

## Current features

- Compact mobile-first launcher.
- Real app logos.
- QR sharing plus Share and Copy actions.
- LIVE, BETA, COMING SOON, and MAINTENANCE states.
- App version and last-updated metadata.
- App-details dialogs.
- Coming-soon cards without a required destination URL.
- Changelog and About dialogs.
- Private on-device visit counter with no external analytics by default.
- Explicit app ordering.
- Configurable accent colors.
- Featured-app support.
- Offline caching and silent Service Worker updates.
- Accessibility and CSP hardening from v1.3.1.

## Adding another PWA

Add an object to `data/links.json` with a unique numeric `order`:

```json
{
  "order": 4,
  "title": "My New PWA",
  "description": "Short description",
  "details": "Longer optional description.",
  "url": "https://example.com/",
  "theme": "orange",
  "logo": "assets/logos/my-new-app.png",
  "open": "new",
  "status": "live",
  "category": "Utility",
  "version": "1.0.0",
  "updated": "2026-09-27",
  "featured": false
}
```

Supported themes: `blue`, `green`, `orange`, `pink`.

Supported statuses: `live`, `beta`, `coming-soon`, `maintenance`.

`open` may be `new` or `same`. Production launch URLs must use HTTPS. A `coming-soon` item may omit its URL.

## Deployment

Production:

`https://kl4ne.github.io/pwa-hub/`

GitHub Pages continues to publish directly from `main`. The Service Worker remains at the repository root intentionally so its scope covers the full PWA.
