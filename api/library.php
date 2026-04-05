<?php
/**
 * API - Gestion de la bibliotheque
 *
 * Actions disponibles (POST action=xxx ou GET action=xxx) :
 *   list          - Lister tous les items et dossiers
 *   add_item      - Ajouter un item (apres telechargement)
 *   move_item     - Deplacer un item dans un dossier
 *   delete_item   - Supprimer un item et son fichier
 *   create_folder - Creer un dossier virtuel
 *   rename_folder - Renommer un dossier
 *   delete_folder - Supprimer un dossier (items -> racine)
 */
header('Content-Type: application/json');

require_once __DIR__ . '/../classes/Library.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$lib = new Library();

switch ($action) {
    case 'list':
        echo json_encode($lib->list());
        break;

    case 'add_item':
        echo json_encode($lib->addItem($_POST));
        break;

    case 'move_item':
        echo json_encode($lib->moveItem($_POST['item_id'] ?? '', $_POST['folder_id'] ?? ''));
        break;

    case 'delete_item':
        echo json_encode($lib->deleteItem($_POST['item_id'] ?? ''));
        break;

    case 'create_folder':
        echo json_encode($lib->createFolder($_POST['name'] ?? ''));
        break;

    case 'rename_folder':
        echo json_encode($lib->renameFolder($_POST['folder_id'] ?? '', $_POST['name'] ?? ''));
        break;

    case 'delete_folder':
        echo json_encode($lib->deleteFolder($_POST['folder_id'] ?? ''));
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Action inconnue.']);
}
