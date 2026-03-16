#PowerShell

param (
    [Parameter(Mandatory=$true)]
    [string]$SourceDirectory,

    [Parameter(Mandatory=$true)]
    [string]$OutputDirectoryName
)

# Résoudre le chemin absolu du répertoire source
$SourceDirectory = (Get-Item $SourceDirectory).FullName
#####################################################################################################################
#Ouvrez PowerShell.

#Naviguez jusqu'à l'emplacement où vous avez enregistré le script.

#Exécutez le script en lui passant le chemin du répertoire source (celui qui contient vos photos JPEG) et le nom désiré pour 
#le répertoire de sortie :

#PowerShell

# .\convert_to_webp.ps1 -SourceDirectory "C:\Users\VotreNom\Images\MesPhotosJPEG" -OutputDirectoryName "PhotosOptimisees"
# Ceci créera un répertoire PhotosOptimisees_webp dans le dossier Images et y placera toutes les images converties.
#####################################################################################################################


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

Write-Host "Début de la conversion des images de $SourceDirectory..."

# Parcourir les fichiers JPEG
# CORRECTION ICI : Utilisation de -Include au lieu de -Filter pour plusieurs extensions
Get-ChildItem -Path $SourceDirectory -Include "*.jpg", "*.jpeg",  -File | ForEach-Object {
    $inputFile = $_.FullName
    $outputFileName = ($_.BaseName) + ".webp"
    $outputFile = Join-Path $OutputDirectory $outputFileName

    Write-Host "  Traitement de $($_.Name)..."

    # Commande cwebp :
    # -q 70 : Qualité de compression de 70%
    # -resize 500 0 : Redimensionne l'image à 500px de large, la hauteur est calculée automatiquement pour garder le ratio.
    $cwebpCommand = "cwebp `"$inputFile`" -o `"$outputFile`" -q 70 -resize 500 0"

    try {
        # Exécuter la commande cwebp. Out-Null pour supprimer la sortie de cwebp si succès.
        Invoke-Expression $cwebpCommand | Out-Null
        Write-Host "    Converti avec succès : $($_.Name) -> $($outputFileName)" -ForegroundColor Green
    } catch {
        Write-Error "    Erreur lors de la conversion de $($_.Name) : $($_.Exception.Message)"
    }
}

Write-Host "`nConversion terminée." -ForegroundColor Green
