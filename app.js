const HUB_VERSION = '1.2.0';
const VALID_THEMES = new Set(['blue', 'green', 'orange', 'pink']);
const VALID_OPEN_MODES = new Set(['new', 'same']);

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
        showUpdateNotice(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotice(worker);
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

function showUpdateNotice(worker) {
  if (!worker || document.querySelector('.update-toast')) return;

  const notice = document.createElement('div');
  notice.className = 'update-toast';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');

  const text = document.createElement('span');
  text.textContent = 'A new Hub version is ready.';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'update-button';
  button.textContent = 'Update';
  button.addEventListener('click', () => {
    button.disabled = true;
    button.textContent = 'Updating…';
    worker.postMessage({ type: 'SKIP_WAITING' });
  });

  notice.append(text, button);
  document.body.appendChild(notice);
}

setupServiceWorker();

// Avatar fallback stays outside inline HTML so the CSP can remain strict.
const avatarImg = document.querySelector('.avatar');
if (avatarImg) {
  avatarImg.addEventListener('error', () => {
    avatarImg.src = 'https://ui-avatars.com/api/?name=Roberto+Macfie&background=0284c7&color=fff&size=192';
  }, { once: true });
}

const svgIcons = {
  health: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5v14"/></svg>`,
  council: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L13 14h-2l.25-4.07A4.002 4.002 0 0 1 12 2Z"/><circle cx="12" cy="18" r="2"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></svg>`,
  notes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 4 4-4 4"/></svg>`
};

function getIcon(name) {
  return Object.prototype.hasOwnProperty.call(svgIcons, name) ? svgIcons[name] : svgIcons.default;
}

function getTheme(theme) {
  return VALID_THEMES.has(theme) ? theme : 'blue';
}

function getOpenMode(mode) {
  return VALID_OPEN_MODES.has(mode) ? mode : 'new';
}

const container = document.getElementById('links-container');

function isSafeUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === 'https:') return true;

    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    return parsed.protocol === 'http:' && localHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

function showEmptyState(message) {
  if (!container) return;

  container.replaceChildren();
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = message;
  container.appendChild(p);
}

function domainLabel(value) {
  try {
    const url = new URL(value);
    return url.hostname + url.pathname.replace(/\/$/, '');
  } catch {
    return 'External app';
  }
}

function makeText(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function buildCard(item) {
  if (!item || typeof item !== 'object' || !item.url || !isSafeUrl(item.url)) return null;

  const card = document.createElement('a');
  const openMode = getOpenMode(item.open);
  card.href = new URL(item.url, window.location.href).href;
  card.className = `app-card card-${getTheme(item.theme)}`;

  if (openMode === 'new') {
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
  }

  const top = document.createElement('div');
  top.className = 'card-top';

  const iconWrapper = document.createElement('div');
  iconWrapper.className = 'card-icon';
  iconWrapper.setAttribute('aria-hidden', 'true');
  iconWrapper.innerHTML = getIcon(item.icon);

  const badges = document.createElement('div');
  badges.className = 'card-badges';
  badges.append(
    makeText('span', 'card-status', typeof item.status === 'string' && item.status.trim() ? item.status.trim() : 'Live'),
    makeText('span', 'card-mode', openMode === 'new' ? 'New tab' : 'Same tab')
  );
  top.append(iconWrapper, badges);

  const body = document.createElement('div');
  body.className = 'card-body';
  const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'App';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  body.append(
    makeText('span', 'card-category', typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'App'),
    makeText('strong', 'card-title', title),
    makeText('span', 'card-desc', description)
  );

  const footer = document.createElement('div');
  footer.className = 'card-footer';
  const launch = makeText('span', 'launch', '↗');
  launch.setAttribute('aria-hidden', 'true');
  footer.append(makeText('span', 'domain-pill', domainLabel(item.url)), launch);

  card.append(top, body, footer);
  card.setAttribute('aria-label', `${title}. ${description}${openMode === 'new' ? ' Opens in a new tab.' : ''}`);
  return card;
}

async function loadLinks() {
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

    if (rendered === 0) {
      showEmptyState('No applications published yet.');
      const count = document.getElementById('app-count');
      if (count) count.textContent = '0';
      return;
    }

    container.replaceChildren(fragment);
    const count = document.getElementById('app-count');
    if (count) count.textContent = String(rendered);
  } catch (error) {
    console.error('Data error:', error);
    showEmptyState('Applications will be available shortly.');
    const count = document.getElementById('app-count');
    if (count) count.textContent = '0';
  }
}


const HUB_URL = 'https://kl4ne.github.io/pwa-hub/';
let deferredInstallPrompt = null;

function setupInstallAction() {
  const button = document.getElementById('install-button');
  if (!button) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    button.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    button.hidden = true;
  });

  button.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch {}
    deferredInstallPrompt = null;
    button.hidden = true;
  });
}

function flashAction(button, message, normal) {
  const label = button?.querySelector('span:last-child');
  if (!label) return;
  label.textContent = message;
  window.setTimeout(() => { label.textContent = normal; }, 1600);
}

function setupShareActions() {
  const share = document.getElementById('share-button');
  const copy = document.getElementById('copy-button');

  share?.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: '@rmacfie • PWA Hub',
          text: 'Open my personal hub of PWAs and digital tools.',
          url: HUB_URL
        });
      } else {
        await navigator.clipboard.writeText(HUB_URL);
        flashAction(share, 'Link Copied', 'Share');
      }
    } catch (error) {
      console.warn('Share action failed:', error);
    }
  });

  copy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(HUB_URL);
      flashAction(copy, 'Copied', 'Copy Link');
    } catch (error) {
      console.warn('Copy action failed:', error);
    }
  });
}

function updateConnectionState() {
  const state = document.getElementById('connection-state');
  if (state) state.textContent = navigator.onLine ? 'Online' : 'Offline-ready';
}

window.addEventListener('online', updateConnectionState);
window.addEventListener('offline', updateConnectionState);
updateConnectionState();
setupInstallAction();
setupShareActions();

loadLinks();

// Kept in JS for troubleshooting without adding visible UI clutter.
window.__PWA_HUB_VERSION__ = HUB_VERSION;
