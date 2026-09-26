# @rmacfie • PWA Hub — v1.3.1

A lightweight, installable Progressive Web App that serves as Roberto S. Macfie's personal launcher for PWAs and digital projects. It is designed for GitHub Pages and intentionally uses no framework, build system, database, or third-party JavaScript.

## v1.3.1 — Audit Hardening

This release keeps the approved compact mobile-launcher design while strengthening accessibility, security, offline behavior, and maintainability.

- Improved small-text and control contrast.
- Added visible keyboard focus states to launch cards and controls.
- Dialogs now trap keyboard focus, close with Escape, make the background inert, and restore focus to the control that opened them.
- Service Worker registration starts immediately and checks updates with `updateViaCache: "none"`.
- Local images and the manifest now use stale-while-revalidate, allowing changed logos and icons to refresh without waiting for a cache-version bump.
- Active code is consolidated into `style.css` and `app.js`; the old `v13.css` / `app-v13.js` split was removed.
- Content Security Policy now explicitly restricts connections, workers, and object content.
- Manifest and browser theme colors are synchronized.
- GitHub Actions validates version synchronization, required files, CSP directives, app metadata, URL safety, and JSON structure.

## Current features

- Real app logos.
- QR sharing plus Share and Copy actions.
- LIVE, BETA, COMING SOON, and MAINTENANCE states.
- App version and last-updated metadata.
- App-details dialogs.
- Coming-soon cards without a required destination URL.
- Compact changelog and About dialogs.
- Private on-device visit counter with no external analytics by default.
- Explicit app ordering through `order`.
- Configurable accent colors.
- Featured-app support.
- Offline caching and silent Service Worker updates.

## Files

- `index.html` — markup, PWA metadata, CSP, Open Graph, and Twitter metadata.
- `style.css` — complete responsive visual system and accessibility states.
- `app.js` — Hub rendering, dialogs, actions, configuration, and Service Worker registration.
- `links.json` — published app catalog.
- `config.json` — Hub-level configuration.
- `changelog.json` — release history shown in the Hub.
- `manifest.json` — installable PWA manifest.
- `sw.js` — offline caching and update strategy.
- `assets/` — local application logos.
- `.github/workflows/validate.yml` — automated integrity checks.

## Adding another PWA

Add an object to `links.json` with a unique numeric `order`:

```json
{
  "order": 3,
  "title": "My New PWA",
  "description": "Short description",
  "details": "Longer optional description.",
  "url": "https://example.com/",
  "theme": "orange",
  "logo": "assets/my-new-app.png",
  "open": "new",
  "status": "live",
  "category": "Utility",
  "version": "1.0.0",
  "updated": "2026-09-26",
  "featured": false
}
```

Supported themes: `blue`, `green`, `orange`, `pink`.

Supported statuses: `live`, `beta`, `coming-soon`, `maintenance`.

`open` may be `new` or `same`. Production launch URLs must use HTTPS. A `coming-soon` item may omit its URL.

## Deployment

The production Hub is published from this repository through GitHub Pages:

`https://kl4ne.github.io/pwa-hub/`

The Service Worker uses versioned Hub-owned caches and automatically removes older Hub cache generations during activation.
