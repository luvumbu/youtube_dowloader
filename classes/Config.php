<?php
/**
 * Config - Configuration centralisee de l'application
 *
 * Contient tous les chemins, parametres et constantes utilises
 * par les differentes classes du projet.
 */
class Config
{
    // === Chemins systeme ===

    /** Commande yt-dlp (via python -m pour eviter blocage Smart App Control) */
    const YTDLP_CMD = '"C:\\Users\\maste\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe" -m yt_dlp';

    /** Chemin vers le dossier bin de ffmpeg */
    const FFMPEG_PATH = 'C:\\Users\\maste\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin';

    /** Chemin vers l'executable Python (pour pip) */
    const PYTHON_PATH = 'C:\\Users\\maste\\AppData\\Local\\Python\\bin\\python.exe';

    /** Chemin vers l'executable PHP de XAMPP */
    const PHP_PATH = 'C:\\xampp\\php\\php.exe';

    // === Chemins de l'application ===

    /** Dossier racine du projet */
    const ROOT_DIR = __DIR__ . DIRECTORY_SEPARATOR . '..';

    // === Parametres de telechargement ===

    /** Duree de vie des fichiers temporaires en secondes (1 heure) */
    const TEMP_FILE_LIFETIME = 3600;

    /** Timeout PHP pour les telechargements en secondes (5 minutes) */
    const DOWNLOAD_TIMEOUT = 300;

    // === Formats autorises ===

    /** Formats audio acceptes */
    const AUDIO_FORMATS = ['mp3', 'flac', 'wav', 'aac', 'ogg'];

    /** Formats video acceptes */
    const VIDEO_FORMATS = ['mp4', 'mkv', 'webm'];

    /** Qualites audio acceptees (valeurs yt-dlp) */
    const AUDIO_QUALITIES = ['0', '5', '9'];

    /** Qualites video acceptees */
    const VIDEO_QUALITIES = ['best', '1080', '720', '480', '360'];

    // === Regex de validation ===

    /** Pattern pour valider une URL YouTube */
    const YOUTUBE_URL_PATTERN = '/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?list=)[\w\-]+/';

    /** Pattern pour valider un job ID */
    const JOB_ID_PATTERN = '/^yt_[a-f0-9]+$/';

    /**
     * Retourne le chemin absolu du dossier downloads
     */
    public static function getDownloadsDir(): string
    {
        return realpath(self::ROOT_DIR) . DIRECTORY_SEPARATOR . 'downloads';
    }

    /**
     * Retourne le chemin absolu du dossier data
     */
    public static function getDataDir(): string
    {
        return realpath(self::ROOT_DIR) . DIRECTORY_SEPARATOR . 'data';
    }

    /**
     * Retourne le chemin du fichier library.json
     */
    public static function getLibraryFile(): string
    {
        return self::getDataDir() . DIRECTORY_SEPARATOR . 'library.json';
    }

    /**
     * Retourne le chemin du fichier profiles.json
     */
    public static function getProfilesFile(): string
    {
        return self::getDataDir() . DIRECTORY_SEPARATOR . 'profiles.json';
    }

    /**
     * Retourne le chemin du worker.php
     */
    public static function getWorkerPath(): string
    {
        return realpath(self::ROOT_DIR) . DIRECTORY_SEPARATOR . 'worker.php';
    }

    /**
     * Valide que l'URL est bien une URL YouTube
     */
    public static function isValidYoutubeUrl(string $url): bool
    {
        return (bool) preg_match(self::YOUTUBE_URL_PATTERN, $url);
    }

    /**
     * Valide un job ID
     */
    public static function isValidJobId(string $jobId): bool
    {
        return (bool) preg_match(self::JOB_ID_PATTERN, $jobId);
    }

    /**
     * Valide et nettoie les parametres de telechargement
     * Retourne un tableau avec type, format, quality valides
     */
    public static function sanitizeDownloadParams(string $type, string $format, string $quality): array
    {
        if ($type === 'audio') {
            $format = in_array($format, self::AUDIO_FORMATS) ? $format : 'mp3';
            $quality = in_array($quality, self::AUDIO_QUALITIES) ? $quality : '0';
        } else {
            $type = 'video';
            $format = in_array($format, self::VIDEO_FORMATS) ? $format : 'mp4';
            $quality = in_array($quality, self::VIDEO_QUALITIES) ? $quality : 'best';
        }

        return compact('type', 'format', 'quality');
    }
}
