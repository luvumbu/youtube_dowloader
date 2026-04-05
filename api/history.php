<?php
/**
 * API - Historique des telechargements
 *
 * GET  /api/history.php?action=list
 * POST /api/history.php action=add&title=...&status=success|error&format=mp3&type=audio
 * POST /api/history.php action=clear
 */
header('Content-Type: application/json');

require_once __DIR__ . '/../classes/Config.php';

$historyFile = Config::getDataDir() . DIRECTORY_SEPARATOR . 'history.json';

function loadHistory(string $file): array {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveHistory(string $file, array $data): void {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

switch ($action) {
    case 'list':
        $history = loadHistory($historyFile);
        echo json_encode(['success' => true, 'history' => array_slice($history, 0, 100)]);
        break;

    case 'add':
        $history = loadHistory($historyFile);
        array_unshift($history, [
            'title'  => $_POST['title'] ?? '',
            'status' => $_POST['status'] ?? 'success',
            'format' => $_POST['format'] ?? '',
            'type'   => $_POST['type'] ?? '',
            'url'    => $_POST['url'] ?? '',
            'date'   => date('Y-m-d H:i:s')
        ]);
        // Garder max 200 entrees
        $history = array_slice($history, 0, 200);
        saveHistory($historyFile, $history);
        echo json_encode(['success' => true]);
        break;

    case 'clear':
        saveHistory($historyFile, []);
        echo json_encode(['success' => true]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Action inconnue.']);
}
