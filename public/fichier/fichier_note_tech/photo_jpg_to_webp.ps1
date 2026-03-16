param (
    [Parameter(Mandatory=$true)]
    [string]$Path,
    [int]$Quality = 75
)

# 1. Tentative de trouver ImageMagick
$magickExe = Get-Command magick -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source

# Si on ne le trouve pas, on teste le chemin par défaut de votre capture d'écran
if (-not $magickExe) {
    $defaultPath = "C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"
    if (Test-Path $defaultPath) {
        $magickExe = $defaultPath
    }
}

# 2. Vérification finale
if (-not $magickExe) {
    Write-Error "ImageMagick n'est pas détecté. Essayez de redémarrer votre ordinateur ou vérifiez l'installation."
    return
}

Write-Host "Utilisation de : $magickExe" -ForegroundColor Gray

# 3. Vérification du répertoire
if (-not (Test-Path $Path)) {
    Write-Error "Le répertoire spécifié n'existe pas."
    return
}

# 4. Traitement des images
$images = Get-ChildItem -Path $Path -Filter *.jpg -File

if ($images.Count -eq 0) {
    Write-Host "Aucune photo .jpg trouvée dans : $Path" -ForegroundColor Yellow
    return
}

Write-Host "Début de la conversion de $($images.Count) images..." -ForegroundColor Cyan

foreach ($img in $images) {
    # On crée le nouveau nom en remplaçant .jpg par .webp
    $newName = Join-Path -Path $img.DirectoryName -ChildPath ($img.BaseName + ".webp")
    
    Write-Host "Conversion : $($img.Name) -> $($img.BaseName).webp"
    
    # Exécution avec le chemin complet de l'exécutable
    & $magickExe "$($img.FullName)" -quality $Quality "$newName"
}

Write-Host "Terminé ! Vos images WebP sont prêtes." -ForegroundColor Green