# @rmacfie • PWA Hub — v1.1.0

A lightweight, installable Progressive Web App that acts as a personal launchpad for Roberto S. Macfie's PWAs and future web projects. It is designed for GitHub Pages and intentionally avoids frameworks, build tooling, databases, and third-party JavaScript dependencies.

## Files

- `index.html` — main markup, PWA metadata, CSP, Open Graph and Twitter metadata.
- `style.css` — responsive mobile-first styling, keyboard focus states and reduced-motion support.
- `app.js` — Service Worker registration, update prompt, avatar fallback, validation, and link rendering.
- `links.json` — editable list of published PWAs.
- `manifest.json` — installable PWA manifest.
- `sw.js` — offline caching and update strategy.
- `avatar.jpg` — profile image.
- `apple-touch-icon.png` — dedicated 180×180 iOS home-screen icon.
- `icon-192.png` — standard 192×192 PWA icon.
- `icon-512.svg` — scalable adaptive 512-class PWA icon.

## Adding another PWA

Edit `links.json` and add another object:

```json
{
  "title": "My New PWA",
  "description": "Short description",
  "url": "https://example.com/",
  "theme": "orange",
  "icon": "code",
  "open": "new"
}
```

Supported themes: `blue`, `green`, `orange`, `pink`.

Supported icons: `health`, `council`, `code`, `chart`, `notes`. Any unknown icon automatically falls back to the generic app icon.

`open` may be `new` (default) or `same`.

Production links must use HTTPS. Plain HTTP is accepted only for localhost development.

## v1.1.0 changes

- Fixed stale/offline `links.json`: successful network responses now refresh the stable cached copy.
- Reworked Service Worker caching:
  - network-first for page navigation;
  - network-first for `links.json`;
  - stale-while-revalidate for local CSS/JS;
  - cache-first for local images and manifest.
- Critical shell files must now cache successfully before Service Worker installation completes.
- Optional image/data failures no longer break installation.
- Added a visible update prompt when a newer Service Worker is ready.
- Added automatic reload after the user accepts an update.
- Cache cleanup is scoped to this Hub only, so unrelated caches on the same origin are not deleted.
- Service Worker ignores third-party requests.
- Added theme allow-list validation.
- Added URL protocol validation: HTTPS in production, HTTP only on localhost.
- Added safe handling when all configured links are invalid.
- Added `open: "new" | "same"` per-link behavior.
- Added keyboard `:focus-visible` styles.
- Added `prefers-reduced-motion` support.
- Removed forced portrait orientation from the manifest.
- Added dedicated 180×180 Apple touch icon.
- Added Open Graph/Twitter sharing metadata.
- Added canonical URL, application name and no-referrer metadata.
- Added more reusable icons for future personal PWAs.

## Deployment

Upload the files to the root of the GitHub Pages repository used by the Hub. Because asset paths are relative, the project works correctly when hosted from a repository subpath such as:

`https://kl4ne.github.io/pwa-hub/`

After deploying a new version, existing users may see an **Update** notice. Tapping it activates the new Service Worker and reloads the Hub.
