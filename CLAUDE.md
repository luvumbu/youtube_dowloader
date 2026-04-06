# YouTube Downloader

## Description
Application web locale + extension navigateur permettant de telecharger des videos
et audios YouTube avec recherche integree, file d'attente, playlists, gestion de
bibliotheque, profils utilisateur et lecteur multimedia integre.

## Installation
**Double-cliquer sur `install.bat`** — installe tout automatiquement :
XAMPP, Python, yt-dlp, FFmpeg, copie le projet et configure les chemins.
Tout est hors ligne dans le dossier `program/`.

## Stack technique
- **Backend** : PHP 8+ (XAMPP Apache)
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Extension** : Chrome/Brave (Manifest V3)
- **Telechargement** : yt-dlp + ffmpeg
- **Stockage** : fichiers JSON
- **OS** : Windows 10/11

## Chemins systeme
Configures automatiquement par `install.bat` dans `classes/Config.php` :
- `YTDLP_CMD` : python.exe -m yt_dlp (via Python pour eviter blocage Smart App Control)
- `FFMPEG_PATH` : dossier bin de ffmpeg
- `PYTHON_PATH` : python.exe (optionnel)
- `PHP_PATH` : php.exe de XAMPP
- **URL** : `http://localhost/youtube/`

## Architecture des fichiers

```
youtube/
├── install.bat                # Installation automatique tout-en-un
├── index.php                  # Page HTML principale
├── worker.php                 # Processus arriere-plan de telechargement
├── docs.html                  # Guide d'installation et fonctionnalites (web)
│
├── classes/                   # Logique metier PHP
│   ├── Config.php             # Chemins et constantes (configure par install.bat)
│   ├── YouTubeDownloader.php  # Telechargement : infos (vues/likes/annee), worker, yt-dlp
│   ├── ProgressTracker.php    # Suivi progression temps reel
│   ├── Library.php            # Bibliotheque : CRUD items/dossiers, check doublons par URL
│   └── Profile.php            # Profils utilisateur et preferences
│
├── api/                       # Endpoints API (JSON, CORS active)
│   ├── info.php               # Infos video (titre, vues, likes, annee, duree)
│   ├── download.php           # Lance un telechargement
│   ├── progress.php           # Suivi progression
│   ├── library.php            # CRUD bibliotheque + check_url (anti-doublons)
│   ├── profile.php            # CRUD profils
│   ├── search.php             # Recherche YouTube
│   ├── playlist.php           # Import playlists
│   ├── history.php            # Historique (vues, likes, annee)
│   └── system.php             # Version yt-dlp, MAJ, espace disque
│
├── assets/
│   ├── css/style.css          # Styles (theme sombre YouTube / clair YouTube)
│   ├── js/app.js              # Logique frontend
│   └── youtube.ico            # Icone
│
├── extension/                 # Extension Chrome/Brave
│   ├── manifest.json          # Manifest V3
│   ├── popup.html/js          # Popup de l'extension
│   ├── content.js             # Script injecte sur YouTube
│   ├── content.css            # Styles du bouton DL et panneaux
│   ├── icon48.png             # Icone 48px
│   └── icon128.png            # Icone 128px
│
├── data/                      # Donnees JSON
│   ├── library.json           # Items + dossiers + URL (anti-doublons)
│   ├── profiles.json          # Profils
│   └── history.json           # Historique (max 200)
│
├── downloads/                 # Fichiers telecharges
│
├── program/                   # Installateurs hors ligne
│   ├── xamp.exe               # XAMPP (~150 Mo)
│   ├── python.msix            # Python 3.x (~44 Mo)
│   ├── yt-dlp.exe             # yt-dlp standalone (~18 Mo)
│   └── ffmpeg.zip             # FFmpeg (~104 Mo)
│
└── CLAUDE.md                  # Ce fichier
```

## Fonctionnalites

