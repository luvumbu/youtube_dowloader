@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title YouTube Downloader - Installation
color 0F

echo.
echo  ========================================
echo    YouTube Downloader - Installation
echo    Installation complete automatique
echo  ========================================
echo.

set "PROJECT_DIR=%~dp0"
set "PROGRAM_DIR=%PROJECT_DIR%program\"
set "INSTALL_DIR=C:\yt-tools"
set "YTDLP_DEST=%INSTALL_DIR%\yt-dlp.exe"
set "FFMPEG_DIR=%INSTALL_DIR%\ffmpeg"
set "XAMPP_DIR=C:\xampp"

:: Extraire le nom du dossier du projet (dernier segment du chemin)
set "TEMP_PATH=%~dp0"
set "TEMP_PATH=%TEMP_PATH:~0,-1%"
for %%F in ("%TEMP_PATH%") do set "FOLDER_NAME=%%~nxF"
set "HTDOCS=%XAMPP_DIR%\htdocs\%FOLDER_NAME%"

echo  [INFO] Dossier du projet : %PROJECT_DIR%
echo  [INFO] Nom du dossier    : %FOLDER_NAME%
echo  [INFO] Destination htdocs: %HTDOCS%
echo  [INFO] Dossier outils    : %INSTALL_DIR%
echo.

:: ============================================
:: ETAPE 1 : XAMPP
:: ============================================
echo  ----------------------------------------
echo  [1/7] Verification de XAMPP...
echo  ----------------------------------------

if exist "%XAMPP_DIR%\php\php.exe" (
    echo  [OK] XAMPP deja installe dans %XAMPP_DIR%
) else (
    if exist "%PROGRAM_DIR%xamp.exe" (
        echo  [INSTALL] L'installateur XAMPP va s'ouvrir.
        echo  [INFO] Chemin par defaut : C:\xampp
        echo  [INFO] Cocher au minimum Apache et PHP.
        echo.
        start /wait "" "%PROGRAM_DIR%xamp.exe"
        if exist "%XAMPP_DIR%\php\php.exe" (
            echo  [OK] XAMPP installe avec succes
        ) else (
            echo  [ERREUR] XAMPP n'a pas ete installe dans C:\xampp
            echo  [INFO] Installe XAMPP manuellement puis relance ce script.
            pause
            exit /b 1
        )
    ) else (
        echo  [ERREUR] XAMPP non trouve et installateur absent dans program\
        pause
        exit /b 1
    )
)
echo.

:: ============================================
:: ETAPE 2 : Python
:: ============================================
echo  ----------------------------------------
echo  [2/7] Verification de Python...
echo  ----------------------------------------

set "PYTHON_EXE="

:: Chercher Python dans le PATH
for /f "delims=" %%P in ('where python 2^>nul') do (
    if not defined PYTHON_EXE (
        :: Verifier que ce n'est pas le stub WindowsApps qui redirige vers le Store
        echo "%%P" | findstr /i "WindowsApps" >nul
        if errorlevel 1 (
            set "PYTHON_EXE=%%P"
        )
    )
)

:: Si pas trouve, chercher dans les emplacements connus
if not defined PYTHON_EXE (
    for %%V in (314 313 312 311 310 39) do (
        if not defined PYTHON_EXE (
            if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" (
                set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe"
            )
        )
    )
)
if not defined PYTHON_EXE (
    if exist "%LOCALAPPDATA%\Python\bin\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Python\bin\python.exe"
)

if defined PYTHON_EXE (
    echo  [OK] Python trouve : !PYTHON_EXE!
) else (
    :: Installer Python
    if exist "%PROGRAM_DIR%python.msix" (
        echo  [INSTALL] L'installateur Python va s'ouvrir.
        echo  [INFO] Cliquer Installer et attendre.
        echo.
        start /wait "" "%PROGRAM_DIR%python.msix"

        :: Re-chercher apres installation
        timeout /t 2 >nul
        for /f "delims=" %%P in ('where python 2^>nul') do (
            if not defined PYTHON_EXE set "PYTHON_EXE=%%P"
        )
        if not defined PYTHON_EXE (
            if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe" (
                set "PYTHON_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe"
            )
        )
        if not defined PYTHON_EXE (
            if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
                set "PYTHON_EXE=%LOCALAPPDATA%\Python\bin\python.exe"
            )
        )
        for %%V in (314 313 312 311 310 39) do (
            if not defined PYTHON_EXE (
                if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" (
                    set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe"
                )
            )
        )

        if defined PYTHON_EXE (
            echo  [OK] Python installe : !PYTHON_EXE!
        ) else (
            echo  [--] Python non detecte apres installation.
            echo  [INFO] Pas bloquant : l'app fonctionne sans Python.
        )
    ) else (
        echo  [--] Python non installe (installateur absent).
        echo  [INFO] Pas bloquant : l'app fonctionne sans Python.
    )
)
echo.

