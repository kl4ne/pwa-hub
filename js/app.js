const HUB_VERSION = '1.4.0';
const DEFAULT_HUB_URL = 'https://kl4ne.github.io/pwa-hub/';
const VALID_THEMES = new Set(['blue','green','orange','pink']);
const VALID_STATUS = new Set(['live','beta','coming-soon','maintenance']);
let deferredInstallPrompt = null;
let activeModal = null;
let modalReturnFocus = null;
let modalKeyHandler = null;

let hubConfig = {
  version:HUB_VERSION,
  accent:'#42d7ff',
  accentSecondary:'#2dd4bf',
  hubUrl:DEFAULT_HUB_URL,
  qrImage:'assets/qr/qr-hub.svg',
  localPrivateVisits:true,
  analyticsEndpoint:'',
  showStatus:true,
  showVersion:true,
  showUpdated:true
};

let changelogData = [];

function textEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function safeHex(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d);
}

function getStatus(value) {
  return VALID_STATUS.has(value) ? value : 'live';
}

function statusLabel(value) {
  return {
    'live':'LIVE',
    'beta':'BETA',
    'coming-soon':'COMING SOON',
    'maintenance':'MAINTENANCE'
  }[getStatus(value)];
}

function isSafeUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function safeAssetUrl(value, fallback) {
  try {
    const url = new URL(value || fallback, window.location.href);
    return url.origin === window.location.origin ? url.href : fallback;
  } catch {
    return fallback;
  }
}

function getHubUrl() {
  return isSafeUrl(hubConfig.hubUrl)
    ? new URL(hubConfig.hubUrl, window.location.href).href
    : DEFAULT_HUB_URL;
}

async function fetchJson(path, fallback) {
  try {
    const response = await fetch(path + '?v=' + Date.now(), {cache:'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.warn('Unable to load ' + path, error);
    return fallback;
  }
}

async function loadConfig() {
  const data = await fetchJson('data/config.json', hubConfig);
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    hubConfig = Object.assign({}, hubConfig, data);
  }
  document.documentElement.style.setProperty('--hub-accent', safeHex(hubConfig.accent,'#42d7ff'));
  document.documentElement.style.setProperty('--hub-accent-2', safeHex(hubConfig.accentSecondary,'#2dd4bf'));
}

async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  try {
    const registration = await navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'});

    if (registration.waiting) {
      registration.waiting.postMessage({type:'SKIP_WAITING'});
    }

    registration.addEventListener('updatefound', function() {
      const worker = registration.installing;
      if (!worker) return;

      worker.addEventListener('statechange', function() {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({type:'SKIP_WAITING'});
        }
      });
    });

    registration.update().catch(function(){});
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

function getFocusable(root) {
  return Array.from(root.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  )).filter(function(el) {
    return !el.hidden && el.getAttribute('aria-hidden') !== 'true';
  });
}

function closeModal(restoreFocus = true) {
  if (!activeModal) return;

  activeModal.remove();
  activeModal = null;

  if (modalKeyHandler) {
    document.removeEventListener('keydown', modalKeyHandler);
    modalKeyHandler = null;
  }

  document.body.classList.remove('modal-open');
  const main = document.querySelector('.hub-shell');
  if (main) main.inert = false;

  const returnTarget = modalReturnFocus;
  modalReturnFocus = null;
  if (restoreFocus && returnTarget?.isConnected) {
    returnTarget.focus();
  }
}

