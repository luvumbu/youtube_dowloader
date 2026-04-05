<?php
/**
 * API - Lancement d'un telechargement YouTube
 *
 * POST /api/download.php
 * Body: url, type (audio|video), format, quality, cover (0|1)
 *
 * Lance le worker.php en arriere-plan et retourne un jobId
 * pour suivre la progression via progress.php
 *
 * Retourne: { success, jobId }
 */
header('Content-Type: application/json');

require_once __DIR__ . '/../classes/YouTubeDownloader.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Methode non autorisee.']);
    exit;
}

$downloader = new YouTubeDownloader();

echo json_encode($downloader->startDownload(
    $_POST['url'] ?? '',
    $_POST['type'] ?? 'audio',
    $_POST['format'] ?? 'mp3',
    $_POST['quality'] ?? '0',
    ($_POST['cover'] ?? '0') === '1'
));
