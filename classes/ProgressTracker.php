<?php
require_once __DIR__ . '/Config.php';

/**
 * ProgressTracker - Suit la progression d'un telechargement en cours
 *
 * Lit le fichier log genere par worker.php et en extrait :
 * - Le statut (waiting, progress, done, error)
 * - Le pourcentage de progression
 * - Le message a afficher (vitesse, taille, etape)
 *
 * Gere aussi la detection de fin via le fichier .done
 * cree par le worker apres renommage des fichiers.
 */
class ProgressTracker
{
    private string $downloadsDir;
    private string $jobId;
    private string $logFile;
    private string $doneFile;

    /**
     * @param string $jobId Identifiant unique du job (ex: yt_69d20...)
     */
    public function __construct(string $jobId)
    {
        $this->downloadsDir = Config::getDownloadsDir();
        $this->jobId = $jobId;
        $this->logFile = $this->downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.log';
        $this->doneFile = $this->downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.done';
    }

    /**
     * Retourne le statut actuel du telechargement
     *
     * Ordre de verification :
     * 1. Fichier .done existe -> telechargement termine
     * 2. Fichier original existe encore -> finalisation en cours
     * 3. Fichier log n'existe pas -> en attente
     * 4. Log contient ERROR -> erreur
     * 5. Log contient FINISHED sans .done -> echec
     * 6. Sinon -> en cours, on parse le pourcentage
     *
     * @return array ['status' => string, 'percent' => int, 'message' => string, ...]
     */
    public function getStatus(): array
    {
        // 1. Verifier si le fichier .done existe (worker a fini et renomme)
        if (file_exists($this->doneFile)) {
            return $this->handleDone();
        }

        // 2. Fichier final encore present (avant renommage) = finalisation
        foreach (['mp3','flac','wav','aac','ogg','mp4','mkv','webm'] as $ext) {
            if (file_exists($this->downloadsDir . DIRECTORY_SEPARATOR . $this->jobId . '.' . $ext)) {
                return ['status' => 'progress', 'percent' => 98, 'message' => 'Finalisation...'];
            }
        }

        // 3. Pas de log = en attente
        if (!file_exists($this->logFile)) {
            return ['status' => 'waiting', 'percent' => 0, 'message' => 'Demarrage...'];
        }

        // Lire seulement les derniers 2 Ko du log (optimisation)
        $log = $this->readLogTail(2048);

        // 4. Verifier les erreurs
        if (preg_match('/ERROR[:\s]+(.+)/i', $log, $errMatch)) {
            @unlink($this->logFile);
            return ['status' => 'error', 'message' => trim($errMatch[1])];
        }

        // 5. FINISHED sans .done = echec
        if (strpos($log, 'FINISHED') !== false && !file_exists($this->doneFile)) {
            @unlink($this->logFile);
            return ['status' => 'error', 'message' => 'Le telechargement a echoue.'];
        }

        // 6. Parser la progression
        return $this->parseProgress($log);
    }

    /**
     * Gere le cas ou le telechargement est termine
     * Lit le fichier .done, nettoie les fichiers temporaires
     *
     * @return array Reponse avec status 'done' et chemin du fichier
     */
    private function handleDone(): array
    {
        $doneData = json_decode(file_get_contents($this->doneFile), true);

        $response = [
            'status'  => 'done',
            'file'    => 'downloads/' . $doneData['file'],
            'percent' => 100
        ];

        if (!empty($doneData['cover'])) {
            $response['cover'] = 'downloads/' . $doneData['cover'];
        }

        // Nettoyer log et done
        @unlink($this->logFile);
        @unlink($this->doneFile);

        return $response;
    }

    /**
     * Lit les N derniers octets du fichier log
     * Permet de ne pas charger tout le log en memoire
     *
     * @param int $bytes Nombre d'octets a lire depuis la fin
     * @return string Contenu du tail
     */
    private function readLogTail(int $bytes): string
    {
        $fileSize = filesize($this->logFile);
        $readSize = min($fileSize, $bytes);
        $fp = fopen($this->logFile, 'r');

        if ($fileSize > $readSize) {
            fseek($fp, $fileSize - $readSize);
        }

        $tail = fread($fp, $readSize);
        fclose($fp);
        return $tail;
    }

    /**
     * Parse le contenu du log pour en extraire la progression
     *
     * Detecte les etapes suivantes :
     * - Connexion a YouTube (Downloading webpage)
     * - Telechargement avec % / taille / vitesse
     * - Conversion audio (ExtractAudio)
     * - Fusion audio+video (Merger)
     * - Ajout couverture (EmbedThumbnail)
     * - Suppression fichiers temporaires (Deleting original)
     *
     * Pour les videos, detecte aussi le telechargement en 2 passes
     * (video puis audio) et ajuste la barre en consequence.
     *
     * @param string $log Contenu du tail du log
     * @return array ['status' => 'progress', 'percent' => int, 'message' => string]
     */
    private function parseProgress(string $log): array
    {
        $percent = 0;
        $message = 'Preparation...';

        // Etape: connexion
        if (strpos($log, 'Downloading webpage') !== false) {
            $percent = 5;
            $message = 'Connexion a YouTube...';
        }

        // Etape: debut telechargement
        if (strpos($log, 'Downloading') !== false && strpos($log, 'format') !== false) {
            $percent = 8;
            $message = 'Telechargement en cours...';
        }

        // Detection 2e passe (video: d'abord video, puis audio)
        $dlCount = substr_count($log, '[download] Destination:');
        $isSecondPass = ($dlCount >= 2);

        // Pourcentage de telechargement avec taille et vitesse
        if (preg_match_all('/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\S+)\s+at\s+(\S+)/', $log, $matches)) {
            $lastPercent = floatval(end($matches[1]));
            $totalSize = end($matches[2]);
            $speed = end($matches[3]);

            if ($isSecondPass) {
                // 2e passe (audio): mapper sur 55-90%
                $percent = 55 + ($lastPercent * 0.35);
                $message = 'Audio : ' . round($lastPercent) . '% de ' . $totalSize . ' a ' . $speed;
            } else if ($dlCount <= 1) {
                // 1re passe ou passe unique: mapper sur 10-90%
                $percent = 10 + ($lastPercent * 0.8);
                $message = 'Telechargement : ' . round($lastPercent) . '% de ' . $totalSize . ' a ' . $speed;
            } else {
                $percent = 10 + ($lastPercent * 0.45);
                $message = 'Video : ' . round($lastPercent) . '% de ' . $totalSize . ' a ' . $speed;
            }
        }

        // Etapes de post-traitement
        if (strpos($log, '[ExtractAudio]') !== false) {
            $percent = 92;
            $message = 'Conversion audio...';
        }

        if (strpos($log, '[Merger]') !== false) {
            $percent = 92;
            $message = 'Fusion audio + video...';
        }

        if (strpos($log, '[EmbedThumbnail]') !== false) {
            $percent = 95;
            $message = 'Ajout de la couverture...';
        }

        if (strpos($log, 'Deleting original') !== false) {
            $percent = 97;
            $message = 'Finalisation...';
        }

        return [
            'status'  => 'progress',
            'percent' => round($percent),
            'message' => $message
        ];
    }
}
