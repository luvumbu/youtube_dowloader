// ========== STATE ==========
let currentFolder = '';
let moveItemId = '';
let libraryData = { folders: [], items: [], stats: {} };

// ========== THEME ==========
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'light';
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    localStorage.setItem('yt_theme', theme);
    document.getElementById('themeIcon').textContent = theme === 'light' ? '\u263E' : '\u2600';
}
(function() {
    const saved = localStorage.getItem('yt_theme') || 'dark';
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
    document.addEventListener('DOMContentLoaded', () => {
        const icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = saved === 'light' ? '\u263E' : '\u2600';
    });
})();

// ========== NOTIFICATIONS ==========
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
function notifyDone(title) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Telechargement termine', { body: title, icon: 'assets/youtube.ico' });
    }
}

// ========== TABS ==========
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab-content#tab-' + tab).classList.add('active');
    // Trouver le bon onglet a activer dans la barre
    document.querySelectorAll('.tab').forEach(t => {
        const tabMap = { 'Telecharger': 'download', 'Recherche': 'search', 'Bibliotheque': 'library', 'Profil': 'profile' };
        if (tabMap[t.textContent] === tab) t.classList.add('active');
    });
    localStorage.setItem('yt_tab', tab);
    if (tab === 'library') { loadLibrary(); loadHistory(); loadSystemInfo(); }
}

// ========== FORMATS ==========
const audioFormats = {
    formats: [
        { value: 'mp3', label: 'MP3' }, { value: 'flac', label: 'FLAC' },
        { value: 'wav', label: 'WAV' }, { value: 'aac', label: 'AAC' }, { value: 'ogg', label: 'OGG' }
    ],
    qualities: [
        { value: '0', label: 'Meilleure qualite' }, { value: '5', label: 'Qualite moyenne' },
        { value: '9', label: 'Qualite basse' }
    ]
};
const videoFormats = {
    formats: [
        { value: 'mp4', label: 'MP4' }, { value: 'mkv', label: 'MKV' }, { value: 'webm', label: 'WEBM' }
    ],
    qualities: [
        { value: 'best', label: 'Meilleure qualite' }, { value: '1080', label: '1080p' },
        { value: '720', label: '720p' }, { value: '480', label: '480p' }, { value: '360', label: '360p' }
    ]
};

const formatSelect = document.getElementById('format');
const qualitySelect = document.getElementById('quality');

function updateOptions() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const config = type === 'audio' ? audioFormats : videoFormats;
    formatSelect.innerHTML = config.formats.map(f => '<option value="'+f.value+'">'+f.label+'</option>').join('');
    qualitySelect.innerHTML = config.qualities.map(q => '<option value="'+q.value+'">'+q.label+'</option>').join('');
}

document.querySelectorAll('input[name="type"]').forEach(r => r.addEventListener('change', () => { updateOptions(); updateDlSummary(); }));
formatSelect.addEventListener('change', updateDlSummary);
qualitySelect.addEventListener('change', updateDlSummary);
updateOptions();

function toggleDlOptions() {
    const panel = document.getElementById('dlOptionsPanel');
    const arrow = document.getElementById('dlArrow');
    panel.classList.toggle('open');
    arrow.classList.toggle('open');
}

function updateDlSummary() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const format = formatSelect.options[formatSelect.selectedIndex]?.text || '';
    const quality = qualitySelect.options[qualitySelect.selectedIndex]?.text || '';
    const summary = document.getElementById('dlSummary');
    if (summary) summary.textContent = format + ' — ' + quality + (type === 'video' ? ' (video)' : '');
}
setTimeout(updateDlSummary, 100);

