# Définir les chemins
$source = "C:\apache24\conf\extra\httpd-vhosts.conf"
$destinationFolder = "C:\Fichiers_Users\funigo\doc\apache-vhost"

# Générer le timestamp au format AAAAMMDDHHMM
$timestamp = Get-Date -Format "yyyyMMddHHmm"

# Créer le nom de fichier de destination
$destinationFile = "httpd-vhosts.conf_$timestamp"

# Créer le chemin complet du fichier de destination
$destinationPath = Join-Path $destinationFolder $destinationFile

# Copier le fichier
Copy-Item -Path $source -Destination $destinationPath

# Message de confirmation
Write-Output "Fichier copié vers : $destinationPath"
