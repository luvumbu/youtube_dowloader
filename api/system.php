<?php
/**
 * API - Informations systeme et mise a jour yt-dlp
 *
 * GET  /api/system.php?action=info    → version yt-dlp + espace disque
 * POST /api/system.php action=update  → met a jour yt-dlp via pip
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../classes/Config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'info';

switch ($action) {
    case 'info':
        // Version yt-dlp
        $cmd = '"' . Config::YTDLP_PATH . '" --version 2>&1';
        $version = trim(shell_exec($cmd) ?? 'inconnue');

        // Espace disque du dossier downloads
        $downloadsDir = Config::getDownloadsDir();
        $totalSize = 0;
        $files = glob($downloadsDir . DIRECTORY_SEPARATOR . '*.*');
        if ($files) {
            foreach ($files as $f) {
                $totalSize += filesize($f);
            }
        }

        echo json_encode([
            'success'      => true,
            'ytdlp_version' => $version,
            'disk_usage'   => $totalSize,
            'disk_display' => formatSize($totalSize),
            'disk_free'    => disk_free_space($downloadsDir)
        ]);
        break;

    case 'update':
        // Methode 1 : yt-dlp --update
        $cmd = '"' . Config::YTDLP_PATH . '" --update 2>&1';
        $output = shell_exec($cmd);
        $success = strpos($output, 'Updated') !== false
            || strpos($output, 'up to date') !== false
            || strpos($output, 'is up-to-date') !== false;

        // Methode 2 : python -m pip (fallback)
        if (!$success && defined('Config::PYTHON_PATH') && file_exists(Config::PYTHON_PATH)) {
            $cmd = '"' . Config::PYTHON_PATH . '" -m pip install -U yt-dlp 2>&1';
            $output = shell_exec($cmd);
            $success = strpos($output, 'Successfully') !== false || strpos($output, 'already satisfied') !== false;
        }

        // Nouvelle version
        $versionCmd = '"' . Config::YTDLP_PATH . '" --version 2>&1';
        $newVersion = trim(shell_exec($versionCmd) ?? '');

        echo json_encode([
            'success' => $success,
            'output'  => $output,
            'version' => $newVersion
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Action inconnue.']);
}

function formatSize(int $bytes): string {
    if ($bytes >= 1073741824) return round($bytes / 1073741824, 1) . ' Go';
    if ($bytes >= 1048576) return round($bytes / 1048576, 1) . ' Mo';
    if ($bytes >= 1024) return round($bytes / 1024, 1) . ' Ko';
    return $bytes . ' o';
}
