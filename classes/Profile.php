<?php
require_once __DIR__ . '/Config.php';

/**
 * Profile - Gestion des profils utilisateur
 *
 * Stocke dans profiles.json les profils avec :
 * - Pseudo (identifiant unique, pas de mot de passe)
 * - Preferences de telechargement (type, format, qualite, cover)
 * - Compteur de telechargements
 * - Dates de creation et derniere connexion
 *
 * Le profil actif est retenu cote client via cookie (10 ans) + localStorage.
 */
class Profile
{
    private string $filePath;
    private array $profiles;

    public function __construct()
    {
        $this->filePath = Config::getProfilesFile();
        $this->profiles = $this->load();
    }

    // === Chargement / Sauvegarde ===

    private function load(): array
    {
        if (!file_exists($this->filePath)) return [];
        $data = json_decode(file_get_contents($this->filePath), true);
        return is_array($data) ? $data : [];
    }

    private function save(): void
    {
        file_put_contents(
            $this->filePath,
            json_encode($this->profiles, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    // === Operations ===

    /**
     * Liste tous les profils (infos publiques uniquement)
     * Utilise pour l'ecran de selection de profil
     *
     * @return array Liste simplifiee des profils
     */
    public function listAll(): array
    {
        $list = array_map(fn($p) => [
            'id'             => $p['id'],
            'username'       => $p['username'],
            'download_count' => $p['download_count'] ?? 0,
            'created'        => $p['created'] ?? ''
        ], $this->profiles);

        return ['success' => true, 'profiles' => $list];
    }

    /**
     * Cree ou met a jour un profil
     * Si le pseudo existe deja, met a jour les preferences fournies.
     * Sinon, cree un nouveau profil avec les valeurs par defaut.
     *
     * @param string $username Pseudo de l'utilisateur
     * @param array  $prefs    Preferences optionnelles a mettre a jour
     * @return array Profil cree ou mis a jour
     */
    public function save_profile(string $username, array $prefs = []): array
    {
        $username = trim($username);
        if (empty($username)) {
            return ['success' => false, 'error' => 'Nom d\'utilisateur vide.'];
        }

        // Chercher le profil existant
        $found = false;
        foreach ($this->profiles as &$p) {
            if ($p['username'] === $username) {
                // Mettre a jour les preferences fournies
                $updatableFields = [
                    'pref_type', 'pref_format_audio', 'pref_format_video',
                    'pref_quality_audio', 'pref_quality_video', 'pref_cover'
                ];
                foreach ($updatableFields as $field) {
                    if (isset($prefs[$field])) {
                        $p[$field] = $prefs[$field];
                    }
                }
                $p['last_seen'] = date('Y-m-d H:i:s');

                if (!empty($prefs['increment_dl'])) {
                    $p['download_count'] = ($p['download_count'] ?? 0) + 1;
                }

                $found = true;
                $profile = $p;
                break;
            }
        }

        // Creer un nouveau profil si inexistant
        if (!$found) {
            $profile = [
                'id'                 => uniqid('user_'),
                'username'           => $username,
                'pref_type'          => $prefs['pref_type'] ?? 'audio',
                'pref_format_audio'  => $prefs['pref_format_audio'] ?? 'mp3',
                'pref_format_video'  => $prefs['pref_format_video'] ?? 'mp4',
                'pref_quality_audio' => $prefs['pref_quality_audio'] ?? '0',
                'pref_quality_video' => $prefs['pref_quality_video'] ?? 'best',
                'pref_cover'         => $prefs['pref_cover'] ?? '0',
                'download_count'     => 0,
                'created'            => date('Y-m-d H:i:s'),
                'last_seen'          => date('Y-m-d H:i:s')
            ];
            $this->profiles[] = $profile;
        }

        $this->save();

        // Cookie permanent (10 ans)
        setcookie('yt_user', $username, time() + 86400 * 3650, '/');

        return ['success' => true, 'profile' => $profile];
    }

    /**
     * Charge un profil par son pseudo
     *
     * @param string $username Pseudo a chercher
     * @return array Profil trouve ou erreur
     */
    public function loadByUsername(string $username): array
    {
        foreach ($this->profiles as &$p) {
            if ($p['username'] === $username) {
                $p['last_seen'] = date('Y-m-d H:i:s');
                $this->save();
                return ['success' => true, 'profile' => $p];
            }
        }
        return ['success' => false, 'error' => 'Profil introuvable.'];
    }

    /**
     * Incremente le compteur de telechargements d'un profil
     *
     * @param string $username Pseudo du profil
     */
    public function incrementDownloads(string $username): array
    {
        foreach ($this->profiles as &$p) {
            if ($p['username'] === $username) {
                $p['download_count'] = ($p['download_count'] ?? 0) + 1;
                $p['last_seen'] = date('Y-m-d H:i:s');
                break;
            }
        }
        $this->save();
        return ['success' => true];
    }

    /**
     * Deconnexion : supprime le cookie
     */
    public function logout(): array
    {
        setcookie('yt_user', '', time() - 3600, '/');
        return ['success' => true];
    }
}