:: ============================================
:: ETAPE 3 : Dossier outils
:: ============================================
echo  ----------------------------------------
echo  [3/7] Creation du dossier outils...
echo  ----------------------------------------

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%" (
    echo  [ERREUR] Impossible de creer %INSTALL_DIR%
    echo  [INFO] Verifie les droits administrateur.
    pause
    exit /b 1
)
echo  [OK] Dossier %INSTALL_DIR%
echo.

:: ============================================
:: ETAPE 4 : yt-dlp
:: ============================================
echo  ----------------------------------------
echo  [4/7] Installation de yt-dlp...
echo  ----------------------------------------

if exist "%YTDLP_DEST%" (
    echo  [OK] yt-dlp deja installe
) else (
    if exist "%PROGRAM_DIR%yt-dlp.exe" (
        copy /Y "%PROGRAM_DIR%yt-dlp.exe" "%YTDLP_DEST%" >nul 2>&1
        if exist "%YTDLP_DEST%" (
            echo  [OK] yt-dlp copie dans %INSTALL_DIR%
        ) else (
            echo  [ERREUR] Impossible de copier yt-dlp.exe
            pause
            exit /b 1
        )
    ) else (
        echo  [ERREUR] yt-dlp.exe introuvable dans program\
        pause
        exit /b 1
    )
)
echo.

:: ============================================
:: ETAPE 5 : FFmpeg
:: ============================================
echo  ----------------------------------------
echo  [5/7] Installation de FFmpeg...
echo  ----------------------------------------

set "FFMPEG_BIN="

:: Chercher un ffmpeg deja extrait
if exist "%FFMPEG_DIR%" (
    for /d %%D in ("%FFMPEG_DIR%\ffmpeg-*") do (
        if exist "%%D\bin\ffmpeg.exe" set "FFMPEG_BIN=%%D\bin"
    )
    if exist "%FFMPEG_DIR%\bin\ffmpeg.exe" set "FFMPEG_BIN=%FFMPEG_DIR%\bin"
)

if defined FFMPEG_BIN (
    echo  [OK] FFmpeg deja installe : !FFMPEG_BIN!
) else (
    if exist "%PROGRAM_DIR%ffmpeg.zip" (
        echo  [INSTALL] Extraction de FFmpeg (1-2 minutes)...
        if not exist "%FFMPEG_DIR%" mkdir "%FFMPEG_DIR%"
        powershell -NoProfile -Command "try { Expand-Archive -LiteralPath '%PROGRAM_DIR%ffmpeg.zip' -DestinationPath '%FFMPEG_DIR%' -Force; Write-Host 'EXTRACT_OK' } catch { Write-Host 'EXTRACT_FAIL' }" 2>nul | findstr "EXTRACT_OK" >nul
        if errorlevel 1 (
            echo  [ERREUR] Extraction FFmpeg echouee.
            echo  [INFO] Dezippe manuellement program\ffmpeg.zip dans %FFMPEG_DIR%
            pause
            exit /b 1
        )

        :: Trouver le dossier bin
        for /d %%D in ("%FFMPEG_DIR%\ffmpeg-*") do (
            if exist "%%D\bin\ffmpeg.exe" set "FFMPEG_BIN=%%D\bin"
        )

        if defined FFMPEG_BIN (
            echo  [OK] FFmpeg extrait dans !FFMPEG_BIN!
        ) else (
            echo  [ERREUR] ffmpeg.exe introuvable apres extraction.
            pause
            exit /b 1
        )
    ) else (
        echo  [ERREUR] ffmpeg.zip introuvable dans program\
        pause
        exit /b 1
    )
)
echo.

:: ============================================
:: ETAPE 6 : Copier le projet
:: ============================================
echo  ----------------------------------------
echo  [6/7] Installation du projet...
echo  ----------------------------------------

:: Comparer les chemins (normaliser avec trailing backslash)
set "SRC=%PROJECT_DIR%"
set "DST=%HTDOCS%\"
if /I "%SRC%"=="%DST%" (
    echo  [OK] Le projet est deja dans htdocs
) else (
    echo  [INSTALL] Copie du projet vers %HTDOCS%...
    if not exist "%HTDOCS%" mkdir "%HTDOCS%"
    xcopy "%PROJECT_DIR%*" "%HTDOCS%\" /E /Y /Q >nul 2>&1
    if exist "%HTDOCS%\index.php" (
        echo  [OK] Projet copie
    ) else (
        echo  [ERREUR] Copie du projet echouee.
        pause
        exit /b 1
    )
)

:: Creer les dossiers necessaires
if not exist "%HTDOCS%\downloads" mkdir "%HTDOCS%\downloads"
if not exist "%HTDOCS%\data" mkdir "%HTDOCS%\data"

