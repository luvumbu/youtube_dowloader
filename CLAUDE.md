# YouTube Downloader - Documentation Projet

## Description
Application web locale (XAMPP) permettant de telecharger des videos et audios YouTube
avec gestion de bibliotheque, profils utilisateur et lecteur multimedia integre.

## Stack technique
- **Backend** : PHP 8+ (XAMPP Apache)
- **Frontend** : HTML5, CSS3, JavaScript vanilla (pas de framework)
- **Telechargement** : yt-dlp (Python) + ffmpeg
- **Stockage** : fichiers JSON (pas de base de donnees)
- **OS** : Windows 11

## Chemins systeme importants
- **Projet** : `C:\xampp\htdocs\youtube\`
- **yt-dlp** : `C:\Users\maste\AppData\Local\Python\pythoncore-3.14-64\Scripts\yt-dlp.exe`
- **ffmpeg** : `C:\Users\maste\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin\`
- **PHP** : `C:\xampp\php\php.exe`
- **URL locale** : `http://localhost/youtube/`
- **Demarrage auto XAMPP** : raccourci dans `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`

## Architecture des fichiers

```
youtube/
├── index.php                  # Page HTML principale (structure uniquement)
├── worker.php                 # Processus arriere-plan de telechargement
│
├── classes/                   # Logique metier PHP (POO)
│   ├── Config.php             # Configuration centralisee (chemins, constantes, validation)
│   ├── YouTubeDownloader.php  # Telechargement : infos video, lancement worker, commandes yt-dlp
│   ├── ProgressTracker.php    # Suivi progression : lecture log, parsing %, detection fin
│   ├── Library.php            # Bibliotheque : CRUD items et dossiers virtuels
│   └── Profile.php            # Profils : CRUD utilisateurs et preferences
│
├── api/                       # Endpoints API (JSON)
│   ├── info.php               # POST url → {title, thumbnail, duration, channel}
│   ├── download.php           # POST url,type,format,quality,cover → {jobId}
│   ├── progress.php           # GET id → {status, percent, message, file?}
│   ├── library.php            # POST/GET action → CRUD bibliotheque
│   └── profile.php            # POST/GET action → CRUD profils
│
├── assets/
│   ├── css/
│   │   └── style.css          # Tous les styles CSS
│   ├── js/
│   │   └── app.js             # Tout le JavaScript frontend
│   └── youtube.ico            # Icone raccourci bureau
│
├── data/                      # Donnees persistantes (JSON)
│   ├── library.json           # Items telecharges + dossiers virtuels
│   └── profiles.json          # Profils utilisateur + preferences
│
├── downloads/                 # Fichiers telecharges (MP3, MP4, etc.)
│                              # Nettoyage auto des fichiers > 1h (temporaires)
│                              # Les fichiers dans library.json sont conserves
│
├── docs.html                  # Guide d'installation (interface web)
└── CLAUDE.md                  # Ce fichier
```

## Classes PHP - Detail

### Config.php
Classe statique de configuration. Tous les chemins et constantes sont ici.
- `YTDLP_PATH`, `FFMPEG_PATH`, `PHP_PATH` : chemins executables
- `AUDIO_FORMATS`, `VIDEO_FORMATS` : formats autorises
- `YOUTUBE_URL_PATTERN` : regex de validation URL
- `getDownloadsDir()`, `getDataDir()` : chemins calcules
- `sanitizeDownloadParams()` : validation et nettoyage des parametres
- `isValidYoutubeUrl()`, `isValidJobId()` : validations

### YouTubeDownloader.php
Gere tout le cycle de telechargement.
- `getVideoInfo($url)` : appelle `yt-dlp --dump-json` pour obtenir les metadonnees
- `startDownload($url, $type, $format, $quality, $cover)` : cree un job ID, lance `worker.php` en arriere-plan via `start /B`
- `buildCommand()` (statique) : construit la commande yt-dlp selon type audio/video
- `getTitle()` (statique) : recupere juste le titre (pour renommage)
- `sanitizeFilename()` (statique) : nettoie le titre pour Windows
- `cleanOldFiles()` : supprime les fichiers temporaires > 1h

### ProgressTracker.php
Suit la progression en temps reel d'un job.
- `getStatus()` : verifie dans l'ordre : .done → .mp3 → log → erreur → parse %
- `readLogTail($bytes)` : lit seulement les derniers N octets du log (performance)
- `parseProgress($log)` : extrait le % avec regex, detecte les etapes (download, extract, merge, embed)
- Gere le telechargement video en 2 passes (video puis audio) avec barre ajustee

### Library.php
CRUD de la bibliotheque stockee dans `data/library.json`.
- `list()` : retourne items + dossiers + stats, verifie que les fichiers existent
- `addItem()` : ajoute un item avec metadonnees (titre, thumbnail, channel, etc.)
- `moveItem()` : deplace un item vers un dossier virtuel
- `deleteItem()` : supprime l'item ET les fichiers associes (mp3 + cover)
- `createFolder()`, `renameFolder()`, `deleteFolder()` : gestion dossiers virtuels

