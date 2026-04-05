<?php
/**
 * API - Gestion des profils utilisateur
 *
 * Actions disponibles :
 *   list      - Lister tous les profils
 *   save      - Creer ou mettre a jour un profil
 *   load      - Charger un profil par pseudo
 *   increment - Incrementer le compteur de telechargements
 *   logout    - Supprimer le cookie de session
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../classes/Profile.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$profile = new Profile();

switch ($action) {
    case 'list':
        echo json_encode($profile->listAll());
        break;

    case 'save':
        echo json_encode($profile->save_profile($_POST['username'] ?? '', $_POST));
        break;

    case 'load':
        $username = $_GET['username'] ?? $_POST['username'] ?? '';
        echo json_encode($profile->loadByUsername($username));
        break;

    case 'increment':
        echo json_encode($profile->incrementDownloads($_POST['username'] ?? ''));
        break;

    case 'logout':
        echo json_encode($profile->logout());
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Action inconnue.']);
}