// ========== DOWNLOAD ==========
document.getElementById('dlForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const url = document.getElementById('url').value.trim();
    const btn = document.getElementById('btn');
    const videoCard = document.getElementById('videoCard');
    const progressZone = document.getElementById('progressZone');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const result = document.getElementById('result');

    if (!url) return;

    const type = document.querySelector('input[name="type"]:checked').value;
    const format = formatSelect.value;
    const quality = qualitySelect.value;
    const saveCover = document.getElementById('saveCover').checked ? '1' : '0';
    const folder = document.getElementById('targetFolder').value;

    btn.disabled = true;
    btn.textContent = 'Chargement...';
    videoCard.classList.remove('active');
    progressZone.classList.remove('active');
    result.innerHTML = '';
    progressBar.style.width = '0%';

    // Verifier si c'est une playlist
    if (url.includes('list=')) {
        const isPlaylist = await checkPlaylist(url);
        if (isPlaylist) { btn.disabled = false; btn.textContent = 'Telecharger'; return; }
    }

    progressZone.classList.add('active');
    progressText.textContent = 'Recuperation des infos...';
    progressBar.style.width = '5%';

    try {
        const infoResp = await fetch('api/info.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'url=' + encodeURIComponent(url)
        });
        const info = await infoResp.json();

        if (!info.success) {
            result.innerHTML = '<div class="message error">' + info.error + '</div>';
            reset(); return;
        }

        document.getElementById('thumb').src = info.thumbnail;
        document.getElementById('videoTitle').textContent = info.title;
        let metaText = info.channel + '  |  ' + info.duration;
        if (info.views_display) metaText += '  |  ' + info.views_display;
        if (info.year) metaText += '  |  ' + info.year;
        if (info.likes) metaText += '  |  \u25B2 ' + formatLikes(info.likes);
        document.getElementById('videoMeta').textContent = metaText;
        videoCard.classList.add('active');

        progressText.textContent = 'Lancement du telechargement...';
        progressBar.style.width = '10%';

        startWithRetry(url, type, format, quality, saveCover, info, folder);

    } catch (err) {
        result.innerHTML = '<div class="message error">Erreur de connexion au serveur.</div>';
        reset();
    }

    async function startWithRetry(url, type, format, quality, saveCover, info, folder, attempt = 1) {
        const MAX_RETRIES = 2;

        if (attempt > 1) {
            progressText.textContent = 'Nouvelle tentative (' + attempt + '/' + (MAX_RETRIES + 1) + ')...';
            progressBar.style.width = '10%';
        }

        try {
            const dlResp = await fetch('api/download.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'url=' + encodeURIComponent(url) + '&type=' + type + '&format=' + format
                    + '&quality=' + quality + '&cover=' + saveCover
            });
            const dlData = await dlResp.json();

            if (!dlData.success) {
                if (attempt <= MAX_RETRIES) {
                    setTimeout(() => startWithRetry(url, type, format, quality, saveCover, info, folder, attempt + 1), 1500);
                    return;
                }
                result.innerHTML = '<div class="message error">' + dlData.error + '</div>';
                reset(); return;
            }

            pollProgress(dlData.jobId, info, type, format, folder, saveCover, url, quality, attempt);
        } catch (err) {
            if (attempt <= MAX_RETRIES) {
                setTimeout(() => startWithRetry(url, type, format, quality, saveCover, info, folder, attempt + 1), 1500);
            } else {
                result.innerHTML = '<div class="message error">Erreur de connexion au serveur.</div>';
                reset();
            }
        }
    }

    function pollProgress(jobId, info, type, format, folder, saveCover, url, quality, attempt) {
        const MAX_RETRIES = 2;
        let lastMessage = '';
        let stallCount = 0;
        const STALL_LIMIT = 240;

        const interval = setInterval(async () => {
            try {
                const resp = await fetch('api/progress.php?id=' + jobId);
                const data = await resp.json();

                if (data.status === 'done') {
                    clearInterval(interval);
                    progressBar.style.width = '100%';
                    progressText.textContent = 'Termine !';
                    const ext = data.file.split('.').pop().toUpperCase();
                    let html = '<div class="message success">' + info.title
                        + '<br><a class="dl-btn" href="' + data.file + '" download>Telecharger le ' + ext + '</a>';
                    if (data.cover) {
                        html += '<br><a class="dl-btn" style="background:#2196F3;margin-top:8px;" href="' + data.cover + '" download>Telecharger la couverture</a>';
                    }
                    html += '</div>';
                    result.innerHTML = html;

                    // Ajouter a la bibliotheque
                    await fetch('api/library.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'action=add_item&file=' + encodeURIComponent(data.file)
                            + '&title=' + encodeURIComponent(info.title)
                            + '&type=' + type + '&format=' + format
                            + '&folder=' + encodeURIComponent(folder)
                            + '&thumbnail=' + encodeURIComponent(info.thumbnail)
                            + '&channel=' + encodeURIComponent(info.channel)
                            + '&duration=' + encodeURIComponent(info.duration)
                            + '&cover=' + encodeURIComponent(data.cover || '')
                            + '&url=' + encodeURIComponent(url)
                    });

                    notifyDone(info.title);
                    addHistory(info.title, 'success', format, type, url, info);
                    incrementDownloadCount();
                    loadSystemInfo();
                    reset();
                } else if (data.status === 'error') {
                    clearInterval(interval);
                    // Retry silencieux si tentatives restantes
                    if (attempt <= MAX_RETRIES) {
                        setTimeout(() => startWithRetry(url, type, format, quality, saveCover, info, folder, attempt + 1), 1500);
                    } else {
                        progressText.textContent = 'Erreur';
                        result.innerHTML = '<div class="message error">' + data.message + '</div>';
                        addHistory(info.title, 'error', format, type, url, info);
                        reset();
                    }
                } else {
                    if (data.message === lastMessage) { stallCount++; } else { stallCount = 0; lastMessage = data.message; }
                    if (stallCount >= STALL_LIMIT) {
                        clearInterval(interval);
                        // Retry silencieux si bloque
                        if (attempt <= MAX_RETRIES) {
                            setTimeout(() => startWithRetry(url, type, format, quality, saveCover, info, folder, attempt + 1), 1500);
                        } else {
                            progressText.textContent = 'Bloque';
                            result.innerHTML = '<div class="message error">Le telechargement semble bloque (aucune progression depuis 2 min).</div>';
                            reset();
                        }
                        return;
                    }
                    progressBar.style.width = Math.max(10, data.percent) + '%';
                    let msg = data.message;
                    if (stallCount >= 60) msg += ' (en attente depuis ' + Math.round(stallCount/2) + 's...)';
                    progressText.textContent = msg;
                }
            } catch (err) {
                // Erreur reseau silencieuse, on continue le polling
            }
        }, 500);
    }

    function reset() { btn.disabled = false; btn.textContent = 'Telecharger'; }
});

// ========== LIBRARY ==========
async function loadLibrary() {
    const resp = await fetch('api/library.php?action=list');
    libraryData = await resp.json();
    renderLibrary();
    updateFolderSelect();
    buildFilterChips();
}

let activeFilters = new Set(['all']);

function buildFilterChips() {
    const container = document.getElementById('libFilterChips');
    if (!container) return;

    // Compter par type et format
    const items = libraryData.items || [];
    const audioCount = items.filter(i => i.type === 'audio').length;
    const videoCount = items.filter(i => i.type === 'video').length;
    const formatCounts = {};
    items.forEach(i => {
        if (i.format) formatCounts[i.format] = (formatCounts[i.format] || 0) + 1;
    });

    let html = '';
    // Tout
    html += '<label class="lib-filter-chip ' + (activeFilters.has('all') ? 'active' : '') + '">'
        + '<input type="checkbox" ' + (activeFilters.has('all') ? 'checked' : '') + ' onchange="toggleFilter(\'all\')">'
        + '<span class="chip-dot all"></span> Tout <span class="chip-count">(' + items.length + ')</span></label>';
    // Audio
    if (audioCount > 0) {
        html += '<label class="lib-filter-chip ' + (activeFilters.has('audio') ? 'active' : '') + '">'
            + '<input type="checkbox" ' + (activeFilters.has('audio') ? 'checked' : '') + ' onchange="toggleFilter(\'audio\')">'
            + '<span class="chip-dot audio"></span> Audio <span class="chip-count">(' + audioCount + ')</span></label>';
    }
    // Video
    if (videoCount > 0) {
        html += '<label class="lib-filter-chip ' + (activeFilters.has('video') ? 'active' : '') + '">'
            + '<input type="checkbox" ' + (activeFilters.has('video') ? 'checked' : '') + ' onchange="toggleFilter(\'video\')">'
            + '<span class="chip-dot video"></span> Video <span class="chip-count">(' + videoCount + ')</span></label>';
    }
    // Formats
    Object.keys(formatCounts).sort().forEach(f => {
        html += '<label class="lib-filter-chip ' + (activeFilters.has('fmt:' + f) ? 'active' : '') + '">'
            + '<input type="checkbox" ' + (activeFilters.has('fmt:' + f) ? 'checked' : '') + ' onchange="toggleFilter(\'fmt:' + f + '\')">'
            + '<span class="chip-dot format"></span> ' + f.toUpperCase() + ' <span class="chip-count">(' + formatCounts[f] + ')</span></label>';
    });

    container.innerHTML = html;
}

