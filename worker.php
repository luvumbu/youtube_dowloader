<?php
set_time_limit(600); // 10 minutes max

/**
 * Worker - Processus de telechargement en arriere-plan
 *
 * Ce script est lance par YouTubeDownloader::startDownload() via
 * "start /B php worker.php <jobId> <url> <cover> <type> <format> <quality>"
 *
 * Il execute yt-dlp, capture la sortie en temps reel dans un fichier .log,
 * puis renomme le fichier final avec le titre YouTube et cree un fichier .done
 * pour que ProgressTracker detecte la fin.
 *
 * Flux :
 * 1. Construire la commande yt-dlp via YouTubeDownloader::buildCommand()
 * 2. Executer avec proc_open pour capturer stdout/stderr en temps reel
 * 3. Ecrire chaque ligne dans le fichier .log (lu par ProgressTracker)
 * 4. Gerer la couverture separee si demandee
 * 5. Trouver le fichier final (peut avoir un nom different selon le format)
 * 6. Renommer avec le titre YouTube
 * 7. Ecrire le fichier .done avec les noms finaux
 */

require_once __DIR__ . '/classes/YouTubeDownloader.php';
require_once __DIR__ . '/classes/Config.php';

// === Parametres recus en ligne de commande ===
$jobId     = $argv[1] ?? '';
$url       = $argv[2] ?? '';
$saveCover = ($argv[3] ?? '0') === '1';
$type      = $argv[4] ?? 'audio';
$format    = $argv[5] ?? 'mp3';
$quality   = $argv[6] ?? '0';

if (empty($jobId) || empty($url)) exit(1);

// === Chemins ===
$downloadsDir    = Config::getDownloadsDir();
$logFile         = $downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.log';
$outputTemplate  = $downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.%(ext)s';

file_put_contents($logFile, "Demarrage...\n");

// === Construction et execution de la commande ===
$cmd = YouTubeDownloader::buildCommand($outputTemplate, $type, $format, $quality);
$cmd .= ' "' . $url . '"';

$descriptors = [
    0 => ['pipe', 'r'],  // stdin
    1 => ['pipe', 'w'],  // stdout
    2 => ['pipe', 'w'],  // stderr
];

$process = proc_open($cmd, $descriptors, $pipes);

$exitCode = -1;

if (is_resource($process)) {
    fclose($pipes[0]); // stdin pas utilise

    // Lecture non-bloquante pour capturer en temps reel
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);

    while (true) {
        $stdout = fread($pipes[1], 4096);
        $stderr = fread($pipes[2], 4096);

        if ($stdout) file_put_contents($logFile, $stdout, FILE_APPEND);
        if ($stderr) file_put_contents($logFile, $stderr, FILE_APPEND);

        $status = proc_get_status($process);
        if (!$status['running']) {
            // Repasser en bloquant pour lire le reste complet
            stream_set_blocking($pipes[1], true);
            stream_set_blocking($pipes[2], true);
            $stdout = stream_get_contents($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            if ($stdout) file_put_contents($logFile, $stdout, FILE_APPEND);
            if ($stderr) file_put_contents($logFile, $stderr, FILE_APPEND);
            $exitCode = $status['exitcode'];
            break;
        }

        usleep(200000); // 200ms entre chaque lecture
    }

    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($process);
}

// Si yt-dlp a echoue (exit code != 0), verifier si l'erreur est dans le log
if ($exitCode !== 0) {
    $logContent = file_get_contents($logFile);
    if (strpos($logContent, 'ERROR') === false) {
        // L'erreur n'a pas ete capturee, ecrire un message generique
        file_put_contents($logFile, "\nERROR: yt-dlp a echoue (code $exitCode)\n", FILE_APPEND);
    }
    file_put_contents($logFile, "\nFINISHED\n", FILE_APPEND);
    exit(1);
}

// === Trouver le fichier final ===
$finalExt   = $format;
$outputFile = $downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.' . $finalExt;

