<?php
/**
 * API - Recuperation des informations d'une video YouTube
 *
 * POST /api/info.php
 * Body: url=https://youtube.com/watch?v=...
 *
 * Retourne: { success, title, thumbnail, duration, channel }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../classes/YouTubeDownloader.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Methode non autorisee.']);
    exit;
}

$downloader = new YouTubeDownloader();
echo json_encode($downloader->getVideoInfo($_POST['url'] ?? ''));
