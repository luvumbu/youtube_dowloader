<?php
/**
 * API - Recherche YouTube via yt-dlp
 *
 * GET /api/search.php?q=query&max=10
 * Retourne: { success, results: [{url, title, thumbnail, duration, channel}] }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../classes/Config.php';

$query = trim($_GET['q'] ?? '');
$max = min(intval($_GET['max'] ?? 10), 20);

if (empty($query)) {
    echo json_encode(['success' => false, 'error' => 'Requete vide.']);
    exit;
}

$cmd = '"' . Config::YTDLP_PATH . '" '
    . '--flat-playlist --dump-json --no-warnings --default-search "ytsearch' . $max . '" '
    . escapeshellarg($query) . ' 2>&1';

$output = shell_exec($cmd);
$results = [];

if ($output) {
    foreach (explode("\n", trim($output)) as $line) {
        $data = json_decode($line, true);
        if ($data && !empty($data['title'])) {
            $results[] = [
                'url'       => 'https://www.youtube.com/watch?v=' . ($data['id'] ?? ''),
                'title'     => $data['title'],
                'thumbnail' => $data['thumbnails'][0]['url'] ?? ($data['thumbnail'] ?? ''),
                'duration'  => $data['duration_string'] ?? gmdate('i:s', $data['duration'] ?? 0),
                'channel'   => $data['channel'] ?? ($data['uploader'] ?? '')
            ];
        }
    }
}

echo json_encode(['success' => true, 'results' => $results]);