// yt-dlp peut creer des fichiers avec des suffixes (ex: jobId.f399.mp4)
if (!file_exists($outputFile)) {
    // Chercher avec le suffixe de format
    $candidates = glob($downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.*.' . $finalExt);
    if (!empty($candidates)) {
        usort($candidates, fn($a, $b) => filesize($b) - filesize($a));
        rename($candidates[0], $outputFile);
    } else {
        // Chercher n'importe quel fichier media final
        $allFiles = glob($downloadsDir . DIRECTORY_SEPARATOR . $jobId . '*.{mp4,mkv,webm,mp3,flac,wav,aac,ogg}', GLOB_BRACE);
        $allFiles = array_filter($allFiles, fn($f) => !str_contains($f, '.part'));
        if (!empty($allFiles)) {
            usort($allFiles, fn($a, $b) => filesize($b) - filesize($a));
            $found = reset($allFiles);
            $finalExt = pathinfo($found, PATHINFO_EXTENSION);
            $outputFile = $downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.' . $finalExt;
            rename($found, $outputFile);
        }
    }
}

// === Gerer la couverture separee ===
$coverFile = null;
if ($saveCover) {
    $images = glob($downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.{jpg,jpeg,png,webp}', GLOB_BRACE);
    if (!empty($images)) {
        $img = $images[0];
        $coverFile = $downloadsDir . DIRECTORY_SEPARATOR . $jobId . '_cover.jpg';

        if (in_array(pathinfo($img, PATHINFO_EXTENSION), ['jpg', 'jpeg'])) {
            rename($img, $coverFile);
        } else {
            $convertCmd = '"' . Config::FFMPEG_PATH . DIRECTORY_SEPARATOR . 'ffmpeg.exe" -i "' . $img . '" "' . $coverFile . '" -y 2>&1';
            shell_exec($convertCmd);
            @unlink($img);
        }
    }
}

// === Nettoyer les fichiers temporaires ===
foreach (glob($downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.*') as $f) {
    $ext = pathinfo($f, PATHINFO_EXTENSION);
    if ($ext !== $finalExt && $ext !== 'log') {
        if ($coverFile && $f === $coverFile) continue;
        @unlink($f);
    }
    if (in_array($ext, ['jpg', 'jpeg']) && $f !== $coverFile) {
        @unlink($f);
    }
}

// === Renommer avec le titre YouTube ===
$finalFile  = $outputFile;
$finalCover = $coverFile;

if (file_exists($outputFile)) {
    $title = YouTubeDownloader::getTitle($url);

    if (!empty($title)) {
        $safeTitle = YouTubeDownloader::sanitizeFilename($title);

        if (!empty($safeTitle)) {
            // Renommer le fichier principal
            $newFile = $downloadsDir . DIRECTORY_SEPARATOR . $safeTitle . '.' . $finalExt;
            if (!file_exists($newFile)) {
                rename($outputFile, $newFile);
                $finalFile = $newFile;
            }

            // Renommer la couverture
            if ($coverFile && file_exists($coverFile)) {
                $newCover = $downloadsDir . DIRECTORY_SEPARATOR . $safeTitle . '.jpg';
                if (!file_exists($newCover)) {
                    rename($coverFile, $newCover);
                    $finalCover = $newCover;
                }
            }
        }
    }
}

// === Ecrire le fichier .done pour ProgressTracker ===
$doneFile = $downloadsDir . DIRECTORY_SEPARATOR . $jobId . '.done';

if (file_exists($finalFile)) {
    file_put_contents($doneFile, json_encode([
        'file'  => basename($finalFile),
        'cover' => $finalCover ? basename($finalCover) : null
    ]));
} else {
    file_put_contents($logFile, "\nERROR: Fichier de sortie introuvable\n", FILE_APPEND);
}

// Marquer la fin dans le log
file_put_contents($logFile, "\nFINISHED\n", FILE_APPEND);