### Application web (localhost/youtube/)
- **Telechargement** : MP3/FLAC/WAV/AAC/OGG/MP4/MKV/WEBM avec choix qualite
- **Retry automatique** : relance silencieusement jusqu'a 2 fois
- **Recherche YouTube** : onglet dedie, 10 resultats max
- **File d'attente** : telechargements sequentiels, statut temps reel
- **Playlists** : detection auto des URLs playlist, import dans la queue
- **Bibliotheque** : dossiers virtuels, drag & drop avec animation, selection multiple
- **Gros boutons** : Tout selectionner (bleu), Deselectionner (gris), Lire (rouge), Supprimer (rouge fonce)
- **Lecteur multimedia** : audio barre fixe, video overlay, modes boucle/aleatoire
- **Profils** : preferences par utilisateur, compteur telechargements
- **Theme sombre/clair** : sombre par defaut, clair style YouTube
- **Historique** : vues, likes, dislikes, annee de diffusion
- **Stats** : total, audio, video, espace disque, duree totale
- **MAJ yt-dlp** : bouton dans la bibliotheque (yt-dlp --update + pip fallback)
- **Notifications** : navigateur, quand telechargement termine
- **Onglet persistant** : sauvegarde dans localStorage
- **Modales custom** : confirmation suppression, toast (pas d'alert/confirm natif)

### Extension navigateur (Chrome/Brave)
- **Bouton DL rouge** : a cote des likes + flottant en bas a droite, telecharge en 1 clic
- **Bouton burger** : ouvre panneau d'options (type, format, qualite, couverture)
- **Bouton cloche** : panneau de notifications (fichiers ignores, erreurs, succes)
- **Bouton DL inline** : integre dans l'interface YouTube a cote des likes
- **Preferences sauvegardees** : le bouton DL utilise les derniers reglages
- **Anti-doublons** : verifie si la video est deja en bibliotheque avant telechargement
- **Indicateur vert** : bouton vert ✓ si deja telecharge
- **Progression** : le bouton affiche 0%...50%...100% en temps reel
- **Detection playlist** : bandeau en haut avec compteur de videos
- **Filtre duree** : min/max en minutes pour filtrer les videos d'une playlist
- **Mise a jour au scroll** : detecte les nouvelles videos chargees par YouTube
- **Telechargement playlist** : sequentiel avec double barre de progression (video + total)
- **Log des doublons** : panneau cloche avec nom utilisateur et statut

## API Endpoints

### POST api/info.php
`{success, title, thumbnail, duration, channel, views, views_display, year, likes, dislikes}`

### POST api/download.php
Body: `url, type, format, quality, cover` → `{success, jobId}`

### GET api/progress.php?id=yt_xxx
`{status(waiting|progress|done|error), percent, message, file?, cover?}`

### api/library.php
`action=list|add_item|move_item|delete_item|create_folder|rename_folder|delete_folder|check_url`

### api/profile.php
`action=list|save|load|increment|logout`

### GET api/search.php?q=xxx&max=10
`{success, results: [{url, title, thumbnail, duration, channel}]}`

### POST api/playlist.php
`{success, title, videos: [...]}`

### api/history.php
`action=list|add|clear` (+ title, status, format, type, url, views, year, likes, dislikes)

### api/system.php
`action=info` → version + disque | `action=update` → MAJ yt-dlp

## Frontend (assets/js/app.js)
Sections : STATE, THEME, NOTIFICATIONS, TABS, FORMATS, DOWNLOAD (retry),
LIBRARY, PLAYER, SEARCH, PLAYLIST DETECTION, QUEUE, HISTORY,
SYSTEM INFO, STATS, DRAG & DROP, PROFILE, INIT

## Extension (extension/)
Sections : OPTIONS, NOTIFICATION LOG, BOUTONS FLOTTANTS, PANNEAU OPTIONS,
PREFERENCES, VIDEO INFO, ANTI-DOUBLONS, QUICK DOWNLOAD, PANEL DOWNLOAD,
PLAYLIST DETECTION (scrape + filtre duree + scroll), LIBRARY, INIT & NAVIGATION

## Demarrage automatique
Raccourci `xampp_start.exe` dans `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`