:: Creer les fichiers JSON via PowerShell (plus fiable que echo)
powershell -NoProfile -Command ^
  "if (-not (Test-Path '%HTDOCS%\data\library.json')) { '{\"folders\":[],\"items\":[]}' | Set-Content '%HTDOCS%\data\library.json' -Encoding UTF8 };" ^
  "if (-not (Test-Path '%HTDOCS%\data\profiles.json')) { '[]' | Set-Content '%HTDOCS%\data\profiles.json' -Encoding UTF8 };" ^
  "if (-not (Test-Path '%HTDOCS%\data\history.json')) { '[]' | Set-Content '%HTDOCS%\data\history.json' -Encoding UTF8 };" ^
  "Write-Host 'JSON OK'"

echo  [OK] Dossiers et fichiers crees
echo.

:: ============================================
:: ETAPE 7 : Configuration automatique
:: ============================================
echo  ----------------------------------------
echo  [7/7] Configuration automatique...
echo  ----------------------------------------

:: Preparer les chemins avec double backslash pour PHP
set "PHP_YTDLP=%YTDLP_DEST:\=\\%"
set "PHP_FFMPEG=!FFMPEG_BIN:\=\\!"
set "PHP_PHP=%XAMPP_DIR%\php\php.exe"
set "PHP_PHP=!PHP_PHP:\=\\!"

if defined PYTHON_EXE (
    set "PHP_PYTHON=!PYTHON_EXE:\=\\!"
) else (
    set "PHP_PYTHON="
)

:: Ecrire Config.php via PowerShell (regex-safe avec [regex]::Escape)
powershell -NoProfile -Command ^
  "$f = '%HTDOCS%\classes\Config.php';" ^
  "$c = Get-Content $f -Raw -Encoding UTF8;" ^
  "$c = $c -replace \"const YTDLP_PATH = '[^']*'\", \"const YTDLP_PATH = '%PHP_YTDLP%'\";" ^
  "$c = $c -replace \"const FFMPEG_PATH = '[^']*'\", \"const FFMPEG_PATH = '!PHP_FFMPEG!'\";" ^
  "$c = $c -replace \"const PHP_PATH = '[^']*'\", \"const PHP_PATH = '!PHP_PHP!'\";" ^
  "if ('%PHP_PYTHON%' -ne '') { $c = $c -replace \"const PYTHON_PATH = '[^']*'\", \"const PYTHON_PATH = '%PHP_PYTHON%'\" };" ^
  "[System.IO.File]::WriteAllText($f, $c);" ^
  "Write-Host 'Config OK'"

echo  [OK] Config.php configure
echo.

:: ============================================
:: Verification finale
:: ============================================
echo  ========================================
echo  VERIFICATION FINALE
echo  ========================================
echo.

set "ERRORS=0"

if exist "%XAMPP_DIR%\php\php.exe" (
    echo  [OK] XAMPP
) else (
    echo  [X]  XAMPP
    set /a ERRORS+=1
)

if defined PYTHON_EXE (
    echo  [OK] Python : !PYTHON_EXE!
) else (
    echo  [--] Python : non installe (optionnel)
)

if exist "%YTDLP_DEST%" (
    echo  [OK] yt-dlp
) else (
    echo  [X]  yt-dlp
    set /a ERRORS+=1
)

if defined FFMPEG_BIN (
    if exist "!FFMPEG_BIN!\ffmpeg.exe" (
        echo  [OK] FFmpeg
    ) else (
        echo  [X]  FFmpeg (bin existe mais ffmpeg.exe absent)
        set /a ERRORS+=1
    )
) else (
    echo  [X]  FFmpeg
    set /a ERRORS+=1
)

if exist "%HTDOCS%\index.php" (
    echo  [OK] Projet
) else (
    echo  [X]  Projet
    set /a ERRORS+=1
)

:: Verifier que Config.php a ete modifie
findstr /C:"yt-tools" "%HTDOCS%\classes\Config.php" >nul 2>&1
if not errorlevel 1 (
    echo  [OK] Config.php
) else (
    echo  [?]  Config.php (verifier les chemins manuellement)
)

echo.

if %ERRORS% EQU 0 (
    echo  ========================================
    echo    INSTALLATION TERMINEE AVEC SUCCES
    echo  ========================================
    echo.
    echo  Chemins configures :
    echo    yt-dlp  : %YTDLP_DEST%
    echo    FFmpeg  : !FFMPEG_BIN!
    echo    PHP     : %XAMPP_DIR%\php\php.exe
    if defined PYTHON_EXE echo    Python  : !PYTHON_EXE!
    echo.
    echo  URL : http://localhost/!FOLDER_NAME!/
    echo.

    set /p LAUNCH="  Lancer Apache maintenant ? (O/N) : "
    if /I "!LAUNCH!"=="O" (
        echo.
        echo  [INFO] Demarrage d'Apache...
        start "" "%XAMPP_DIR%\xampp_start.exe"
        timeout /t 3 >nul
        echo  [OK] Apache demarre
        echo.
        start http://localhost/!FOLDER_NAME!/
    )
) else (
    echo  [ERREUR] %ERRORS% probleme(s) detecte(s).
    echo  [INFO] Verifie les elements marques [X] ci-dessus.
)

echo.
pause
endlocal
