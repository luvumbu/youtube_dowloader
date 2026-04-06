<?php
/**
 * API - Suivi de progression d'un telechargement
 *
 * GET /api/progress.php?id=yt_xxxxx
 *
 * Appele par le frontend toutes les 500ms pour suivre
 * la progression en temps reel du telechargement.
 *
 * Retourne: { status, percent, message, file?, cover? }
 *   status: 'waiting' | 'progress' | 'done' | 'error'
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../classes/Config.php';
require_once __DIR__ . '/../classes/ProgressTracker.php';

$jobId = $_GET['id'] ?? '';

if (!Config::isValidJobId($jobId)) {
    echo json_encode(['status' => 'error', 'message' => 'ID invalide.']);
    exit;
}

$tracker = new ProgressTracker($jobId);
echo json_encode($tracker->getStatus());
