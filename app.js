const HUB_VERSION = '1.2.0';
const HUB_URL = 'https://kl4ne.github.io/pwa-hub/';
const VALID_THEMES = new Set(['blue', 'green', 'orange', 'pink']);
const VALID_OPEN_MODES = new Set(['new', 'same']);
let deferredInstallPrompt = null;

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      registration.update().catch(() => {});
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

const avatar = document.querySelector('.avatar');
avatar?.addEventListener('error', () => {
  avatar.src = 'https://ui-avatars.com/api/?name=Roberto+Macfie&background=108a9d&color=fff&size=192';
}, { once: true });

const svgIcons = {
  health: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5v14"/></svg>`,
  council: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L13 14h-2l.25-4.07A4 4 0 0 1 12 2Z"/><circle cx="12" cy="18" r="2"/><path d="m4.93 19.07 2.83-2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></svg>`,
  notes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m10 8 4 4-4 4"/></svg>`
};

function getIcon(name) {
  return Object.prototype.hasOwnProperty.call(svgIcons, name) ? svgIcons[name] : svgIcons.default;
}

function getTheme(value) {
  return VALID_THEMES.has(value) ? value : 'blue';
}

function getOpenMode(value) {
  return VALID_OPEN_MODES.has(value) ? value : 'new';
}

function isSafeUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function makeText(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function buildCard(item) {
  if (!item || typeof item !== 'object' || !isSafeUrl(item.url)) return null;

  const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'App';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const openMode = getOpenMode(item.open);

  const card = document.createElement('a');
  card.className = `app-card card-${getTheme(item.theme)}`;
  card.href = new URL(item.url, window.location.href).href;

  if (openMode === 'new') {
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
  }

  const icon = document.createElement('div');
  icon.className = 'card-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = getIcon(item.icon);

  const content = document.createElement('div');
  content.className = 'card-content';
  content.append(
    makeText('strong', 'card-title', title),
    makeText('span', 'card-desc', description)
  );

  const arrow = makeText('span', 'card-arrow', '›');
  arrow.setAttribute('aria-hidden', 'true');

  card.append(icon, content, arrow);
  card.setAttribute('aria-label', `${title}. ${description}${openMode === 'new' ? ' Opens in a new tab.' : ''}`);
  return card;
}

async function loadLinks() {
  const container = document.getElementById('links-container');
  if (!container) return;

  try {
    const response = await fetch(`links.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load links (${response.status})`);

    const links = await response.json();
    if (!Array.isArray(links)) throw new Error('Invalid links.json format');

    const fragment = document.createDocumentFragment();
    let rendered = 0;

    for (const item of links) {
      const card = buildCard(item);
      if (!card) continue;
      fragment.appendChild(card);
      rendered += 1;
    }

    if (!rendered) {
      container.replaceChildren(makeText('p', 'empty-state', 'No applications published yet.'));
      return;
    }

    container.replaceChildren(fragment);
  } catch (error) {
    console.error('Data error:', error);
    container.replaceChildren(makeText('p', 'empty-state', 'Applications will be available shortly.'));
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

function showInstallHelp() {
  document.querySelector('.install-help')?.remove();

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const overlay = document.createElement('div');
  overlay.className = 'install-help';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Install PWA Hub');

  const panel = document.createElement('div');
  panel.className = 'install-help-panel';

  const title = makeText('strong', 'install-help-title', 'Install PWA Hub');
  const message = makeText(
    'p',
    'install-help-text',
    isIOS
      ? 'Tap the Share button in Safari, choose “Add to Home Screen”, then tap “Add”.'
      : 'Open your browser menu and choose “Install app” or “Add to Home screen”.'
  );

  const close = makeText('button', 'install-help-close', 'Got it');
  close.type = 'button';
  close.addEventListener('click', () => overlay.remove());

  panel.append(title, message, close);
  overlay.append(panel);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  close.focus();
}

function setupInstallButton() {
  const button = document.getElementById('install-button');
  if (!button) return;

  if (isStandalone()) {
    button.hidden = true;
    return;
  }

  button.hidden = false;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    button.hidden = true;
  });

  button.addEventListener('click', async () => {
    if (isStandalone()) {
      button.hidden = true;
      return;
    }

    if (!deferredInstallPrompt) {
      showInstallHelp();
      return;
    }

    try {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch (error) {
      console.warn('Install prompt failed:', error);
      showInstallHelp();
    } finally {
      deferredInstallPrompt = null;
    }
  });
}

function flashButton(button, message, normal) {
  const label = button?.querySelector('span:last-child');
  if (!label) return;
  label.textContent = message;
  window.setTimeout(() => { label.textContent = normal; }, 1500);
}

function setupActions() {
  const share = document.getElementById('share-button');
  const copy = document.getElementById('copy-button');

  share?.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: '@rmacfie • PWA Hub',
          text: 'My Progressive Web Apps • Ready to Use',
          url: HUB_URL
        });
      } else {
        await navigator.clipboard.writeText(HUB_URL);
        flashButton(share, 'Copied', 'Share');
      }
    } catch (error) {
      console.warn('Share action failed:', error);
    }
  });

  copy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(HUB_URL);
      flashButton(copy, 'Copied', 'Copy');
    } catch (error) {
      console.warn('Copy action failed:', error);
    }
  });
}

setupServiceWorker();
setupInstallButton();
setupActions();
loadLinks();

window.__PWA_HUB_VERSION__ = HUB_VERSION;