function toggleFilter(key) {
    if (key === 'all') {
        // Tout selectionner = reset tous les filtres
        activeFilters.clear();
        activeFilters.add('all');
    } else {
        // Desactiver "all"
        activeFilters.delete('all');

        if (activeFilters.has(key)) {
            activeFilters.delete(key);
        } else {
            activeFilters.add(key);
        }

        // Si rien de selectionne, revenir a "all"
        if (activeFilters.size === 0) {
            activeFilters.add('all');
        }
    }

    buildFilterChips();
    filterLibrary();
}

function renderLibrary() {
    const { folders, items, stats } = libraryData;

    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statAudio').textContent = stats.audio;
    document.getElementById('statVideo').textContent = stats.video;

    // Render folders bar
    let foldersHtml = '<div class="folder-chip ' + (currentFolder === '' ? 'active' : '') + '" data-folder-id="" onclick="filterFolder(\'\')">Tout</div>';
    folders.forEach(f => {
        foldersHtml += '<div class="folder-chip ' + (currentFolder === f.id ? 'active' : '') + '" data-folder-id="' + f.id + '" onclick="filterFolder(\'' + f.id + '\')">'
            + f.name
            + '<span class="folder-del" onclick="event.stopPropagation();deleteFolder(\'' + f.id + '\')">x</span>'
            + '</div>';
    });
    document.getElementById('foldersBar').innerHTML = foldersHtml;

    // Filter items
    const filtered = currentFolder === '' ? items : items.filter(i => i.folder === currentFolder);

    const grid = document.getElementById('itemsGrid');
    const empty = document.getElementById('emptyLib');

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    // Show select bar if items exist
    // Les gros boutons apparaissent quand on coche des items

    grid.innerHTML = filtered.map(item => {
        const thumbHtml = item.thumbnail
            ? '<img src="' + item.thumbnail + '" alt="">'
            : '<div class="no-thumb">' + (item.type === 'audio' ? '&#9835;' : '&#9654;') + '</div>';
        const badge = item.type === 'audio'
            ? '<span class="badge badge-audio">' + item.format + '</span>'
            : '<span class="badge badge-video">' + item.format + '</span>';
        const isPlayable = ['mp3','flac','wav','aac','ogg','mp4','webm'].includes(item.format);

        return '<div class="item-card" data-id="' + item.id + '">'
            + '<div class="item-check"><input type="checkbox" onchange="updateSelectCount()" data-item-id="' + item.id + '"></div>'
            + (isPlayable ? '<button class="item-play-btn" onclick="playSingle(\'' + item.id + '\')">&#9654;</button>' : '')
            + thumbHtml + badge
            + '<div class="item-body">'
            + '<div class="item-title" title="' + item.title + '">' + item.title + '</div>'
            + '<div class="item-meta">' + (item.channel || '') + ' | ' + (item.duration || '') + ' | ' + item.date.split(' ')[0] + '</div>'
            + '<div class="item-actions">'
            + '<a class="item-dl" href="' + item.file + '" download>DL</a>'
            + '<button class="item-move" onclick="showMoveItem(\'' + item.id + '\')">Deplacer</button>'
            + '<button class="item-del" onclick="deleteItem(\'' + item.id + '\')">Suppr</button>'
            + '</div></div></div>';
    }).join('');

    // Activer le drag & drop et calculer les stats
    enableDragDrop();
    computeDurationStats();
}

function filterLibrary() {
    const query = document.getElementById('libSearch').value.trim().toLowerCase();
    const showAll = activeFilters.has('all');

    document.querySelectorAll('.item-card').forEach(card => {
        const id = card.dataset.id;
        const item = libraryData.items.find(i => i.id === id);
        if (!item) return;

        const matchText = !query || (item.title + ' ' + (item.channel || '') + ' ' + (item.format || '')).toLowerCase().includes(query);

        let matchFilter = showAll;
        if (!showAll) {
            // Verifier type (audio/video)
            if (activeFilters.has(item.type)) matchFilter = true;
            // Verifier format (fmt:mp3, fmt:mp4, etc.)
            if (activeFilters.has('fmt:' + item.format)) matchFilter = true;
        }

        const match = matchText && matchFilter;
        card.classList.toggle('search-hidden', !match);
        card.classList.toggle('search-highlight', match && query.length > 0);
    });

    const visible = document.querySelectorAll('.item-card:not(.search-hidden)').length;
    const total = document.querySelectorAll('.item-card').length;
    const empty = document.getElementById('emptyLib');
    const hasFilter = query || !showAll;
    if (hasFilter && visible === 0) {
        empty.style.display = 'block';
        empty.textContent = 'Aucun resultat.';
    } else if (!hasFilter && total === 0) {
        empty.style.display = 'block';
        empty.textContent = 'Aucun telechargement pour le moment.';
    } else {
        empty.style.display = 'none';
    }
}

function filterFolder(folderId) {
    currentFolder = folderId;
    renderLibrary();
}

