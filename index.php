<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>YouTube Downloader</title>
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

<div class="theme-toggle" id="themeIcon" onclick="toggleTheme()" title="Changer le theme">&#9728;</div>

<div class="app">

    <div class="welcome-bar" id="welcomeBar" style="display:none;">
        <div class="user-chip">
            <span class="user-dot"></span>
            <span id="welcomeName"></span>
        </div>
    </div>

    <div class="tabs">
        <div class="tab active" onclick="switchTab('download')">Telecharger</div>
        <div class="tab" onclick="switchTab('search')">Recherche</div>
        <div class="tab" onclick="switchTab('library')">Bibliotheque</div>
        <div class="tab" onclick="switchTab('profile')">Profil</div>
    </div>

    <!-- TAB DOWNLOAD -->
    <div class="tab-content active" id="tab-download">
        <div class="dl-container">
            <h1>YouTube Downloader</h1>
            <p class="subtitle">Colle une URL YouTube pour telecharger en audio ou video</p>

            <form id="dlForm">
                <input type="text" id="url" name="url" placeholder="https://www.youtube.com/watch?v=..." required>

                <div class="type-toggle">
                    <input type="radio" name="type" id="typeAudio" value="audio" checked>
                    <label for="typeAudio">Audio</label>
                    <input type="radio" name="type" id="typeVideo" value="video">
                    <label for="typeVideo">Video</label>
                </div>

                <div class="options-row">
                    <select id="format"></select>
                    <select id="quality"></select>
                </div>

                <div class="options-row">
                    <select id="targetFolder">
                        <option value="">Aucun dossier</option>
                    </select>
                </div>

                <label class="checkbox-label">
                    <input type="checkbox" id="saveCover"> Telecharger aussi la couverture (image)
                </label>

                <button type="submit" id="btn">Telecharger</button>
            </form>

            <div class="video-card" id="videoCard">
                <img id="thumb" src="" alt="">
                <div class="video-info">
                    <div class="title" id="videoTitle"></div>
                    <div class="meta" id="videoMeta"></div>
                </div>
            </div>

            <div class="progress-zone" id="progressZone">
                <div class="progress-bar-bg">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <div class="progress-text" id="progressText">Demarrage...</div>
            </div>

            <div id="result"></div>

            <div class="queue-section" id="queueSection" style="display:none;">
                <h3>File d'attente <span class="queue-count" id="queueCount">0</span></h3>
                <div id="queueList"></div>
            </div>

            <button class="btn-add-queue" onclick="addToQueue()">+ Ajouter a la file d'attente</button>
        </div>
    </div>

    <!-- TAB SEARCH -->
    <div class="tab-content" id="tab-search">
        <div class="search-container">
            <h1>Recherche YouTube</h1>
            <p class="subtitle">Cherche une video directement sans quitter l'application</p>
            <div class="search-box">
                <input type="search" id="searchInput" placeholder="Rechercher sur YouTube...">
                <button onclick="searchYouTube()">Rechercher</button>
            </div>
            <div id="searchResults" class="search-results"></div>
        </div>
    </div>

    <!-- TAB PROFILE -->
    <div class="tab-content" id="tab-profile">
        <div class="profile-container">
            <div id="loginView">
                <div class="login-box">
                    <h2>Mon Profil</h2>
                    <p>Choisis ton profil ou cree-en un nouveau</p>

                    <div id="profilesList" class="profiles-list"></div>

                    <div style="margin-top:15px; border-top:1px solid #333; padding-top:15px;">
                        <p style="color:#666; font-size:13px; margin-bottom:10px;">Nouveau profil</p>
                        <input type="text" id="loginName" placeholder="Ton pseudo...">
                        <button onclick="loginUser()">Creer</button>
                    </div>
                </div>
            </div>

            <div id="profileView" style="display:none;">
                <div class="profile-card">
                    <div class="profile-avatar" id="profileAvatar"></div>
                    <div class="profile-name" id="profileName"></div>
                    <div class="profile-since" id="profileSince"></div>

                    <div class="profile-stats">
                        <div class="profile-stat">
                            <div class="stat-num" id="profileDlCount">0</div>
                            <div class="stat-label">Telechargements</div>
                        </div>
                    </div>
                </div>

                <div class="profile-card">
                    <h2>Preferences par defaut</h2>

                    <div class="pref-section">
                        <label>Type prefere</label>
                        <div class="type-toggle">
                            <input type="radio" name="prefType" id="prefAudio" value="audio" checked>
                            <label for="prefAudio">Audio</label>
                            <input type="radio" name="prefType" id="prefVideo" value="video">
                            <label for="prefVideo">Video</label>
                        </div>
                    </div>

                    <div class="pref-section">
                        <label>Format audio par defaut</label>
                        <div class="pref-row">
                            <select id="prefFormatAudio">
                                <option value="mp3">MP3</option>
                                <option value="flac">FLAC</option>
                                <option value="wav">WAV</option>
                                <option value="aac">AAC</option>
                                <option value="ogg">OGG</option>
                            </select>
                            <select id="prefQualityAudio">
                                <option value="0">Meilleure qualite</option>
                                <option value="5">Qualite moyenne</option>
                                <option value="9">Qualite basse</option>
                            </select>
                        </div>
                    </div>

                    <div class="pref-section">
                        <label>Format video par defaut</label>
                        <div class="pref-row">
                            <select id="prefFormatVideo">
                                <option value="mp4">MP4</option>
                                <option value="mkv">MKV</option>
                                <option value="webm">WEBM</option>
                            </select>
                            <select id="prefQualityVideo">
                                <option value="best">Meilleure qualite</option>
                                <option value="1080">1080p</option>
                                <option value="720">720p</option>
                                <option value="480">480p</option>
                                <option value="360">360p</option>
                            </select>
                        </div>
                    </div>

                    <div class="pref-section">
                        <label class="checkbox-label">
                            <input type="checkbox" id="prefCover"> Toujours telecharger la couverture
                        </label>
                    </div>

                    <button class="btn-save-prefs" onclick="savePrefs()">Sauvegarder les preferences</button>
                </div>

                <div style="text-align:center;">
                    <button class="btn-logout" onclick="logoutUser()">Se deconnecter</button>
                </div>
            </div>
        </div>
    </div>

    <!-- TAB LIBRARY -->
    <div class="tab-content" id="tab-library">
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card"><div class="sc-num" id="statTotal">0</div><div class="sc-label">Total</div></div>
            <div class="stat-card"><div class="sc-num" id="statAudio">0</div><div class="sc-label">Audio</div></div>
            <div class="stat-card"><div class="sc-num" id="statVideo">0</div><div class="sc-label">Video</div></div>
            <div class="stat-card"><div class="sc-num" id="statDisk">-</div><div class="sc-label">Espace disque</div></div>
            <div class="stat-card"><div class="sc-num" id="statDuration">-</div><div class="sc-label">Duree totale</div></div>
        </div>

        <div class="update-bar" id="updateBar">
            <span class="ub-version" id="ytdlpVersion">yt-dlp : chargement...</span>
            <button class="btn-small" onclick="updateYtdlp()">Mettre a jour yt-dlp</button>
            <span class="ub-status" id="updateStatus"></span>
        </div>

        <div class="lib-header">
            <div class="lib-actions">
                <button class="btn-small btn-create" onclick="showCreateFolder()">+ Nouveau dossier</button>
                <button class="btn-small" style="background:var(--border);color:var(--text-faint)" onclick="toggleHistory()">Historique</button>
            </div>
        </div>

        <div id="historyPanel" style="display:none;">
            <div class="profile-card">
                <h2>Historique des telechargements</h2>
                <div class="history-list" id="historyList"></div>
            </div>
        </div>

        <div class="folders" id="foldersBar">
            <div class="folder-chip active" onclick="filterFolder('')">Tout</div>
        </div>

        <div class="select-bar" id="selectBar" style="display:none;">
            <button class="btn-select" onclick="selectAll()">Tout selectionner</button>
            <button class="btn-select" onclick="deselectAll()">Tout deselectionner</button>
            <span class="select-count" id="selectCount">0 selectionne(s)</span>
        </div>

        <div id="bigPlayBtn" style="display:none; text-align:center; margin-bottom:20px;">
            <button class="big-play" onclick="playSelected()">&#9654; Lire la selection</button>
        </div>

        <div class="items-grid" id="itemsGrid"></div>
        <div class="empty-lib" id="emptyLib">Aucun telechargement pour le moment.</div>
    </div>

