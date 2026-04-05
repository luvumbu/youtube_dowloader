<?php
require_once __DIR__ . '/Config.php';

/**
 * YouTubeDownloader - Gere le telechargement de videos/audio YouTube
 *
 * Cette classe encapsule toute la logique de telechargement :
 * - Recuperation des infos d'une video (titre, miniature, duree)
 * - Lancement du telechargement en arriere-plan via worker.php
 * - Nettoyage des fichiers temporaires
 */
class YouTubeDownloader
{
    private string $downloadsDir;

    public function __construct()
    {
        $this->downloadsDir = Config::getDownloadsDir();
    }

    /**
     * Recupere les informations d'une video YouTube
     * Utilise yt-dlp --dump-json pour obtenir toutes les metadonnees
     *
     * @param string $url URL YouTube valide
     * @return array ['success' => bool, 'title' => ..., 'thumbnail' => ..., etc.]
     */
    public function getVideoInfo(string $url): array
    {
        if (!Config::isValidYoutubeUrl($url)) {
            return ['success' => false, 'error' => 'URL YouTube invalide.'];
        }

        $cmd = '"' . Config::YTDLP_PATH . '" --dump-json --no-playlist --no-warnings '
            . escapeshellarg($url) . ' 2>&1';

        $output = shell_exec($cmd);
        $data = json_decode($output, true);

        if (!$data || empty($data['title'])) {
            return ['success' => false, 'error' => 'Impossible de recuperer la video.'];
        }

        // Formater les vues
        $views = $data['view_count'] ?? 0;
        if ($views >= 1000000000) $viewsDisplay = round($views / 1000000000, 1) . ' Md';
        elseif ($views >= 1000000) $viewsDisplay = round($views / 1000000, 1) . ' M';
        elseif ($views >= 1000) $viewsDisplay = round($views / 1000, 1) . ' k';
        else $viewsDisplay = (string) $views;

        // Annee de diffusion
        $uploadDate = $data['upload_date'] ?? '';
        $year = $uploadDate ? substr($uploadDate, 0, 4) : '';

        return [
            'success'       => true,
            'title'         => $data['title'],
            'thumbnail'     => $data['thumbnail'] ?? '',
            'duration'      => $data['duration_string'] ?? '',
            'channel'       => $data['channel'] ?? '',
            'views'         => $views,
            'views_display' => $viewsDisplay . ' vues',
            'year'          => $year,
            'likes'         => $data['like_count'] ?? 0,
            'dislikes'      => $data['dislike_count'] ?? 0
        ];
    }

    /**
     * Lance un telechargement en arriere-plan
     * Cree un job ID unique, initialise le fichier log,
     * et lance worker.php dans un processus separe.
     *
     * @param string $url     URL YouTube
     * @param string $type    'audio' ou 'video'
     * @param string $format  Format de sortie (mp3, mp4, etc.)
     * @param string $quality Qualite (0, 5, 9 pour audio / best, 720, etc. pour video)
     * @param bool   $cover   Sauvegarder la couverture separement
     * @return array ['success' => bool, 'jobId' => string]
     */
    public function startDownload(string $url, string $type, string $format, string $quality, bool $cover): array
    {
        if (!Config::isValidYoutubeUrl($url)) {
            return ['success' => false, 'error' => 'URL YouTube invalide.'];
        }

        // Valider les parametres
        $params = Config::sanitizeDownloadParams($type, $format, $quality);

        // Nettoyer les vieux fichiers
        $this->cleanOldFiles();

        // Generer un ID unique pour ce job
        $jobId = uniqid('yt_');
        $logFile = $this->downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.log';

        // Creer le fichier log immediatement
        file_put_contents($logFile, "Demarrage...\n");

        // Lancer le worker en arriere-plan
        $coverFlag = $cover ? '1' : '0';
        $cmd = 'start /B "" "' . Config::PHP_PATH . '" "' . Config::getWorkerPath() . '" '
            . $jobId . ' '
            . escapeshellarg($url) . ' '
            . $coverFlag . ' '
            . $params['type'] . ' '
            . $params['format'] . ' '
            . $params['quality'];

        pclose(popen($cmd, 'r'));

        return ['success' => true, 'jobId' => $jobId];
    }

    /**
     * Supprime les fichiers de plus de TEMP_FILE_LIFETIME secondes
     * dans le dossier downloads (mp3, mp4, log, done, etc.)
     */
    public function cleanOldFiles(): void
    {
        $files = glob($this->downloadsDir . DIRECTORY_SEPARATOR . '*.*');
        if (!$files) return;

        $expiry = time() - Config::TEMP_FILE_LIFETIME;
        foreach ($files as $file) {
            if (filemtime($file) < $expiry) {
                @unlink($file);
            }
        }
    }

    /**
     * Recupere le titre d'une video YouTube (version legere, sans dump-json)
     *
     * @param string $url URL YouTube
     * @return string Titre de la video ou chaine vide
     */
    public static function getTitle(string $url): string
    {
        $cmd = '"' . Config::YTDLP_PATH . '" --get-title --no-playlist --no-warnings '
            . escapeshellarg($url) . ' 2>&1';
        return trim(shell_exec($cmd) ?? '');
    }

    /**
     * Genere un nom de fichier securise a partir d'un titre
     * Supprime les caracteres interdits sous Windows
     *
     * @param string $title Titre brut
     * @return string Titre nettoye, max 200 caracteres
     */
    public static function sanitizeFilename(string $title): string
    {
        $safe = preg_replace('/[<>:"\/\\\\|?*]/', '', $title);
        return trim(substr($safe, 0, 200));
    }

    /**
     * Construit la commande yt-dlp selon le type (audio/video)
     *
     * @param string $outputTemplate Template de sortie yt-dlp
     * @param string $type           'audio' ou 'video'
     * @param string $format         Format de sortie
     * @param string $quality        Qualite
     * @return string Commande complete prete a executer
     */
    public static function buildCommand(string $outputTemplate, string $type, string $format, string $quality): string
    {
        $cmd = '"' . Config::YTDLP_PATH . '"'
            . ' --ffmpeg-location "' . Config::FFMPEG_PATH . '"'
            . ' --newline --progress-delta 1'
            . ' -o "' . $outputTemplate . '"'
            . ' --no-playlist';

        if ($type === 'audio') {
            $cmd .= ' -x --audio-format ' . $format
                . ' --audio-quality ' . $quality
                . ' --embed-thumbnail --convert-thumbnails jpg';
        } else {
            // Determiner le format de selection video
            if ($quality === 'best') {
                $formatSpec = 'bestvideo+bestaudio/best';
            } else {
                $formatSpec = 'bestvideo[height<=' . $quality . ']+bestaudio/best[height<=' . $quality . ']';
            }
            $cmd .= ' -f "' . $formatSpec . '"'
                . ' --merge-output-format ' . $format;

            // Convertir l'audio en AAC pour MP4 (compatibilite lecteurs)
            if ($format === 'mp4') {
                $cmd .= ' --postprocessor-args "Merger+ffmpeg_o:-c:v copy -c:a aac"';
            }

            $cmd .= ' --embed-thumbnail';
        }

        return $cmd;
    }
}