function updateFolderSelect() {
    const sel = document.getElementById('targetFolder');
    sel.innerHTML = '<option value="">Aucun dossier</option>'
        + libraryData.folders.map(f => '<option value="' + f.id + '">' + f.name + '</option>').join('');
}

// Modals
function showCreateFolder() {
    document.getElementById('folderName').value = '';
    document.getElementById('modalFolder').classList.add('active');
    document.getElementById('folderName').focus();
}

async function createFolder() {
    const name = document.getElementById('folderName').value.trim();
    if (!name) return;
    await fetch('api/library.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=create_folder&name=' + encodeURIComponent(name)
    });
    closeModal('modalFolder');
    loadLibrary();
}

function deleteFolder(id) {
    showConfirm('Supprimer le dossier', 'Les elements du dossier retourneront a la racine.', 'Supprimer', 'var(--error)', async () => {
        await fetch('api/library.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=delete_folder&folder_id=' + id
        });
        if (currentFolder === id) currentFolder = '';
        loadLibrary();
        loadSystemInfo();
    });
}

function deleteItem(id) {
    const item = libraryData.items.find(i => i.id === id);
    const title = item ? item.title : 'cet element';
    showConfirm('Supprimer', 'Supprimer "' + title + '" ? Le fichier sera supprime du disque.', 'Supprimer', 'var(--error)', async () => {
        await fetch('api/library.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=delete_item&item_id=' + id
        });
        loadLibrary();
        loadSystemInfo();
    });
}

function showMoveItem(itemId) {
    moveItemId = itemId;
    const sel = document.getElementById('moveTarget');
    sel.innerHTML = '<option value="">Racine (aucun dossier)</option>'
        + libraryData.folders.map(f => '<option value="' + f.id + '">' + f.name + '</option>').join('');
    document.getElementById('modalMove').classList.add('active');
}

async function confirmMove() {
    const folderId = document.getElementById('moveTarget').value;
    await fetch('api/library.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=move_item&item_id=' + moveItemId + '&folder_id=' + encodeURIComponent(folderId)
    });
    closeModal('modalMove');
    loadLibrary();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showConfirm(title, message, btnText, btnColor, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmBtn');
    btn.textContent = btnText || 'Confirmer';
    btn.style.background = btnColor || 'var(--error)';
    btn.onclick = () => { closeModal('modalConfirm'); callback(); };
    document.getElementById('modalConfirm').classList.add('active');
}

function showToast(message) {
    document.getElementById('toastMessage').textContent = message;
    document.getElementById('modalToast').classList.add('active');
}

function deleteSelected() {
    const ids = getSelectedIds();
    if (ids.length === 0) { showToast('Selectionne au moins un element.'); return; }
    showConfirm('Supprimer la selection', ids.length + ' element(s) seront supprimes du disque.', 'Supprimer tout', 'var(--error)', async () => {
        for (const id of ids) {
            await fetch('api/library.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'action=delete_item&item_id=' + id
            });
        }
        loadLibrary();
        loadSystemInfo();
    });
}

// Enter key in modal
document.getElementById('folderName').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); createFolder(); }
});

// ========== PLAYER ==========
let playlist = [];
let playIndex = 0;
let playMode = 'normal'; // normal, loop, loopOne, shuffle
const audioEl = document.getElementById('audioEl');
const videoEl = document.getElementById('videoEl');

function getItemById(id) {
    return libraryData.items.find(i => i.id === id);
}

// Selection
function selectAll() {
    document.querySelectorAll('.item-check input').forEach(c => c.checked = true);
    updateSelectCount();
}

function deselectAll() {
    document.querySelectorAll('.item-check input').forEach(c => c.checked = false);
    updateSelectCount();
}

function updateSelectCount() {
    const count = document.querySelectorAll('.item-check input:checked').length;
    const total = document.querySelectorAll('.item-check input').length;
    document.getElementById('selectCount').textContent = count + ' / ' + total + ' selectionne(s)';
    // Toujours afficher le bloc si il y a des items
    document.getElementById('bigActionBtns').style.display = total > 0 ? 'block' : 'none';
    // Afficher deselect/lire/supprimer seulement si selection > 0
    const hasSelection = count > 0;
    document.getElementById('btnDeselect').style.display = hasSelection ? '' : 'none';
    document.getElementById('btnPlaySel').style.display = hasSelection ? '' : 'none';
    document.getElementById('btnDeleteSel').style.display = hasSelection ? '' : 'none';
}

function getSelectedIds() {
    return [...document.querySelectorAll('.item-check input:checked')].map(c => c.dataset.itemId);
}

// Play
function playSingle(itemId) {
    playlist = [itemId];
    playIndex = 0;
    playCurrentItem();
}

function playSelected() {
    const ids = getSelectedIds();
    if (ids.length === 0) { showToast('Selectionne au moins un element.'); return; }
    playlist = ids;
    playIndex = 0;
    if (playMode === 'shuffle') shufflePlaylist();
    playCurrentItem();
}

function playCurrentItem() {
    if (playIndex < 0 || playIndex >= playlist.length) return;
    const item = getItemById(playlist[playIndex]);
    if (!item) return;

    if (item.type === 'video') {
        playVideo(item);
    } else {
        playAudio(item);
    }
}

function playAudio(item) {
    // Hide video overlay if open
    document.getElementById('videoOverlay').classList.remove('active');
    videoEl.pause();

    audioEl.src = item.file;
    audioEl.volume = document.getElementById('volumeSlider').value / 100;
    audioEl.play();

    // Show player bar
    const bar = document.getElementById('playerBar');
    bar.classList.add('active');
    document.body.classList.add('player-open');

    document.getElementById('playerThumb').src = item.thumbnail || '';
    document.getElementById('playerTitle').textContent = item.title;
    document.getElementById('playerArtist').textContent = item.channel || '';
    document.getElementById('btnPlayPause').innerHTML = '&#9646;&#9646;';
}

