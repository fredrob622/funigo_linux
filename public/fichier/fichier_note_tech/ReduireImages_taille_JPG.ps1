param (
    [Parameter(Mandatory=$true)]
    [string]$Repertoire
)

# On vérifie si le dossier existe, sinon on ne va pas bien loin !
if (-not (Test-Path $Repertoire)) {
    Write-Host "Oups ! Le dossier '$Repertoire' est introuvable. 🤔" -ForegroundColor Red
    exit
}

# On récupère toutes les photos JPG du dossier
$photos = Get-ChildItem -Path $Repertoire -Filter *.jpg

Write-Host "C'est parti ! Traitement de $($photos.Count) images... 📸" -ForegroundColor Cyan

foreach ($photo in $photos) {
    $cheminComplet = $photo.FullName
    
    # Appel à ImageMagick (commande 'magick')
    # On réduit la qualité à 75% et on redimensionne si l'image dépasse 1920px
    magick "$cheminComplet" -quality 75% -resize "1920x1080>" "$cheminComplet"
    
    Write-Host "Optimisation de : $($photo.Name) ✅" -ForegroundColor Green
}

Write-Host "Terminé ! Vos photos sont prêtes pour le web. ✨" -ForegroundColor Yellow