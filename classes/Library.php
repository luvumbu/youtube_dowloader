<?php
require_once __DIR__ . '/Config.php';

/**
 * Library - Gestion de la bibliotheque de telechargements
 *
 * Stocke dans library.json :
 * - Les dossiers virtuels (pas de vrais dossiers sur le disque)
 * - Les items telecharges avec leurs metadonnees
 *
 * Fournit des operations CRUD pour les dossiers et les items,
 * ainsi que des statistiques (total, audio, video).
 */
class Library
{
    private string $filePath;
    private array $data;

    public function __construct()
    {
        $this->filePath = Config::getLibraryFile();
        $this->data = $this->load();
    }

    // === Chargement / Sauvegarde ===

    /**
     * Charge les donnees depuis library.json
     * @return array Structure avec 'folders' et 'items'
     */
    private function load(): array
    {
        if (!file_exists($this->filePath)) {
            return ['folders' => [], 'items' => []];
        }
        $data = json_decode(file_get_contents($this->filePath), true);
        return $data ?: ['folders' => [], 'items' => []];
    }

    /**
     * Sauvegarde les donnees dans library.json
     */
    private function save(): void
    {
        file_put_contents(
            $this->filePath,
            json_encode($this->data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    // === Lecture ===

    /**
     * Liste tous les items et dossiers avec statistiques
     * Verifie que les fichiers existent encore sur le disque
     *
     * @return array Donnees completes avec stats
     */
    public function list(): array
    {
        // Supprimer les items dont le fichier n'existe plus
        $rootDir = realpath(Config::ROOT_DIR) . DIRECTORY_SEPARATOR;
        $this->data['items'] = array_values(array_filter(
            $this->data['items'],
            fn($item) => file_exists($rootDir . $item['file'])
        ));
        $this->save();

        $items = $this->data['items'];

        return [
            'success' => true,
            'folders' => $this->data['folders'],
            'items'   => $items,
            'stats'   => [
                'total' => count($items),
                'audio' => count(array_filter($items, fn($i) => $i['type'] === 'audio')),
                'video' => count(array_filter($items, fn($i) => $i['type'] === 'video'))
            ]
        ];
    }

    // === Items ===

    /**
     * Ajoute un nouvel item a la bibliotheque
     *
     * @param array $params Parametres de l'item (file, title, type, format, etc.)
     * @return array Item cree avec son ID
     */
    public function addItem(array $params): array
    {
        $item = [
            'id'        => uniqid('item_'),
            'file'      => $params['file'] ?? '',
            'title'     => $params['title'] ?? '',
            'type'      => $params['type'] ?? 'audio',
            'format'    => $params['format'] ?? 'mp3',
            'folder'    => $params['folder'] ?? '',
            'thumbnail' => $params['thumbnail'] ?? '',
            'channel'   => $params['channel'] ?? '',
            'duration'  => $params['duration'] ?? '',
            'date'      => date('Y-m-d H:i:s'),
            'cover'     => $params['cover'] ?? '',
            'url'       => $params['url'] ?? ''
        ];

        $this->data['items'][] = $item;
        $this->save();

        return ['success' => true, 'item' => $item];
    }

    /**
     * Deplace un item dans un dossier (ou a la racine si $folderId est vide)
     *
     * @param string $itemId   ID de l'item
     * @param string $folderId ID du dossier cible (vide = racine)
     */
    public function moveItem(string $itemId, string $folderId): array
    {
        foreach ($this->data['items'] as &$item) {
            if ($item['id'] === $itemId) {
                $item['folder'] = $folderId;
                break;
            }
        }
        $this->save();
        return ['success' => true];
    }

    /**
     * Supprime un item et ses fichiers associes (mp3/mp4 + cover)
     *
     * @param string $itemId ID de l'item a supprimer
     */
    public function deleteItem(string $itemId): array
    {
        $rootDir = realpath(Config::ROOT_DIR) . DIRECTORY_SEPARATOR;

        foreach ($this->data['items'] as $item) {
            if ($item['id'] === $itemId) {
                // Supprimer le fichier principal
                $filePath = $rootDir . $item['file'];
                if (file_exists($filePath)) @unlink($filePath);

                // Supprimer la couverture si presente
                if (!empty($item['cover'])) {
                    $coverPath = $rootDir . $item['cover'];
                    if (file_exists($coverPath)) @unlink($coverPath);
                }
                break;
            }
        }

        $this->data['items'] = array_values(
            array_filter($this->data['items'], fn($i) => $i['id'] !== $itemId)
        );
        $this->save();
        return ['success' => true];
    }

    // === Dossiers virtuels ===

    /**
     * Cree un nouveau dossier virtuel
     *
     * @param string $name Nom du dossier
     * @return array Dossier cree avec son ID
     */
    public function createFolder(string $name): array
    {
        $name = trim($name);
        if (empty($name)) {
            return ['success' => false, 'error' => 'Nom de dossier vide.'];
        }

        $folder = [
            'id'   => uniqid('folder_'),
            'name' => $name,
            'date' => date('Y-m-d H:i:s')
        ];

        $this->data['folders'][] = $folder;
        $this->save();

        return ['success' => true, 'folder' => $folder];
    }

    /**
     * Renomme un dossier existant
     *
     * @param string $folderId ID du dossier
     * @param string $newName  Nouveau nom
     */
    public function renameFolder(string $folderId, string $newName): array
    {
        $newName = trim($newName);
        if (empty($newName)) {
            return ['success' => false, 'error' => 'Nom vide.'];
        }

        foreach ($this->data['folders'] as &$f) {
            if ($f['id'] === $folderId) {
                $f['name'] = $newName;
                break;
            }
        }
        $this->save();
        return ['success' => true];
    }

    /**
     * Supprime un dossier
     * Les items qui etaient dans ce dossier retournent a la racine
     *
     * @param string $folderId ID du dossier a supprimer
     */
    public function deleteFolder(string $folderId): array
    {
        // Supprimer le dossier
        $this->data['folders'] = array_values(
            array_filter($this->data['folders'], fn($f) => $f['id'] !== $folderId)
        );

        // Remettre les items a la racine
        foreach ($this->data['items'] as &$item) {
            if ($item['folder'] === $folderId) {
                $item['folder'] = '';
            }
        }

        $this->save();
        return ['success' => true];
    }
}