function playVideo(item) {
    // Pause audio
    audioEl.pause();
    document.getElementById('playerBar').classList.remove('active');
    document.body.classList.remove('player-open');

    videoEl.src = item.file;
    videoEl.volume = document.getElementById('volumeSlider').value / 100;
    videoEl.play();
    document.getElementById('videoPlayerTitle').textContent = item.title;
    document.getElementById('videoOverlay').classList.add('active');
}

function closeVideoPlayer() {
    videoEl.pause();
    videoEl.src = '';
    document.getElementById('videoOverlay').classList.remove('active');
}

function playerToggle() {
    if (audioEl.paused) {
        audioEl.play();
        document.getElementById('btnPlayPause').innerHTML = '&#9646;&#9646;';
    } else {
        audioEl.pause();
        document.getElementById('btnPlayPause').innerHTML = '&#9654;';
    }
}

function playerNext() {
    if (playlist.length === 0) return;
    if (playMode === 'loopOne') {
        audioEl.currentTime = 0; audioEl.play(); return;
    }
    playIndex++;
    if (playIndex >= playlist.length) {
        if (playMode === 'loop' || playMode === 'shuffle') {
            playIndex = 0;
            if (playMode === 'shuffle') shufflePlaylist();
        } else {
            playIndex = playlist.length - 1;
            audioEl.pause();
            document.getElementById('btnPlayPause').innerHTML = '&#9654;';
            return;
        }
    }
    playCurrentItem();
}

function playerPrev() {
    if (playlist.length === 0) return;
    // If more than 3s in, restart current track
    if (audioEl.currentTime > 3) {
        audioEl.currentTime = 0; return;
    }
    playIndex--;
    if (playIndex < 0) {
        if (playMode === 'loop' || playMode === 'shuffle') {
            playIndex = playlist.length - 1;
        } else {
            playIndex = 0;
        }
    }
    playCurrentItem();
}

function playerSetMode(mode) {
    if (playMode === mode) {
        playMode = 'normal';
    } else {
        playMode = mode;
    }
    // Update button styles
    document.getElementById('btnLoop').classList.toggle('active-mode', playMode === 'loop');
    document.getElementById('btnLoopOne').classList.toggle('active-mode', playMode === 'loopOne');
    document.getElementById('btnShuffle').classList.toggle('active-mode', playMode === 'shuffle');
}

function playerSetVolume(val) {
    audioEl.volume = val / 100;
    videoEl.volume = val / 100;
}

function playerMute() {
    const slider = document.getElementById('volumeSlider');
    if (audioEl.volume > 0) {
        slider.dataset.prev = slider.value;
        slider.value = 0;
        audioEl.volume = 0;
    } else {
        slider.value = slider.dataset.prev || 80;
        audioEl.volume = slider.value / 100;
    }
}

function seekPlayer(e) {
    if (!audioEl.duration) return;
    const rect = e.target.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioEl.currentTime = pct * audioEl.duration;
}

function playerClose() {
    audioEl.pause();
    audioEl.src = '';
    document.getElementById('playerBar').classList.remove('active');
    document.body.classList.remove('player-open');
    playlist = [];
}

function shufflePlaylist() {
    for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    playIndex = 0;
}

function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// Audio events
audioEl.addEventListener('timeupdate', () => {
    if (!audioEl.duration) return;
    const pct = (audioEl.currentTime / audioEl.duration) * 100;
    document.getElementById('playerSeekFill').style.width = pct + '%';
    document.getElementById('playerTime').textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(audioEl.duration);
});

audioEl.addEventListener('ended', () => {
    playerNext();
});

// Video ended -> next
videoEl.addEventListener('ended', () => {
    closeVideoPlayer();
    playerNext();
});

// ========== PROFILE ==========
let currentUser = null;

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

async function loadProfilesList() {
    const resp = await fetch('api/profile.php?action=list');
    const data = await resp.json();
    const container = document.getElementById('profilesList');
    if (!data.success || data.profiles.length === 0) {
        container.innerHTML = '<p style="color:#555; font-size:13px;">Aucun profil pour le moment.</p>';
        return;
    }
    container.innerHTML = data.profiles.map(p => {
        const initial = p.username.charAt(0).toUpperCase();
        return '<div class="profile-option" onclick="selectProfile(\'' + p.username.replace(/'/g, "\\'") + '\')">'
            + '<div class="po-avatar">' + initial + '</div>'
            + '<div class="po-info">'
            + '<div class="po-name">' + p.username + '</div>'
            + '<div class="po-meta">' + (p.download_count || 0) + ' telechargements</div>'
            + '</div></div>';
    }).join('');
}

async function selectProfile(username) {
    const resp = await fetch('api/profile.php?action=load&username=' + encodeURIComponent(username));
    const data = await resp.json();
    if (data.success) {
        currentUser = data.profile;
        document.cookie = 'yt_user=' + encodeURIComponent(username) + ';max-age=' + (86400*3650) + ';path=/';
        localStorage.setItem('yt_user', username);
        showProfile();
        applyPrefs();
    }
}

async function loginUser() {
    const name = document.getElementById('loginName').value.trim();
    if (!name) return;

    const resp = await fetch('api/profile.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=save&username=' + encodeURIComponent(name)
    });
    const data = await resp.json();
    if (data.success) {
        currentUser = data.profile;
        document.cookie = 'yt_user=' + encodeURIComponent(name) + ';max-age=' + (86400*3650) + ';path=/';
        localStorage.setItem('yt_user', name);
        showProfile();
        applyPrefs();
    }
}

async function loadProfile(username) {
    const resp = await fetch('api/profile.php?action=load&username=' + encodeURIComponent(username));
    const data = await resp.json();
    if (data.success) {
        currentUser = data.profile;
        showProfile();
        applyPrefs();
    }
}