</div>

<!-- Player bar fixe -->
<div class="player-bar" id="playerBar">
    <div class="player-seek" id="playerSeek" onclick="seekPlayer(event)">
        <div class="player-seek-fill" id="playerSeekFill"></div>
    </div>
    <div class="player-main">
        <img class="player-thumb" id="playerThumb" src="" alt="">
        <div class="player-info">
            <div class="p-title" id="playerTitle">-</div>
            <div class="p-artist" id="playerArtist">-</div>
        </div>
        <div class="player-time" id="playerTime">0:00 / 0:00</div>
        <div class="player-controls">
            <button onclick="playerSetMode('shuffle')" id="btnShuffle" title="Aleatoire">&#9776;</button>
            <button onclick="playerPrev()" title="Precedent">&#9198;</button>
            <button class="btn-play" onclick="playerToggle()" id="btnPlayPause" title="Lecture">&#9654;</button>
            <button onclick="playerNext()" title="Suivant">&#9197;</button>
            <button onclick="playerSetMode('loop')" id="btnLoop" title="Boucle">&#8634;</button>
            <button onclick="playerSetMode('loopOne')" id="btnLoopOne" title="Boucle 1">&#8635;</button>
        </div>
        <div class="player-volume">
            <button onclick="playerMute()">&#128266;</button>
            <input type="range" min="0" max="100" value="80" oninput="playerSetVolume(this.value)" id="volumeSlider">
        </div>
        <button class="player-close" onclick="playerClose()" title="Fermer">&#10005;</button>
    </div>
</div>

<audio id="audioEl"></audio>

<div class="video-player-overlay" id="videoOverlay">
    <button class="vp-close" onclick="closeVideoPlayer()">&#10005;</button>
    <video id="videoEl" controls></video>
    <div class="vp-title" id="videoPlayerTitle"></div>
</div>

<!-- Modals -->
<div class="modal-overlay" id="modalFolder">
    <div class="modal">
        <h3>Nouveau dossier</h3>
        <input type="text" id="folderName" placeholder="Nom du dossier...">
        <div class="modal-btns">
            <button class="btn-cancel" onclick="closeModal('modalFolder')">Annuler</button>
            <button onclick="createFolder()">Creer</button>
        </div>
    </div>
</div>

<div class="modal-overlay" id="modalMove">
    <div class="modal">
        <h3>Deplacer vers</h3>
        <select id="moveTarget"></select>
        <div class="modal-btns">
            <button class="btn-cancel" onclick="closeModal('modalMove')">Annuler</button>
            <button onclick="confirmMove()">Deplacer</button>
        </div>
    </div>
</div>

<script src="assets/js/app.js"></script>

</body>
</html>