function openModal(title) {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  closeModal(false);
  modalReturnFocus = opener;

  const overlay = document.createElement('div');
  overlay.className = 'hub-modal';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','hub-modal-title');

  const panel = document.createElement('div');
  panel.className = 'modal-panel';

  const head = document.createElement('div');
  head.className = 'modal-head';

  const titleNode = textEl('strong','modal-title',title);
  titleNode.id = 'hub-modal-title';
  head.append(titleNode);

  const close = textEl('button','modal-close','×');
  close.type = 'button';
  close.setAttribute('aria-label','Close');
  close.addEventListener('click', function(){ closeModal(true); });
  head.append(close);

  panel.append(head);
  overlay.append(panel);

  overlay.addEventListener('click', function(event) {
    if (event.target === overlay) closeModal(true);
  });

  document.body.append(overlay);
  activeModal = overlay;
  document.body.classList.add('modal-open');

  const main = document.querySelector('.hub-shell');
  if (main) main.inert = true;

  modalKeyHandler = function(event) {
    if (!activeModal) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal(true);
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusable(panel);
    if (!focusable.length) {
      event.preventDefault();
      close.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', modalKeyHandler);
  requestAnimationFrame(function(){ close.focus(); });
  return panel;
}

function showInstallHelp() {
  const panel = openModal('Install PWA Hub');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  panel.append(textEl(
    'p',
    'modal-text',
    isIOS
      ? 'In Safari, tap Share, choose “Add to Home Screen”, then tap “Add”.'
      : 'Open your browser menu and choose “Install app” or “Add to Home screen”.'
  ));
}

function setupInstall() {
  const button = document.getElementById('install-button');
  if (!button) return;

  if (isStandalone()) {
    button.hidden = true;
  }

  window.addEventListener('beforeinstallprompt', function(event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (!isStandalone()) button.hidden = false;
  });

  window.addEventListener('appinstalled', function() {
    deferredInstallPrompt = null;
    button.hidden = true;
  });

  button.addEventListener('click', async function() {
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
  window.setTimeout(function(){
    label.textContent = normal;
  }, 1400);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly','');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  return copied;
}

async function copyHubUrl(button, normalLabel) {
  try {
    const copied = await copyText(getHubUrl());
    if (!copied) throw new Error('Copy command was not accepted');
    flashButton(button,'Copied',normalLabel);
  } catch (error) {
    console.warn('Clipboard failed:', error);
    flashButton(button,'Unavailable',normalLabel);
  }
}

function openShareModal() {
  const panel = openModal('Share PWA Hub');

  const qr = document.createElement('div');
  qr.className = 'qr-wrap';

  const img = document.createElement('img');
  img.src = safeAssetUrl(hubConfig.qrImage,'qr-hub.svg');
  img.alt = 'QR code for PWA Hub';
  qr.append(img);

  const note = textEl(
    'p',
    'modal-text',
    'Scan this code to open the Hub, or use one of the options below.'
  );
  note.style.textAlign = 'center';

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  if (navigator.share) {
    const share = textEl('button','modal-action primary','Share');
    share.type = 'button';
    share.addEventListener('click', async function() {
      try {
        await navigator.share({
          title:'@rmacfie • PWA Hub',
          text:'My Progressive Web Apps • Ready to Use',
          url:getHubUrl()
        });
      } catch (error) {
        if (error?.name !== 'AbortError') console.warn(error);
      }
    });
    actions.append(share);
  }

  const copy = textEl('button','modal-action','Copy Link');
  copy.type = 'button';
  copy.addEventListener('click', async function() {
    await copyHubUrl(copy,'Copy Link');
  });
  actions.append(copy);

  panel.append(qr,note,actions);
}

function setupTopActions() {
  const share = document.getElementById('share-button');
  const copy = document.getElementById('copy-button');
  const qr = document.getElementById('qr-button');

  share?.addEventListener('click', async function() {
    if (!navigator.share) {
      openShareModal();
      return;
    }

    try {
      await navigator.share({
        title:'@rmacfie • PWA Hub',
        text:'My Progressive Web Apps • Ready to Use',
        url:getHubUrl()
      });
    } catch (error) {
      if (error?.name !== 'AbortError') openShareModal();
    }
  });

  copy?.addEventListener('click', function(){
    copyHubUrl(copy,'Copy');
  });

  qr?.addEventListener('click', openShareModal);
}

function renderMeta(item) {
  const meta = document.createElement('div');
  meta.className = 'app-meta';

  if (hubConfig.showStatus !== false) {
    const status = getStatus(item.status);
    const badge = textEl('span','status-badge status-' + status,statusLabel(status));
    meta.append(badge);
  }

  if (hubConfig.showVersion !== false && item.version) {
    if (meta.childNodes.length) meta.append(textEl('span','meta-dot','•'));
    meta.append(textEl('span','', 'v' + item.version));
  }

  if (hubConfig.showUpdated !== false && item.updated) {
    if (meta.childNodes.length) meta.append(textEl('span','meta-dot','•'));
    meta.append(textEl('span','',formatDate(item.updated)));
  }

  return meta;
}

function setImageFallback(image) {
  image.addEventListener('error', function() {
    image.src = 'assets/icons/icon-192.png';
  }, {once:true});
}

function openAppDetails(item) {
  const panel = openModal(item.title || 'App');

  const head = document.createElement('div');
  head.className = 'detail-head';

  const logo = document.createElement('img');
  logo.className = 'detail-logo';
  logo.src = safeAssetUrl(item.logo,'assets/icons/icon-192.png');
  logo.alt = '';
  setImageFallback(logo);

  const copy = document.createElement('div');
  copy.append(
    textEl('div','detail-title',item.title || 'App'),
    textEl('div','detail-sub',(item.category || 'App') + ' • ' + statusLabel(item.status))
  );

  head.append(logo,copy);

  const desc = textEl('p','modal-text',item.details || item.description || '');

  const meta = document.createElement('div');
  meta.className = 'modal-meta';

  const version = document.createElement('div');
  version.append(
    textEl('span','', 'Version'),
    textEl('strong','',item.version ? 'v' + item.version : '—')
  );

  const updated = document.createElement('div');
  updated.append(
    textEl('span','', 'Last updated'),
    textEl('strong','',item.updated ? formatDate(item.updated) : '—')
  );

  meta.append(version,updated);
  panel.append(head,desc,meta);

  if (isSafeUrl(item.url) && getStatus(item.status) !== 'coming-soon') {
    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const launch = textEl('a','modal-action primary','Launch App');
    launch.href = new URL(item.url, window.location.href).href;
    launch.target = item.open === 'same' ? '_self' : '_blank';
    if (launch.target === '_blank') launch.rel = 'noopener noreferrer';

    actions.append(launch);
    panel.append(actions);
  }
}

function buildCard(item) {
  const status = getStatus(item.status);
  const canLaunch = isSafeUrl(item.url) && status !== 'coming-soon';

  const article = document.createElement('article');
  article.className = 'app-card card-' + (VALID_THEMES.has(item.theme) ? item.theme : 'blue');

  if (status === 'maintenance') article.classList.add('is-maintenance');
  if (status === 'coming-soon') article.classList.add('is-coming-soon');
  if (item.featured) article.classList.add('is-featured');

  const main = document.createElement(canLaunch ? 'a' : 'div');
  main.className = 'app-launch' + (canLaunch ? '' : ' is-disabled');

  if (canLaunch) {
    main.href = new URL(item.url, window.location.href).href;
    main.target = item.open === 'same' ? '_self' : '_blank';
    if (main.target === '_blank') main.rel = 'noopener noreferrer';
  } else {
    main.setAttribute('aria-disabled','true');
  }

  const logo = document.createElement('img');
  logo.className = 'app-logo';
  logo.src = safeAssetUrl(item.logo,'assets/icons/icon-192.png');
  logo.alt = '';
  setImageFallback(logo);

  const content = document.createElement('div');
  content.className = 'app-copy';

  const titleRow = document.createElement('div');
  titleRow.className = 'app-title-row';
  titleRow.append(textEl('strong','app-title',item.title || 'App'));

  if (item.featured) {
    titleRow.append(textEl('span','featured-badge',item.featuredLabel || 'FEATURED'));
  }

  content.append(
    titleRow,
    textEl('span','app-desc',item.description || ''),
    renderMeta(item)
  );

  const arrow = textEl('span','app-arrow',canLaunch ? '›' : '•');
  arrow.setAttribute('aria-hidden','true');

  main.append(logo,content,arrow);

  const info = textEl('button','info-btn','i');
  info.type = 'button';
  info.setAttribute('aria-label','Details for ' + (item.title || 'app'));
  info.addEventListener('click', function(){
    openAppDetails(item);
  });

  article.append(main,info);
  return article;
}

async function loadApps() {
  const container = document.getElementById('links-container');
  if (!container) return;

  const data = await fetchJson('data/links.json',[]);
  const items = Array.isArray(data)
    ? data
      .filter(function(item){
        return item && typeof item.title === 'string';
      })
      .sort(function(a,b){
        return (Number(a.order)||999) - (Number(b.order)||999);
      })
    : [];

  if (!items.length) {
    container.replaceChildren(
      textEl('p','empty-state','Applications will be available shortly.')
    );
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach(function(item){
    fragment.append(buildCard(item));
  });
  container.replaceChildren(fragment);
}

function updateOfflineState() {
  const note = document.getElementById('offline-note');
  if (note) note.hidden = navigator.onLine;
}

function recordPrivateVisit() {
  if (!hubConfig.localPrivateVisits) return;

  try {
    const sessionKey = 'pwaHubV13Counted';
    if (sessionStorage.getItem(sessionKey)) return;

    const key = 'pwaHubPrivateVisits';
    const next = (Number(localStorage.getItem(key)) || 0) + 1;
    localStorage.setItem(key,String(next));
    sessionStorage.setItem(sessionKey,'1');
  } catch {}
}

function getPrivateVisits() {
  try {
    return Number(localStorage.getItem('pwaHubPrivateVisits')) || 0;
  } catch {
    return 0;
  }
}

async function maybeRecordExternalVisit() {
  const endpoint = hubConfig.analyticsEndpoint;
  if (!endpoint || !isSafeUrl(endpoint)) return;

  try {
    const url = new URL(endpoint, window.location.href);
    if (url.origin !== window.location.origin) return;

    await fetch(url.href,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({event:'hub_view',path:location.pathname}),
      keepalive:true
    });
  } catch {}
}

async function loadChangelog() {
  const data = await fetchJson('data/changelog.json',[]);
  changelogData = Array.isArray(data) ? data : [];
}

function openChangelog() {
  const panel = openModal('Changelog');

  if (!changelogData.length) {
    panel.append(textEl('p','modal-text','No changelog entries are available.'));
    return;
  }

  changelogData.forEach(function(entry) {
    const block = document.createElement('section');
    block.className = 'change-entry';
    block.append(
      textEl('div','change-title','v' + entry.version + ' • ' + entry.title),
      textEl('div','change-date',formatDate(entry.date))
    );

    const list = document.createElement('ul');
    list.className = 'change-list';
    (entry.changes || []).forEach(function(change){
      list.append(textEl('li','',change));
    });

    block.append(list);
    panel.append(block);
  });
}

function openAbout() {
  const panel = openModal('About PWA Hub');
  panel.append(
    textEl(
      'p',
      'modal-text',
      'A compact personal launcher for Roberto S. Macfie’s Progressive Web Apps and digital projects.'
    )
  );

  const counter = document.createElement('div');
  counter.className = 'local-counter';
  counter.append(
    textEl('strong','',String(getPrivateVisits())),
    textEl('span','','Private visits on this device')
  );

  panel.append(counter);
  panel.append(
    textEl(
      'p',
      'modal-text',
      'The visit counter above stays in this browser only. No external analytics are sent unless a same-origin analytics endpoint is explicitly configured.'
    )
  );
}

function setupFooter() {
  document.getElementById('changelog-button')?.addEventListener('click',openChangelog);
  document.getElementById('about-button')?.addEventListener('click',openAbout);
}

async function initData() {
  await loadConfig();
  recordPrivateVisit();
  maybeRecordExternalVisit();
  await Promise.all([loadApps(),loadChangelog()]);
}

const avatar = document.querySelector('.avatar');
avatar?.addEventListener('error', function() {
  avatar.src = 'https://ui-avatars.com/api/?name=Roberto+Macfie&background=108a9d&color=fff&size=192';
}, {once:true});

window.addEventListener('online',updateOfflineState);
window.addEventListener('offline',updateOfflineState);

setupServiceWorker();
setupInstall();
setupTopActions();
setupFooter();
updateOfflineState();
initData();

window.__PWA_HUB_VERSION__ = HUB_VERSION;