function showProfile() {
    if (!currentUser) return;

    document.getElementById('loginView').style.display = 'none';
    document.getElementById('profileView').style.display = 'block';

    const initial = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('profileAvatar').textContent = initial;
    document.getElementById('profileName').textContent = currentUser.username;
    document.getElementById('profileSince').textContent = 'Membre depuis le ' + (currentUser.created || '').split(' ')[0];
    document.getElementById('profileDlCount').textContent = currentUser.download_count || 0;

    // Remplir les preferences
    if (currentUser.pref_type === 'video') {
        document.getElementById('prefVideo').checked = true;
    } else {
        document.getElementById('prefAudio').checked = true;
    }
    document.getElementById('prefFormatAudio').value = currentUser.pref_format_audio || 'mp3';
    document.getElementById('prefQualityAudio').value = currentUser.pref_quality_audio || '0';
    document.getElementById('prefFormatVideo').value = currentUser.pref_format_video || 'mp4';
    document.getElementById('prefQualityVideo').value = currentUser.pref_quality_video || 'best';
    document.getElementById('prefCover').checked = (currentUser.pref_cover === '1');

    // Welcome bar
    document.getElementById('welcomeBar').style.display = 'flex';
    document.getElementById('welcomeName').textContent = currentUser.username;
}

function applyPrefs() {
    if (!currentUser) return;

    // Appliquer le type
    if (currentUser.pref_type === 'video') {
        document.getElementById('typeVideo').checked = true;
    } else {
        document.getElementById('typeAudio').checked = true;
    }
    updateOptions();

    // Appliquer le format et la qualite selon le type
    const type = currentUser.pref_type || 'audio';
    if (type === 'audio') {
        formatSelect.value = currentUser.pref_format_audio || 'mp3';
        qualitySelect.value = currentUser.pref_quality_audio || '0';
    } else {
        formatSelect.value = currentUser.pref_format_video || 'mp4';
        qualitySelect.value = currentUser.pref_quality_video || 'best';
    }

    // Appliquer la couverture
    document.getElementById('saveCover').checked = (currentUser.pref_cover === '1');
}

async function savePrefs() {
    if (!currentUser) return;

    const prefType = document.querySelector('input[name="prefType"]:checked').value;
    const body = 'action=save&username=' + encodeURIComponent(currentUser.username)
        + '&pref_type=' + prefType
        + '&pref_format_audio=' + document.getElementById('prefFormatAudio').value
        + '&pref_format_video=' + document.getElementById('prefFormatVideo').value
        + '&pref_quality_audio=' + document.getElementById('prefQualityAudio').value
        + '&pref_quality_video=' + document.getElementById('prefQualityVideo').value
        + '&pref_cover=' + (document.getElementById('prefCover').checked ? '1' : '0');

    const resp = await fetch('api/profile.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    });
    const data = await resp.json();
    if (data.success) {
        currentUser = data.profile;
        applyPrefs();
        showToast('Preferences sauvegardees !');
    }
}

async function logoutUser() {
    currentUser = null;
    document.cookie = 'yt_user=;max-age=0;path=/';
    localStorage.removeItem('yt_user');
    document.getElementById('loginView').style.display = 'block';
    document.getElementById('profileView').style.display = 'none';
    document.getElementById('welcomeBar').style.display = 'none';
    await fetch('api/profile.php', { method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=logout'
    });
    loadProfilesList();
}

// Incrementer le compteur apres un telechargement reussi
async function incrementDownloadCount() {
    if (!currentUser) return;
    currentUser.download_count = (currentUser.download_count || 0) + 1;
    await fetch('api/profile.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=increment&username=' + encodeURIComponent(currentUser.username)
    });
}

// Enter dans le login
document.getElementById('loginName').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); loginUser(); }
});

// ========== SEARCH YOUTUBE ==========
async function searchYouTube() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="search-loading">Recherche en cours...</div>';

    try {
        const resp = await fetch('api/search.php?q=' + encodeURIComponent(query) + '&max=10');
        const data = await resp.json();

        if (!data.success || data.results.length === 0) {
            container.innerHTML = '<div class="search-loading">Aucun resultat.</div>';
            return;
        }

        container.innerHTML = data.results.map(r =>
            '<div class="search-result">'
            + '<img src="' + (r.thumbnail || '') + '" alt="">'
            + '<div class="sr-info">'
            + '<div class="sr-title">' + r.title + '</div>'
            + '<div class="sr-meta">' + r.channel + ' &bull; ' + r.duration + '</div>'
            + '</div>'
            + '<button class="sr-btn" onclick="useSearchResult(\'' + r.url.replace(/'/g, "\\'") + '\')">Telecharger</button>'
            + '</div>'
        ).join('');
    } catch (err) {
        container.innerHTML = '<div class="search-loading">Erreur de recherche.</div>';
    }
}

function useSearchResult(url) {
    document.getElementById('url').value = url;
    switchTab('download');
}

document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); searchYouTube(); }
});

// ========== PLAYLIST DETECTION ==========
async function checkPlaylist(url) {
    if (!url.includes('list=')) return false;

    const result = document.getElementById('result');
    const progressZone = document.getElementById('progressZone');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');

    progressZone.classList.add('active');
    progressText.textContent = 'Detection de la playlist...';
    progressBar.style.width = '5%';

    try {
        const resp = await fetch('api/playlist.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'url=' + encodeURIComponent(url)
        });
        const data = await resp.json();

        if (data.success && data.videos.length > 1) {
            progressZone.classList.remove('active');
            const type = document.querySelector('input[name="type"]:checked').value;
            const format = formatSelect.value;
            const quality = qualitySelect.value;
            const saveCover = document.getElementById('saveCover').checked ? '1' : '0';
            const folder = document.getElementById('targetFolder').value;

            result.innerHTML = '<div class="message success">'
                + 'Playlist detectee : ' + data.videos.length + ' videos'
                + '<br><button class="dl-btn" style="margin-top:10px;cursor:pointer;border:none;" onclick="addPlaylistToQueue()">Ajouter tout a la file d\'attente</button>'
                + '</div>';

            // Stocker les videos pour addPlaylistToQueue
            window._playlistVideos = data.videos;
            window._playlistParams = { type, format, quality, saveCover, folder };
            return true;
        }
    } catch (err) {}

    progressZone.classList.remove('active');
    return false;
}

