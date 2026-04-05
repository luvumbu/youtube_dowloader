<?php
/**
 * API - Recuperation des videos d'une playlist YouTube
 *
 * POST /api/playlist.php
 * Body: url=https://youtube.com/playlist?list=...
 *
 * Retourne: { success, title, videos: [{url, title, thumbnail, duration, channel}] }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../classes/Config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Methode non autorisee.']);
    exit;
}

$url = $_POST['url'] ?? '';

if (empty($url)) {
    echo json_encode(['success' => false, 'error' => 'URL vide.']);
    exit;
}

// Verifier si c'est une playlist
$isPlaylist = preg_match('/[?&]list=/', $url);

if (!$isPlaylist) {
    echo json_encode(['success' => false, 'error' => 'URL de playlist invalide.']);
    exit;
}

$cmd = '"' . Config::YTDLP_PATH . '" --flat-playlist --dump-json --no-warnings '
    . escapeshellarg($url) . ' 2>&1';

$output = shell_exec($cmd);
$videos = [];

if ($output) {
    foreach (explode("\n", trim($output)) as $line) {
        $data = json_decode($line, true);
        if ($data && !empty($data['title'])) {
            $videos[] = [
                'url'       => 'https://www.youtube.com/watch?v=' . ($data['id'] ?? ''),
                'title'     => $data['title'],
                'thumbnail' => $data['thumbnails'][0]['url'] ?? ($data['thumbnail'] ?? ''),
                'duration'  => $data['duration_string'] ?? (isset($data['duration']) ? gmdate('i:s', $data['duration']) : ''),
                'channel'   => $data['channel'] ?? ($data['uploader'] ?? '')
            ];
        }
    }
}

if (empty($videos)) {
    echo json_encode(['success' => false, 'error' => 'Impossible de lire la playlist.']);
    exit;
}

echo json_encode([
    'success' => true,
    'title'   => 'Playlist (' . count($videos) . ' videos)',
    'videos'  => $videos
]);
