param (
    [Parameter(Mandatory=$true)]
    [string]$Path
)

# 1. Localisation de ImageMagick (même logique robuste que précédemment)
$magickExe = Get-Command magick -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source

if (-not $magickExe) {
    $defaultPath = "C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"
    if (Test-Path $defaultPath) { $magickExe = $defaultPath }
}

if (-not $magickExe) {
    Write-Error "ImageMagick n'est pas détecté."
    return
}

# 2. Vérification du répertoire
if (-not (Test-Path $Path)) {
    Write-Error "Le répertoire spécifié n'existe pas."
    return
}

# 3. Récupérer les fichiers PNG
$images = Get-ChildItem -Path $Path -Filter *.png -File

if ($images.Count -eq 0) {
    Write-Host "Aucun fichier .png trouvé dans : $Path" -ForegroundColor Yellow
    return
}

Write-Host "Optimisation de $($images.Count) fichiers PNG en cours..." -ForegroundColor Cyan

foreach ($img in $images) {
    Write-Host "Traitement de : $($img.Name)..." -NoNewline

    # Calcul de la taille avant
    $oldSize = $img.Length / 1KB

    # Exécution de l'optimisation
    # -strip : enlève les métadonnées
    # -define png:compression-level=9 : compression maximale
    & $magickExe "$($img.FullName)" -strip -define png:compression-level=9 "$($img.FullName)"

    # Calcul de la taille après
    $newSize = (Get-Item $img.FullName).Length / 1KB
    $gain = [Math]::Round($oldSize - $newSize, 2)

    Write-Host " Terminé (Gain: $gain KB)" -ForegroundColor Green
}

Write-Host "`nOptimisation terminée !" -ForegroundColor Cyan