### Profile.php
CRUD des profils utilisateur stockes dans `data/profiles.json`.
- `listAll()` : liste simplifiee pour l'ecran de selection
- `save_profile($username, $prefs)` : cree ou met a jour un profil
- `loadByUsername()` : charge un profil par pseudo
- `incrementDownloads()` : +1 au compteur
- `logout()` : supprime le cookie
- Pas de mot de passe, identification par pseudo uniquement
- Cookie de 10 ans + localStorage pour retenir le profil

## worker.php - Processus de telechargement

Flux d'execution :
1. Recoit les parametres en ligne de commande ($argv)
2. Construit la commande yt-dlp via `YouTubeDownloader::buildCommand()`
3. Execute avec `proc_open()` pour capturer stdout/stderr en temps reel
4. Ecrit chaque ligne dans `{jobId}.log` (lu par ProgressTracker)
5. Gere la couverture separee si demandee (conversion en JPG)
6. Trouve le fichier final (gere les noms intermediaires de yt-dlp)
7. Renomme avec le titre YouTube (`YouTubeDownloader::sanitizeFilename()`)
8. Cree `{jobId}.done` avec les noms finaux (detecte par ProgressTracker)

## API Endpoints

### POST api/info.php
Recupere les infos d'une video YouTube.
- **Body** : `url=https://youtube.com/watch?v=xxx`
- **Reponse** : `{success, title, thumbnail, duration, channel}`

### POST api/download.php
Lance un telechargement en arriere-plan.
- **Body** : `url, type(audio|video), format(mp3|mp4|...), quality(0|best|720|...), cover(0|1)`
- **Reponse** : `{success, jobId}`

### GET api/progress.php?id=yt_xxx
Suit la progression d'un telechargement (appele toutes les 500ms).
- **Reponse** : `{status(waiting|progress|done|error), percent, message, file?, cover?}`

### POST/GET api/library.php
- `action=list` : liste tout
- `action=add_item` + file, title, type, format, folder, thumbnail, channel, duration, cover
- `action=move_item` + item_id, folder_id
- `action=delete_item` + item_id
- `action=create_folder` + name
- `action=rename_folder` + folder_id, name
- `action=delete_folder` + folder_id

### POST/GET api/profile.php
- `action=list` : liste tous les profils
- `action=save` + username, pref_type, pref_format_audio, etc.
- `action=load` + username
- `action=increment` + username
- `action=logout`

## Frontend (assets/js/app.js)

### Modules dans app.js
Le JS est organise en sections commentees :
1. **STATE** : variables globales (currentFolder, playlist, playMode, etc.)
2. **TABS** : navigation entre onglets (Telecharger, Bibliotheque, Profil)
3. **FORMATS** : configuration des formats audio/video et mise a jour des selects
4. **DOWNLOAD** : soumission du formulaire, appel info → download → pollProgress
5. **LIBRARY** : chargement, rendu grille, CRUD dossiers/items
6. **PLAYER** : lecteur audio/video avec playlist, modes de lecture
7. **PROFILE** : login/logout, preferences, liste des profils
8. **INIT** : chargement initial (cookie/localStorage → profil, bibliotheque)

### Lecteur multimedia
- Barre fixe en bas pour l'audio (play/pause, prev/next, seek, volume)
- Overlay plein ecran pour la video
- Modes : normal, boucle tout, boucle 1, aleatoire
- Playlist : selection multiple puis lecture sequentielle
- Passe automatiquement au morceau suivant a la fin

### Systeme de progression
- Polling toutes les 500ms vers api/progress.php
- Affiche taille + vitesse en temps reel
- Detection de blocage : si aucun changement de message pendant 2 min → erreur
- Avertissement apres 30s sans changement

### Retry automatique
- En cas d'erreur ou de blocage, le telechargement est relance silencieusement
- Maximum 2 retries (3 tentatives au total)
- Si les 3 tentatives echouent → affiche l'erreur (video probablement protegee)
- Le retry relance un nouveau job complet (nouveau jobId via download.php)
- L'utilisateur voit "Nouvelle tentative (2/3)..." pendant le retry

## Formats supportes

### Audio
| Format | Extension | Qualites |
|--------|-----------|----------|
| MP3    | .mp3      | 0 (best), 5 (moyen), 9 (leger) |
| FLAC   | .flac     | idem |
| WAV    | .wav      | idem |
| AAC    | .aac      | idem |
| OGG    | .ogg      | idem |

### Video
| Format | Extension | Qualites |
|--------|-----------|----------|
| MP4    | .mp4      | best, 1080p, 720p, 480p, 360p |
| MKV    | .mkv      | idem |
| WEBM   | .webm     | idem |

Note : les MP4 ont l'audio converti en AAC (compatibilite lecteurs).
Les audios ont la couverture YouTube integree en JPEG (--embed-thumbnail --convert-thumbnails jpg).

## Demarrage automatique
XAMPP (Apache + MySQL) demarre automatiquement au boot Windows via un raccourci
`XAMPP AutoStart.lnk` → `C:\xampp\xampp_start.exe` dans le dossier Startup :
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`

## Configuration MariaDB
Fichier de config : `C:\xampp\mysql\bin\my.ini`
- `key_buffer` renomme en `key_buffer_size` (lignes [mysqld], [isamchk], [myisamchk])
  pour supprimer l'avertissement au demarrage de MariaDB.
