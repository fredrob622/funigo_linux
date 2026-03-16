#PowerShell

param (
    [Parameter(Mandatory=$true)]
    [string]$SourceDirectory,

    [Parameter(Mandatory=$true)]
    [string]$OutputDirectoryName
)

# Résoudre le chemin absolu du répertoire source
$SourceDirectory = (Get-Item $SourceDirectory).FullName
Write-Host "DEBUG: Resolved SourceDirectory: $SourceDirectory" -ForegroundColor Magenta

# Définir le chemin complet du répertoire de sortie
$OutputDirectory = Join-Path (Get-Item $SourceDirectory).Parent.FullName "${OutputDirectoryName}_webp"

# Vérifier si le répertoire source existe
if (-not (Test-Path $SourceDirectory -PathType Container)) {
    Write-Error "Erreur : Le répertoire source spécifié n'existe pas ou n'est pas un répertoire valide : $SourceDirectory"
    exit 1
}

# Créer le répertoire de sortie s'il n'existe pas
if (-not (Test-Path $OutputDirectory -PathType Container)) {
    New-Item -Path $OutputDirectory -ItemType Directory -Force | Out-Null
    Write-Host "Répertoire de sortie créé : $OutputDirectory" -ForegroundColor Cyan
} else {
    Write-Host "Répertoire de sortie déjà existant : $OutputDirectory" -ForegroundColor Yellow
}

# --- Vérifier si cwebp est accessible ---
Write-Host "Vérification de l'exécutable 'cwebp'..."
$cwebpPath = (Get-Command cwebp -ErrorAction SilentlyContinue).Path
if (-not $cwebpPath) {
    Write-Error "Erreur : L'exécutable 'cwebp' est introuvable. Assurez-vous qu'il est installé et que son chemin est ajouté à la variable d'environnement PATH."
    Write-Error "Vous pouvez télécharger cwebp dans le cadre des outils WebP de Google : https://developers.google.com/speed/webp/docs/precompiled"
    exit 1
} else {
    Write-Host "  'cwebp' trouvé à : $cwebpPath" -ForegroundColor DarkCyan
}
# --- FIN Vérification ---

Write-Host "Début de la conversion des images de $SourceDirectory..."

# Utilisation de Where-Object pour le filtrage
$filesToConvert = Get-ChildItem -Path $SourceDirectory -File | Where-Object { $_.Extension -match '\.(jpg|jpeg|png|webp)$' }

# Debugging: Print found files
Write-Host "DEBUG: Files found by Get-ChildItem (before count check):" -ForegroundColor Magenta
$filesToConvert | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor DarkGray }

if ($filesToConvert.Count -eq 0) {
    Write-Warning "Aucun fichier correspondant aux extensions (*.jpg, *.jpeg, *.png, *.webp) trouvé dans le répertoire source."
} else {
    Write-Host "Nombre de fichiers à convertir trouvés : $($filesToConvert.Count)" -ForegroundColor DarkYellow
}

$filesToConvert | ForEach-Object {
    $inputFile = $_.FullName
    $outputFileName = ($_.BaseName) + ".webp"
    $outputFile = Join-Path $OutputDirectory $outputFileName

    Write-Host "  Traitement de $($_.Name)..." -ForegroundColor White
    Write-Host "    Source: $inputFile" -ForegroundColor Gray
    Write-Host "    Cible: $outputFile" -ForegroundColor Gray

    # Commande cwebp :
    # -q 70 : Qualité de compression de 70%
    # -resize 500 0 : Redimensionne l'image à 500px de large, la hauteur est calculée automatiquement pour garder le ratio.
    
    try {
        # NOUVEAU : Utilisation de l'opérateur d'appel (&) avec un tableau d'arguments pour plus de robustesse.
        # Cela évite les problèmes de réinterprétation des chaînes par Invoke-Expression.
        $arguments = @(
            $inputFile,
            "-o", $outputFile,
            "-q", "70",
            "-resize", "500", "0"
        )
        
        Write-Host "    Exécution de: $cwebpPath $($arguments -join ' ')" -ForegroundColor Gray

        # Exécute la commande et capture la sortie/erreurs
        # 2>&1 redirige stderr vers stdout pour une capture unifiée
        $processOutput = & $cwebpPath $arguments 2>&1 

        # Vérifie le code de sortie de cwebp pour déterminer le succès ou l'échec
        if ($LASTEXITCODE -ne 0) { 
            Write-Error "    Erreur de cwebp pour $($_.Name) (code de sortie $LASTEXITCODE):"
            $processOutput | ForEach-Object { Write-Error "      $_" }
            Write-Error "    Échec de la conversion de $($_.Name) : Le fichier de sortie n'a pas été créé."
        } elseif (-not (Test-Path $outputFile)) {
            # Si cwebp n'a pas renvoyé d'erreur mais que le fichier n'existe pas
            Write-Error "    Échec de la conversion de $($_.Name) : Le fichier de sortie n'a pas été créé."
            Write-Error "    Vérifiez la sortie de 'cwebp' ci-dessus pour les messages d'erreur."
            $processOutput | ForEach-Object { Write-Error "      $_" } # Affiche la sortie même s'il n'y a pas d'erreur explicite
        } else {
            Write-Host "    Converti avec succès : $($_.Name) -> $($outputFileName)" -ForegroundColor Green
        }
    } catch {
        Write-Error "    Erreur PowerShell lors de l'exécution de cwebp pour $($_.Name) : $($_.Exception.Message)"
    }
}

Write-Host "`nConversion terminée." -ForegroundColor Green
