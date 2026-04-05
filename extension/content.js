const API = 'http://localhost/youtube/api';

const DL_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.5z"/></svg>';
const MENU_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>';

// ========== OPTIONS ==========
const AUDIO_FORMATS = [
  { v: 'mp3', l: 'MP3' }, { v: 'flac', l: 'FLAC' },
  { v: 'wav', l: 'WAV' }, { v: 'aac', l: 'AAC' }, { v: 'ogg', l: 'OGG' }
];
const AUDIO_QUALITIES = [
  { v: '0', l: 'Meilleure qualite' }, { v: '5', l: 'Qualite moyenne' }, { v: '9', l: 'Qualite basse' }
];
const VIDEO_FORMATS = [
  { v: 'mp4', l: 'MP4' }, { v: 'mkv', l: 'MKV' }, { v: 'webm', l: 'WEBM' }
];
const VIDEO_QUALITIES = [
  { v: 'best', l: 'Meilleure qualite' }, { v: '1080', l: '1080p' },
  { v: '720', l: '720p' }, { v: '480', l: '480p' }, { v: '360', l: '360p' }
];

// ========== BOUTONS FLOTTANTS ==========
function createButtons() {
  if (document.getElementById('ytdl-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'ytdl-bar';
  bar.innerHTML = `
    <button id="ytdl-btn-dl" class="ytdl-fab ytdl-fab-dl" title="Telecharger">${DL_ICON}</button>
    <button id="ytdl-btn-menu" class="ytdl-fab ytdl-fab-menu" title="Options">${MENU_ICON}</button>
  `;
  document.body.appendChild(bar);

  document.getElementById('ytdl-btn-dl').addEventListener('click', quickDownload);
  document.getElementById('ytdl-btn-menu').addEventListener('click', togglePanel);

  // Bouton DL inline a cote des likes
  injectInlineBtn();

  // Verifier si deja telecharge
  checkIfDownloaded(window.location.href);
}

function injectInlineBtn() {
  if (document.getElementById('ytdl-inline-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'ytdl-inline-btn';
  btn.innerHTML = DL_ICON + ' DL';
  btn.title = 'Telecharger avec YouTube Downloader';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    quickDownload();
  });

  // Retry insertion (YouTube charge les boutons en async)
  let tries = 0;
  const tryInsert = () => {
    tries++;
    const targets = [
      '#top-level-buttons-computed',
      'ytd-menu-renderer.ytd-watch-metadata',
      '#actions.ytd-watch-metadata',
      '#menu-container'
    ];
    for (const sel of targets) {
      const el = document.querySelector(sel);
      if (el) { el.appendChild(btn); return; }
    }
    if (tries < 20) setTimeout(tryInsert, 500);
  };
  tryInsert();
}

// ========== PANNEAU OPTIONS ==========
function createPanel() {
  if (document.getElementById('ytdl-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'ytdl-panel';
  panel.innerHTML = `
    <div class="ytdl-header">
      <span>${DL_ICON} Options</span>
      <button class="ytdl-close" id="ytdlClose">&times;</button>
    </div>
    <div class="ytdl-body">
      <div class="ytdl-status" id="ytdlStatus"></div>
      <div class="ytdl-video-info" id="ytdlVideoInfo" style="display:none;">
        <img id="ytdlThumb" src="" alt="">
        <div class="ytdl-vi-text">
          <div class="ytdl-vi-title" id="ytdlTitle">-</div>
          <div class="ytdl-vi-meta" id="ytdlMeta">-</div>
        </div>
      </div>

      <div class="ytdl-type-row">
        <input type="radio" name="ytdlType" id="ytdlAudio" value="audio" checked>
        <label for="ytdlAudio">Audio</label>
        <input type="radio" name="ytdlType" id="ytdlVideo" value="video">
        <label for="ytdlVideo">Video</label>
      </div>

      <div class="ytdl-row">
        <select id="ytdlFormat"></select>
        <select id="ytdlQuality"></select>
      </div>

      <div class="ytdl-check">
        <input type="checkbox" id="ytdlCover"><label for="ytdlCover">Couverture (image)</label>
      </div>

      <div class="ytdl-progress-zone" id="ytdlProgressZone">
        <div class="ytdl-progress-bg"><div class="ytdl-progress-fill" id="ytdlProgressBar"></div></div>
        <div class="ytdl-progress-text" id="ytdlProgressText">Demarrage...</div>
      </div>

      <button class="ytdl-btn ytdl-btn-dl" id="ytdlBtnDl">Telecharger</button>
      <button class="ytdl-btn ytdl-btn-queue" id="ytdlBtnQueue">+ File d'attente</button>

      <div class="ytdl-prefs-label" id="ytdlPrefsLabel"></div>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('ytdlClose').addEventListener('click', () => panel.classList.remove('active'));
  document.getElementById('ytdlAudio').addEventListener('change', () => { updatePanelOptions(); savePrefs(); updatePrefsLabel(); });
  document.getElementById('ytdlVideo').addEventListener('change', () => { updatePanelOptions(); savePrefs(); updatePrefsLabel(); });
  document.getElementById('ytdlFormat').addEventListener('change', () => { savePrefs(); updatePrefsLabel(); });
  document.getElementById('ytdlQuality').addEventListener('change', () => { savePrefs(); updatePrefsLabel(); });
  document.getElementById('ytdlCover').addEventListener('change', () => { savePrefs(); updatePrefsLabel(); });
  document.getElementById('ytdlBtnDl').addEventListener('click', () => panelDownload('download'));
  document.getElementById('ytdlBtnQueue').addEventListener('click', () => panelDownload('queue'));

  updatePanelOptions();
  loadSavedPrefs();
}

function togglePanel() {
  const panel = document.getElementById('ytdl-panel');
  if (panel) {
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) loadVideoInfo();
  }
}

// ========== PREFERENCES ==========
function updatePanelOptions() {
  const type = document.querySelector('input[name="ytdlType"]:checked')?.value || 'audio';
  const formats = type === 'audio' ? AUDIO_FORMATS : VIDEO_FORMATS;
  const qualities = type === 'audio' ? AUDIO_QUALITIES : VIDEO_QUALITIES;
  const fSel = document.getElementById('ytdlFormat');
  const qSel = document.getElementById('ytdlQuality');
  if (!fSel || !qSel) return;
  fSel.innerHTML = formats.map(f => '<option value="' + f.v + '">' + f.l + '</option>').join('');
  qSel.innerHTML = qualities.map(q => '<option value="' + q.v + '">' + q.l + '</option>').join('');
}

function loadSavedPrefs() {
  chrome.storage.local.get(['type', 'format', 'quality', 'cover'], (data) => {
    if (data.type === 'video') {
      const el = document.getElementById('ytdlVideo');
      if (el) el.checked = true;
    }
    updatePanelOptions();
    if (data.format) { const el = document.getElementById('ytdlFormat'); if (el) el.value = data.format; }
    if (data.quality) { const el = document.getElementById('ytdlQuality'); if (el) el.value = data.quality; }
    if (data.cover) { const el = document.getElementById('ytdlCover'); if (el) el.checked = true; }
    updatePrefsLabel();
  });
}

function savePrefs() {
  const type = document.querySelector('input[name="ytdlType"]:checked')?.value || 'audio';
  const format = document.getElementById('ytdlFormat')?.value || 'mp3';
  const quality = document.getElementById('ytdlQuality')?.value || '0';
  const cover = document.getElementById('ytdlCover')?.checked || false;
  chrome.storage.local.set({ type, format, quality, cover });
}

function getPrefs() {
  return new Promise(resolve => {
    chrome.storage.local.get(['type', 'format', 'quality', 'cover'], (data) => {
      resolve({
        type: data.type || 'audio',
        format: data.format || 'mp3',
        quality: data.quality || '0',
        cover: data.cover ? '1' : '0'
      });
    });
  });
}

function updatePrefsLabel() {
  const el = document.getElementById('ytdlPrefsLabel');
  if (!el) return;
  const type = document.querySelector('input[name="ytdlType"]:checked')?.value || 'audio';
  const format = document.getElementById('ytdlFormat')?.value || 'mp3';
  const quality = document.getElementById('ytdlQuality')?.value || '0';
  el.textContent = 'Bouton DL = ' + format.toUpperCase() + ' (' + (type === 'audio' ? 'audio' : 'video') + ')';
}

// ========== VIDEO INFO ==========
let cachedInfo = null;

async function loadVideoInfo() {
  const url = window.location.href;
  const infoDiv = document.getElementById('ytdlVideoInfo');
  const status = document.getElementById('ytdlStatus');

  try {
    const resp = await fetch(API + '/info.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'url=' + encodeURIComponent(url),
      signal: AbortSignal.timeout(10000)
    });
    cachedInfo = await resp.json();

    if (cachedInfo.success) {
      document.getElementById('ytdlThumb').src = cachedInfo.thumbnail || '';
      document.getElementById('ytdlTitle').textContent = cachedInfo.title;
      let meta = cachedInfo.channel || '';
      if (cachedInfo.duration) meta += ' | ' + cachedInfo.duration;
      if (cachedInfo.views_display) meta += ' | ' + cachedInfo.views_display;
      document.getElementById('ytdlMeta').textContent = meta;
      infoDiv.style.display = 'flex';
      status.className = 'ytdl-status';
    }
  } catch (err) {
    status.textContent = 'Serveur inaccessible. Lance Apache.';
    status.className = 'ytdl-status err';
    if (infoDiv) infoDiv.style.display = 'none';
  }
}

async function checkIfDownloaded(url) {
  try {
    const resp = await fetch(API + '/library.php?action=check_url&url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(2000) });
    const data = await resp.json();
    if (data.exists) markAsDownloaded();
  } catch (e) {}
}

function markAsDownloaded() {
  const fab = document.getElementById('ytdl-btn-dl');
  if (fab) { fab.innerHTML = CHECK_ICON; fab.classList.add('ytdl-downloaded'); fab.title = 'Deja telecharge (clic pour re-telecharger)'; }
  const inline = document.getElementById('ytdl-inline-btn');
  if (inline) { inline.innerHTML = CHECK_ICON + ' DL'; inline.classList.add('ytdl-downloaded'); inline.title = 'Deja telecharge (clic pour re-telecharger)'; }
}

// ========== QUICK DOWNLOAD (bouton DL) ==========
async function quickDownload() {
  const btn = document.getElementById('ytdl-btn-dl');
  const url = window.location.href;
  const prefs = await getPrefs();

  // Verifier doublon
  const exists = await checkUrlExists(url);
  if (exists) {
    // Deja telecharge — demander confirmation via le panneau
    const panel = document.getElementById('ytdl-panel');
    const status = document.getElementById('ytdlStatus');
    if (panel && status) {
      panel.classList.add('active');
      loadVideoInfo();
      status.textContent = 'Cette video est deja dans ta bibliotheque. Utilise le panneau pour re-telecharger si besoin.';
      status.className = 'ytdl-status ok';
    }
    return;
  }

  btn.classList.remove('ytdl-downloaded');
  btn.innerHTML = '...';
  btn.disabled = true;

  try {
    const dlResp = await fetch(API + '/download.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'url=' + encodeURIComponent(url) + '&type=' + prefs.type + '&format=' + prefs.format
        + '&quality=' + prefs.quality + '&cover=' + prefs.cover
    });
    const dlData = await dlResp.json();

    if (!dlData.success) {
      btn.innerHTML = '!';
      btn.classList.add('ytdl-error');
      setTimeout(() => resetDlBtn(btn), 3000);
      return;
    }

    btn.innerHTML = '0%';
    btn.classList.add('ytdl-progress');

    // Get info en parallele
    if (!cachedInfo || !cachedInfo.success) {
      const infoResp = await fetch(API + '/info.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(url)
      });
      cachedInfo = await infoResp.json();
    }

    // Poll progress
    const poll = setInterval(async () => {
      try {
        const resp = await fetch(API + '/progress.php?id=' + dlData.jobId);
        const data = await resp.json();
        if (data.status === 'done') {
          clearInterval(poll);
          btn.innerHTML = CHECK_ICON;
          btn.classList.remove('ytdl-progress');
          btn.classList.add('ytdl-downloaded');
          btn.disabled = false;
          btn.title = 'Deja telecharge (clic pour re-telecharger)';
          markAsDownloaded();
          if (cachedInfo && cachedInfo.success) addToLibrary(data, cachedInfo, prefs.type, prefs.format, url);
        } else if (data.status === 'error') {
          clearInterval(poll);
          btn.innerHTML = '!';
          btn.classList.remove('ytdl-progress');
          btn.classList.add('ytdl-error');
          setTimeout(() => resetDlBtn(btn), 3000);
        } else {
          btn.textContent = Math.max(data.percent || 0, 1) + '%';
        }
      } catch (e) {}
    }, 1000);

  } catch (err) {
    btn.innerHTML = 'OFF';
    btn.classList.add('ytdl-error');
    setTimeout(() => resetDlBtn(btn), 3000);
  }
}

function resetDlBtn(btn) {
  btn.innerHTML = DL_ICON;
  btn.disabled = false;
  btn.classList.remove('ytdl-error', 'ytdl-progress', 'ytdl-downloaded');
  btn.title = 'Telecharger';
}

// ========== PANEL DOWNLOAD ==========
async function panelDownload(mode) {
  const url = window.location.href;
  const type = document.querySelector('input[name="ytdlType"]:checked').value;
  const format = document.getElementById('ytdlFormat').value;
  const quality = document.getElementById('ytdlQuality').value;
  const cover = document.getElementById('ytdlCover').checked ? '1' : '0';
  const status = document.getElementById('ytdlStatus');
  const progressZone = document.getElementById('ytdlProgressZone');
  const progressBar = document.getElementById('ytdlProgressBar');
  const progressText = document.getElementById('ytdlProgressText');
  const btnDl = document.getElementById('ytdlBtnDl');
  const btnQueue = document.getElementById('ytdlBtnQueue');

  savePrefs();
  updatePrefsLabel();
  btnDl.disabled = true;
  btnQueue.disabled = true;

  try {
    if (!cachedInfo || !cachedInfo.success) {
      const infoResp = await fetch(API + '/info.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(url)
      });
      cachedInfo = await infoResp.json();
    }

    if (!cachedInfo.success) {
      status.textContent = 'Erreur: ' + cachedInfo.error;
      status.className = 'ytdl-status err';
      btnDl.disabled = false; btnQueue.disabled = false;
      return;
    }

    const dlResp = await fetch(API + '/download.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'url=' + encodeURIComponent(url) + '&type=' + type + '&format=' + format
        + '&quality=' + quality + '&cover=' + cover
    });
    const dlData = await dlResp.json();

    if (!dlData.success) {
      status.textContent = 'Erreur: ' + dlData.error;
      status.className = 'ytdl-status err';
      btnDl.disabled = false; btnQueue.disabled = false;
      return;
    }

    status.className = 'ytdl-status';
    progressZone.classList.add('active');
    progressText.textContent = 'Demarrage...';
    progressBar.style.width = '5%';

    const poll = setInterval(async () => {
      try {
        const resp = await fetch(API + '/progress.php?id=' + dlData.jobId);
        const data = await resp.json();
        if (data.status === 'done') {
          clearInterval(poll);
          progressBar.style.width = '100%';
          progressText.textContent = 'Termine !';
          await addToLibrary(data, cachedInfo, type, format, url);
          status.textContent = '✓ ' + cachedInfo.title;
          status.className = 'ytdl-status ok';

          markAsDownloaded();

          setTimeout(() => {
            progressZone.classList.remove('active');
            btnDl.disabled = false; btnQueue.disabled = false;
          }, 2000);
        } else if (data.status === 'error') {
          clearInterval(poll);
          progressText.textContent = 'Erreur';
          status.textContent = data.message;
          status.className = 'ytdl-status err';
          progressZone.classList.remove('active');
          btnDl.disabled = false; btnQueue.disabled = false;
        } else {
          const pct = Math.max(data.percent || 0, 5);
          progressBar.style.width = pct + '%';
          progressText.textContent = data.message || (pct + '%');
        }
      } catch (e) {}
    }, 800);

  } catch (err) {
    status.textContent = 'Serveur inaccessible. Lance Apache.';
    status.className = 'ytdl-status err';
    btnDl.disabled = false; btnQueue.disabled = false;
  }
}

// ========== LIBRARY ==========
async function addToLibrary(data, info, type, format, url) {
  await fetch(API + '/library.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'action=add_item&file=' + encodeURIComponent(data.file)
      + '&title=' + encodeURIComponent(info.title)
      + '&type=' + type + '&format=' + format
      + '&folder=&thumbnail=' + encodeURIComponent(info.thumbnail || '')
      + '&channel=' + encodeURIComponent(info.channel || '')
      + '&duration=' + encodeURIComponent(info.duration || '')
      + '&cover=' + encodeURIComponent(data.cover || '')
      + '&url=' + encodeURIComponent(url)
  });
  await fetch(API + '/history.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'action=add&title=' + encodeURIComponent(info.title) + '&status=success'
      + '&format=' + format + '&type=' + type + '&url=' + encodeURIComponent(url)
      + '&views=' + encodeURIComponent(info.views_display || '')
      + '&year=' + encodeURIComponent(info.year || '')
      + '&likes=' + encodeURIComponent(info.likes || '0')
      + '&dislikes=' + encodeURIComponent(info.dislikes || '0')
  });
}

// ========== NOTIFICATION LOG ==========
let logEntries = [];

function createLogPanel() {
  if (document.getElementById('ytdl-log-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'ytdl-log-panel';
  panel.innerHTML = `
    <div class="ytdl-log-header">
      <span>Notifications</span>
      <div>
        <button class="ytdl-log-clear" id="ytdlLogClear">Vider</button>
        <button class="ytdl-log-close" id="ytdlLogClose">&times;</button>
      </div>
    </div>
    <div class="ytdl-log-body" id="ytdlLogBody">
      <p class="ytdl-log-empty">Aucune notification.</p>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('ytdlLogClose').addEventListener('click', () => panel.classList.remove('active'));
  document.getElementById('ytdlLogClear').addEventListener('click', () => {
    logEntries = [];
    renderLog();
    updateLogBadge();
  });
}

function createLogToggle() {
  if (document.getElementById('ytdl-btn-log')) return;
  const bar = document.getElementById('ytdl-bar');
  if (!bar) return;

  const btn = document.createElement('button');
  btn.id = 'ytdl-btn-log';
  btn.className = 'ytdl-fab ytdl-fab-log';
  btn.title = 'Notifications';
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg><span class="ytdl-log-badge" id="ytdlLogBadge"></span>';
  btn.addEventListener('click', () => {
    const panel = document.getElementById('ytdl-log-panel');
    if (panel) panel.classList.toggle('active');
  });
  bar.appendChild(btn);
}

function addLog(type, title, detail) {
  logEntries.unshift({
    type, // 'skip' | 'success' | 'error'
    title,
    detail,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  });
  if (logEntries.length > 50) logEntries.pop();
  renderLog();
  updateLogBadge();
}

function renderLog() {
  const body = document.getElementById('ytdlLogBody');
  if (!body) return;
  if (logEntries.length === 0) {
    body.innerHTML = '<p class="ytdl-log-empty">Aucune notification.</p>';
    return;
  }
  body.innerHTML = logEntries.map(e => {
    const icons = { skip: '⏭', success: '✓', error: '✗' };
    const cls = { skip: 'skip', success: 'ok', error: 'err' };
    return `<div class="ytdl-log-item ytdl-log-${cls[e.type]}">
      <span class="ytdl-log-icon">${icons[e.type]}</span>
      <div class="ytdl-log-content">
        <div class="ytdl-log-title">${e.title}</div>
        <div class="ytdl-log-detail">${e.detail}</div>
      </div>
      <span class="ytdl-log-time">${e.time}</span>
    </div>`;
  }).join('');
}

function updateLogBadge() {
  const badge = document.getElementById('ytdlLogBadge');
  if (!badge) return;
  const count = logEntries.length;
  badge.textContent = count > 0 ? count : '';
  badge.classList.toggle('active', count > 0);
}

async function checkUrlExists(url) {
  try {
    const resp = await fetch(API + '/library.php?action=check_url&url=' + encodeURIComponent(url), { signal: AbortSignal.timeout(2000) });
    const data = await resp.json();
    return data.exists === true;
  } catch (e) { return false; }
}

// ========== PLAYLIST DETECTION ==========
function scrapePlaylistVideos() {
  const videos = new Map(); // videoId -> {url, title, duration, durationSec}

  // Fonction pour parser la duree texte en secondes
  function parseDuration(text) {
    if (!text) return 0;
    text = text.trim();
    const parts = text.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }

  // Videos dans la sidebar playlist (page watch avec playlist)
  document.querySelectorAll('ytd-playlist-panel-video-renderer').forEach(el => {
    const a = el.querySelector('a#wc-endpoint');
    const titleEl = el.querySelector('#video-title');
    const timeEl = el.querySelector('ytd-thumbnail-overlay-time-status-renderer span, #overlays span.ytd-thumbnail-overlay-time-status-renderer');
    if (a && a.href) {
      const match = a.href.match(/[?&]v=([^&]+)/);
      if (match) {
        const dur = timeEl ? timeEl.textContent.trim() : '';
        videos.set(match[1], {
          url: 'https://www.youtube.com/watch?v=' + match[1],
          title: titleEl ? titleEl.textContent.trim() : '',
          duration: dur,
          durationSec: parseDuration(dur)
        });
      }
    }
  });

  // Page playlist (/playlist?list=)
  document.querySelectorAll('ytd-playlist-video-renderer').forEach(el => {
    const a = el.querySelector('a#video-title');
    const timeEl = el.querySelector('#overlays ytd-thumbnail-overlay-time-status-renderer span, span.ytd-thumbnail-overlay-time-status-renderer');
    if (a && a.href) {
      const match = a.href.match(/[?&]v=([^&]+)/);
      if (match && !videos.has(match[1])) {
        const dur = timeEl ? timeEl.textContent.trim() : '';
        videos.set(match[1], {
          url: 'https://www.youtube.com/watch?v=' + match[1],
          title: a.textContent.trim(),
          duration: dur,
          durationSec: parseDuration(dur)
        });
      }
    }
  });

  return [...videos.values()];
}

function scrapePlaylistLinks() {
  return scrapePlaylistVideos().map(v => v.url);
}

let playlistScrollWatcher = null;

function createPlaylistBanner() {
  if (document.getElementById('ytdl-playlist-banner')) return;

  const allVideos = scrapePlaylistVideos();
  if (allVideos.length < 2) return;

  const banner = document.createElement('div');
  banner.id = 'ytdl-playlist-banner';
  banner.innerHTML = `
    <div class="ytdl-pb-top">
      <div class="ytdl-pb-left">
        <span class="ytdl-pb-icon">${DL_ICON}</span>
        <span class="ytdl-pb-text"><strong id="ytdlPbCount">${allVideos.length}</strong> videos detectees</span>
      </div>
      <div class="ytdl-pb-right">
        <button id="ytdl-pb-btn" class="ytdl-pb-dl">Tout telecharger</button>
        <button id="ytdl-pb-close" class="ytdl-pb-close">&times;</button>
      </div>
    </div>
    <div class="ytdl-pb-filters">
      <label class="ytdl-pb-filter-check">
        <input type="checkbox" id="ytdlPbFilterOn"> Filtrer par duree
      </label>
      <div class="ytdl-pb-filter-range" id="ytdlPbFilterRange" style="display:none;">
        <div class="ytdl-pb-filter-field">
          <span>Min</span>
          <input type="number" id="ytdlPbMin" value="0" min="0" step="1" placeholder="0"> min
        </div>
        <div class="ytdl-pb-filter-field">
          <span>Max</span>
          <input type="number" id="ytdlPbMax" value="60" min="0" step="1" placeholder="60"> min
        </div>
        <span class="ytdl-pb-filter-result" id="ytdlPbFilterResult"></span>
      </div>
    </div>
    <div class="ytdl-pb-progress" id="ytdlPbProgress" style="display:none;">
      <div class="ytdl-pb-bars">
        <div class="ytdl-pb-bar-group">
          <span class="ytdl-pb-label" id="ytdlPbCurrent">-</span>
          <div class="ytdl-pb-bar-bg"><div class="ytdl-pb-bar-fill" id="ytdlPbBarCurrent"></div></div>
        </div>
        <div class="ytdl-pb-bar-group">
          <span class="ytdl-pb-label" id="ytdlPbTotal">Total : 0 / 0</span>
          <div class="ytdl-pb-bar-bg ytdl-pb-bar-total"><div class="ytdl-pb-bar-fill" id="ytdlPbBarTotal"></div></div>
        </div>
      </div>
      <span class="ytdl-pb-status" id="ytdlPbStatus"></span>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('ytdl-pb-close').addEventListener('click', () => {
    banner.remove();
    if (playlistScrollWatcher) { clearInterval(playlistScrollWatcher); playlistScrollWatcher = null; }
  });
  document.getElementById('ytdl-pb-btn').addEventListener('click', () => {
    const filtered = getFilteredVideos();
    downloadPlaylist(filtered.map(v => v.url));
  });

  // Filtre duree toggle
  document.getElementById('ytdlPbFilterOn').addEventListener('change', (e) => {
    document.getElementById('ytdlPbFilterRange').style.display = e.target.checked ? 'flex' : 'none';
    updateFilterCount();
  });
  document.getElementById('ytdlPbMin').addEventListener('input', updateFilterCount);
  document.getElementById('ytdlPbMax').addEventListener('input', updateFilterCount);

  // Watcher scroll — mise a jour du compteur
  playlistScrollWatcher = setInterval(() => {
    const fresh = scrapePlaylistVideos();
    const countEl = document.getElementById('ytdlPbCount');
    if (countEl && fresh.length > 0) {
      countEl.textContent = fresh.length;
      updateFilterCount();
    }
  }, 2000);
}

function getFilteredVideos() {
  const all = scrapePlaylistVideos();
  const filterOn = document.getElementById('ytdlPbFilterOn')?.checked;
  if (!filterOn) return all;

  const minMin = parseInt(document.getElementById('ytdlPbMin')?.value) || 0;
  const maxMin = parseInt(document.getElementById('ytdlPbMax')?.value) || 9999;
  const minSec = minMin * 60;
  const maxSec = maxMin * 60;

  return all.filter(v => {
    if (v.durationSec === 0) return true; // pas de duree connue → inclure
    return v.durationSec >= minSec && v.durationSec <= maxSec;
  });
}

function updateFilterCount() {
  const resultEl = document.getElementById('ytdlPbFilterResult');
  if (!resultEl) return;
  const filterOn = document.getElementById('ytdlPbFilterOn')?.checked;
  if (!filterOn) { resultEl.textContent = ''; return; }

  const all = scrapePlaylistVideos();
  const filtered = getFilteredVideos();
  resultEl.textContent = filtered.length + ' / ' + all.length + ' videos';

  const btn = document.getElementById('ytdl-pb-btn');
  if (btn && !btn.disabled) {
    btn.textContent = 'Telecharger ' + filtered.length + ' videos';
  }
}

async function downloadPlaylist(urls) {
  const btn = document.getElementById('ytdl-pb-btn');
  const progressDiv = document.getElementById('ytdlPbProgress');
  const barCurrent = document.getElementById('ytdlPbBarCurrent');
  const barTotal = document.getElementById('ytdlPbBarTotal');
  const labelCurrent = document.getElementById('ytdlPbCurrent');
  const labelTotal = document.getElementById('ytdlPbTotal');
  const statusEl = document.getElementById('ytdlPbStatus');
  const prefs = await getPrefs();
  let done = 0;
  let errors = 0;
  const total = urls.length;

  btn.disabled = true;
  btn.textContent = 'En cours...';
  progressDiv.style.display = 'block';
  barTotal.style.width = '0%';

  let skipped = 0;
  const user = await getCurrentUser();

  for (const url of urls) {
    const videoNum = done + 1;
    labelCurrent.textContent = 'Video ' + videoNum + ' / ' + total + ' — verification...';
    barCurrent.style.width = '0%';
    statusEl.textContent = 'Verification doublons...';

    try {
      // Verifier si deja telecharge
      const exists = await checkUrlExists(url);
      if (exists) {
        // Recuperer le titre pour le log
        let skipTitle = 'Video ' + videoNum;
        try {
          const infoResp = await fetch(API + '/info.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'url=' + encodeURIComponent(url)
          });
          const info = await infoResp.json();
          if (info.success) skipTitle = info.title;
        } catch (e) {}

        skipped++;
        done++;
        addLog('skip', skipTitle, 'Deja dans la bibliotheque' + (user ? ' de ' + user : '') + ' — ignore');
        statusEl.textContent = 'Ignore (doublon)';
        barCurrent.style.width = '100%';
        barTotal.style.width = ((done / total) * 100) + '%';
        labelTotal.textContent = 'Total : ' + done + ' / ' + total + formatPlaylistStats(errors, skipped);
        continue;
      }

      statusEl.textContent = 'Demarrage...';

      // Recuperer info
      const infoResp = await fetch(API + '/info.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(url)
      });
      const info = await infoResp.json();
      if (info.success) {
        labelCurrent.textContent = 'Video ' + videoNum + ' / ' + total + ' — ' + info.title;
      }

      // Lancer le telechargement
      const dlResp = await fetch(API + '/download.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(url) + '&type=' + prefs.type + '&format=' + prefs.format
          + '&quality=' + prefs.quality + '&cover=' + prefs.cover
      });
      const dlData = await dlResp.json();
      if (!dlData.success) {
        errors++;
        done++;
        addLog('error', info.success ? info.title : 'Video ' + videoNum, 'Erreur de telechargement');
        statusEl.textContent = 'Erreur sur cette video';
        barTotal.style.width = ((done / total) * 100) + '%';
        labelTotal.textContent = 'Total : ' + done + ' / ' + total + formatPlaylistStats(errors, skipped);
        continue;
      }

      // Attendre la fin avec progression
      await new Promise((resolve) => {
        const poll = setInterval(async () => {
          try {
            const resp = await fetch(API + '/progress.php?id=' + dlData.jobId);
            const data = await resp.json();
            if (data.status === 'done') {
              clearInterval(poll);
              barCurrent.style.width = '100%';
              statusEl.textContent = 'Termine !';
              if (info.success) {
                await addToLibrary(data, info, prefs.type, prefs.format, url);
                addLog('success', info.title, prefs.format.toUpperCase() + ' — ' + (data.file || ''));
              }
              resolve();
            } else if (data.status === 'error') {
              clearInterval(poll);
              errors++;
              addLog('error', info.success ? info.title : 'Video ' + videoNum, data.message || 'Erreur inconnue');
              statusEl.textContent = 'Erreur : ' + (data.message || '');
              resolve();
            } else {
              const pct = Math.max(data.percent || 0, 1);
              barCurrent.style.width = pct + '%';
              statusEl.textContent = data.message || (pct + '%');
            }
          } catch (e) { clearInterval(poll); resolve(); }
        }, 1000);
      });
    } catch (e) { errors++; }

    done++;
    barTotal.style.width = ((done / total) * 100) + '%';
    labelTotal.textContent = 'Total : ' + done + ' / ' + total + formatPlaylistStats(errors, skipped);
  }

  const downloaded = total - errors - skipped;
  btn.textContent = 'Termine !';
  btn.style.background = '#2e7d32';
  labelCurrent.textContent = 'Playlist terminee';
  barCurrent.style.width = '100%';
  statusEl.textContent = downloaded + ' telecharges' + (skipped ? ', ' + skipped + ' ignores' : '') + (errors ? ', ' + errors + ' erreurs' : '');

  setTimeout(() => { btn.disabled = false; }, 2000);
}

function formatPlaylistStats(errors, skipped) {
  let s = '';
  if (skipped) s += ' (' + skipped + ' ignores)';
  if (errors) s += ' (' + errors + ' erreurs)';
  return s;
}

async function getCurrentUser() {
  try {
    const resp = await fetch(API + '/profile.php?action=list', { signal: AbortSignal.timeout(2000) });
    const data = await resp.json();
    // Pas ideal mais on prend le dernier profil actif
    if (data.success && data.profiles.length > 0) return data.profiles[0].username;
  } catch (e) {}
  return null;
}

// ========== INIT & NAVIGATION ==========
function initOnVideoPage() {
  cachedInfo = null;
  createButtons();
  createPanel();
  createLogPanel();
  createLogToggle();

  const status = document.getElementById('ytdlStatus');
  if (status) status.className = 'ytdl-status';
  const progressZone = document.getElementById('ytdlProgressZone');
  if (progressZone) progressZone.classList.remove('active');
  const infoDiv = document.getElementById('ytdlVideoInfo');
  if (infoDiv) infoDiv.style.display = 'none';

  checkIfDownloaded(window.location.href);

  // Detecter playlist apres un delai (le sidebar met du temps a charger)
  setTimeout(createPlaylistBanner, 2000);
}

function initOnPlaylistPage() {
  createPanel();
  // Retry pour attendre que les videos soient chargees
  let tries = 0;
  const tryBanner = () => {
    tries++;
    createPlaylistBanner();
    if (!document.getElementById('ytdl-playlist-banner') && tries < 10) {
      setTimeout(tryBanner, 1000);
    }
  };
  setTimeout(tryBanner, 1500);
}

function removeAll() {
  ['ytdl-bar', 'ytdl-panel', 'ytdl-inline-btn', 'ytdl-playlist-banner', 'ytdl-log-panel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function isVideoPage() {
  return /youtube\.com\/watch|youtube\.com\/shorts\//.test(location.href);
}

function isPlaylistPage() {
  return /youtube\.com\/playlist\?list=/.test(location.href);
}

function ensureInit() {
  let attempts = 0;
  const tryInit = () => {
    attempts++;
    if (isPlaylistPage()) {
      initOnPlaylistPage();
      return;
    }
    if (!isVideoPage()) { removeAll(); return; }
    if (document.getElementById('ytdl-bar')) return;
    if (document.body) initOnVideoPage();
    if (!document.getElementById('ytdl-bar') && attempts < 15) {
      setTimeout(tryInit, 500);
    }
  };
  tryInit();
}

let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    removeAll();
    if (isVideoPage() || isPlaylistPage()) ensureInit();
  }
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

if (isVideoPage() || isPlaylistPage()) {
  if (document.body) ensureInit();
  document.addEventListener('DOMContentLoaded', ensureInit);
  setTimeout(ensureInit, 500);
  setTimeout(ensureInit, 2000);
}

window.addEventListener('yt-navigate-finish', () => {
  removeAll();
  if (isVideoPage() || isPlaylistPage()) ensureInit();
});

window.addEventListener('popstate', () => {
  setTimeout(() => { removeAll(); if (isVideoPage() || isPlaylistPage()) ensureInit(); }, 300);
});