function addPlaylistToQueue() {
    if (!window._playlistVideos) return;
    const p = window._playlistParams;
    window._playlistVideos.forEach(v => {
        downloadQueue.push({
            url: v.url, type: p.type, format: p.format, quality: p.quality,
            saveCover: p.saveCover, folder: p.folder, status: 'waiting',
            title: v.title, info: { success: true, title: v.title, thumbnail: v.thumbnail, channel: v.channel, duration: v.duration }
        });
    });
    renderQueue();
    document.getElementById('result').innerHTML = '<div class="message success">Playlist ajoutee ! ' + window._playlistVideos.length + ' videos en file d\'attente.</div>';
    window._playlistVideos = null;
    if (!queueProcessing) processQueue();
}

// ========== DOWNLOAD QUEUE ==========
let downloadQueue = [];
let queueProcessing = false;

function addToQueue() {
    const url = document.getElementById('url').value.trim();
    if (!url) return;

    const type = document.querySelector('input[name="type"]:checked').value;
    const format = formatSelect.value;
    const quality = qualitySelect.value;
    const saveCover = document.getElementById('saveCover').checked ? '1' : '0';
    const folder = document.getElementById('targetFolder').value;

    downloadQueue.push({ url, type, format, quality, saveCover, folder, status: 'waiting', title: url });
    document.getElementById('url').value = '';
    renderQueue();

    // Recuperer le titre en arriere-plan
    const idx = downloadQueue.length - 1;
    fetch('api/info.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(url)
    }).then(r => r.json()).then(info => {
        if (info.success && downloadQueue[idx]) {
            downloadQueue[idx].title = info.title;
            downloadQueue[idx].info = info;
            renderQueue();
        }
    }).catch(() => {});

    if (!queueProcessing) processQueue();
}

function removeFromQueue(idx) {
    if (downloadQueue[idx] && downloadQueue[idx].status === 'waiting') {
        downloadQueue.splice(idx, 1);
        renderQueue();
    }
}

function renderQueue() {
    const section = document.getElementById('queueSection');
    const list = document.getElementById('queueList');
    const waiting = downloadQueue.filter(q => q.status !== 'done');

    if (waiting.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    document.getElementById('queueCount').textContent = waiting.length;

    list.innerHTML = downloadQueue.map((q, i) => {
        if (q.status === 'done') return '';
        const statusClass = q.status === 'active' ? 'active' : (q.status === 'done' ? 'done' : '');
        const statusText = q.status === 'active' ? 'En cours...' : (q.status === 'error' ? 'Erreur' : 'En attente');
        return '<div class="queue-item">'
            + '<span class="qi-title">' + q.title + '</span>'
            + '<span class="qi-status ' + statusClass + '">' + statusText + '</span>'
            + (q.status === 'waiting' ? '<button class="qi-remove" onclick="removeFromQueue(' + i + ')">&times;</button>' : '')
            + '</div>';
    }).join('');
}

async function processQueue() {
    queueProcessing = true;

    while (downloadQueue.some(q => q.status === 'waiting')) {
        const idx = downloadQueue.findIndex(q => q.status === 'waiting');
        if (idx === -1) break;

        const item = downloadQueue[idx];
        item.status = 'active';
        renderQueue();

        try {
            // Recuperer info si pas deja fait
            if (!item.info) {
                const infoResp = await fetch('api/info.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'url=' + encodeURIComponent(item.url)
                });
                item.info = await infoResp.json();
                if (!item.info.success) { item.status = 'error'; renderQueue(); continue; }
                item.title = item.info.title;
                renderQueue();
            }

            // Lancer le telechargement
            await new Promise((resolve) => {
                queueDownload(item, resolve);
            });
        } catch (err) {
            item.status = 'error';
            addHistory(item.title, 'error', item.format, item.type, item.url, item.info);
            renderQueue();
        }

        // Delai anti-blocage (3-5s) entre chaque telechargement
        if (downloadQueue.some(q => q.status === 'waiting')) {
            await new Promise(r => setTimeout(r, 3000 + Math.floor(Math.random() * 2000)));
        }
    }

    queueProcessing = false;
    renderQueue();
}

function queueDownload(item, resolve) {
    fetch('api/download.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'url=' + encodeURIComponent(item.url) + '&type=' + item.type + '&format=' + item.format
            + '&quality=' + item.quality + '&cover=' + item.saveCover
    }).then(r => r.json()).then(dlData => {
        if (!dlData.success) { item.status = 'error'; renderQueue(); resolve(); return; }

        const interval = setInterval(async () => {
            try {
                const resp = await fetch('api/progress.php?id=' + dlData.jobId);
                const data = await resp.json();
                if (data.status === 'done') {
                    clearInterval(interval);
                    item.status = 'done';
                    notifyDone(item.title);
                    addHistory(item.title, 'success', item.format, item.type, item.url, item.info);
                    // Ajouter a la bibliotheque
                    await fetch('api/library.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'action=add_item&file=' + encodeURIComponent(data.file)
                            + '&title=' + encodeURIComponent(item.info.title)
                            + '&type=' + item.type + '&format=' + item.format
                            + '&folder=' + encodeURIComponent(item.folder)
                            + '&thumbnail=' + encodeURIComponent(item.info.thumbnail)
                            + '&channel=' + encodeURIComponent(item.info.channel)
                            + '&duration=' + encodeURIComponent(item.info.duration)
                            + '&cover=' + encodeURIComponent(data.cover || '')
                            + '&url=' + encodeURIComponent(item.url)
                    });
                    incrementDownloadCount();
                    loadSystemInfo();
                    renderQueue();
                    resolve();
                } else if (data.status === 'error') {
                    clearInterval(interval);
                    item.status = 'error';
                    addHistory(item.title, 'error', item.format, item.type, item.url, item.info);
                    renderQueue();
                    resolve();
                }
            } catch (err) {}
        }, 500);
    }).catch(() => { item.status = 'error'; renderQueue(); resolve(); });
}

// ========== HISTORY ==========
async function addHistory(title, status, format, type, url, info) {
    const extra = info || {};
    await fetch('api/history.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=add&title=' + encodeURIComponent(title) + '&status=' + status
            + '&format=' + format + '&type=' + type + '&url=' + encodeURIComponent(url || '')
            + '&channel=' + encodeURIComponent(extra.channel || '')
            + '&views=' + encodeURIComponent(extra.views_display || '')
            + '&year=' + encodeURIComponent(extra.year || '')
            + '&likes=' + encodeURIComponent(extra.likes || '0')
            + '&dislikes=' + encodeURIComponent(extra.dislikes || '0')
    }).catch(() => {});
}

function formatLikes(n) {
    n = parseInt(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return '' + n;
}

async function loadHistory() {
    try {
        const resp = await fetch('api/history.php?action=list');
        const data = await resp.json();
        if (!data.success) return;

        const container = document.getElementById('historyList');
        if (data.history.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">Aucun historique.</p>';
            return;
        }

        container.innerHTML = data.history.slice(0, 50).map(h => {
            const icon = h.status === 'success' ? '&#10003;' : '&#10007;';
            const cls = h.status === 'success' ? 'success' : 'error';
            const views = h.views ? h.views : '';
            const year = h.year ? h.year : '';
            const likes = h.likes ? formatLikes(h.likes) : '';
            const dislikes = h.dislikes ? formatLikes(h.dislikes) : '';
            let meta = '';
            if (views) meta += views;
            if (year) meta += (meta ? ' · ' : '') + year;
            if (likes) meta += (meta ? ' · ' : '') + '&#9650; ' + likes;
            if (dislikes && parseInt(h.dislikes) > 0) meta += ' · &#9660; ' + dislikes;
            return '<div class="history-item">'
                + '<span class="hi-icon ' + cls + '">' + icon + '</span>'
                + '<div class="hi-body">'
                + '<span class="hi-title">' + h.title + '</span>'
                + (meta ? '<span class="hi-stats">' + meta + '</span>' : '')
                + '</div>'
                + '<span class="hi-format">' + (h.format || '').toUpperCase() + '</span>'
                + '<span class="hi-date">' + (h.date || '').split(' ')[0] + '</span>'
                + '</div>';
        }).join('');
    } catch (err) {}
}

function toggleHistory() {
    const panel = document.getElementById('historyPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') loadHistory();
}

// ========== SYSTEM INFO / YTDLP UPDATE ==========
async function loadSystemInfo() {
    try {
        const resp = await fetch('api/system.php?action=info');
        const data = await resp.json();
        if (data.success) {
            document.getElementById('ytdlpVersion').textContent = 'yt-dlp : v' + data.ytdlp_version;
            document.getElementById('statDisk').textContent = data.disk_display;
        }
    } catch (err) {}
}

async function updateYtdlp() {
    const status = document.getElementById('updateStatus');
    status.textContent = 'Mise a jour...';
    status.style.color = 'var(--text-secondary)';

    try {
        const resp = await fetch('api/system.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=update'
        });
        const data = await resp.json();
        if (data.success) {
            status.textContent = 'OK ! v' + data.version;
            status.style.color = 'var(--success)';
            document.getElementById('ytdlpVersion').textContent = 'yt-dlp : v' + data.version;
        } else {
            status.textContent = 'Echec';
            status.style.color = 'var(--error)';
        }
    } catch (err) {
        status.textContent = 'Erreur reseau';
        status.style.color = 'var(--error)';
    }
}

// ========== STATS ==========
function computeDurationStats() {
    if (!libraryData.items) return;
    let totalSeconds = 0;
    libraryData.items.forEach(item => {
        if (item.duration) {
            const parts = item.duration.split(':').map(Number);
            if (parts.length === 3) totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) totalSeconds += parts[0] * 60 + parts[1];
        }
    });
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    document.getElementById('statDuration').textContent = h > 0 ? h + 'h ' + m + 'm' : m + ' min';
}

// ========== DRAG & DROP ==========
let dragItemId = null;

function enableDragDrop() {
    document.querySelectorAll('.item-card').forEach(card => {
        card.setAttribute('draggable', true);
        card.addEventListener('dragstart', (e) => {
            dragItemId = card.dataset.id;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            dragItemId = null;
        });
    });

    document.querySelectorAll('.folder-chip[data-folder-id]').forEach(chip => {
        chip.addEventListener('dragover', (e) => { e.preventDefault(); chip.classList.add('drag-over'); });
        chip.addEventListener('dragleave', () => { chip.classList.remove('drag-over'); });
        chip.addEventListener('drop', async (e) => {
            e.preventDefault();
            chip.classList.remove('drag-over');
            if (dragItemId) {
                const folderId = chip.dataset.folderId;
                const draggedCard = document.querySelector('.item-card[data-id="' + dragItemId + '"]');

                // Animation : la carte retrecit et disparait
                if (draggedCard) {
                    draggedCard.classList.add('drop-fly');
                }

                // Animation : le dossier pulse pour confirmer
                chip.classList.add('drop-success');

                await fetch('api/library.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'action=move_item&item_id=' + dragItemId + '&folder_id=' + encodeURIComponent(folderId)
                });

                // Attendre la fin de l'animation avant de recharger
                setTimeout(() => {
                    chip.classList.remove('drop-success');
                    loadLibrary();
                }, 500);
            }
        });
    });
}

// ========== INIT ==========
// Charger le profil depuis le cookie OU localStorage
const savedUser = getCookie('yt_user') || localStorage.getItem('yt_user');
if (savedUser) {
    // Re-setter le cookie au cas ou il aurait expire
    document.cookie = 'yt_user=' + encodeURIComponent(savedUser) + ';max-age=' + (86400*3650) + ';path=/';
    loadProfile(savedUser);
} else {
    loadProfilesList();
}

// Load folders for download tab on start
loadLibrary();
loadSystemInfo();

// Restaurer l'onglet actif
const savedTab = localStorage.getItem('yt_tab');
if (savedTab && savedTab !== 'download') {
    switchTab(savedTab);
}
