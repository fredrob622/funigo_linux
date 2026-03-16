# ===================================================================
# Script PowerShell pour créer la structure de répertoires du projet Funigo
# Auteur: Gemini
# Date: 20/05/2024
# ===================================================================

# --- Configuration ---
# Nom du répertoire racine du projet
$projectRoot = "funigo"

# Liste de tous les sous-répertoires à créer
$directories = @(
    "public/css",
    "public/js",
    "public/images",
    "views/partials",
    "views/pages"
)

# --- Exécution ---

Write-Host "Création de la structure du projet '$projectRoot'..." -ForegroundColor Yellow

# Vérifie si le répertoire racine existe déjà
if (Test-Path -Path $projectRoot) {
    Write-Host "Le répertoire racine '$projectRoot' existe déjà." -ForegroundColor Cyan
} else {
    # Crée le répertoire racine
    New-Item -ItemType Directory -Path $projectRoot | Out-Null
    Write-Host "Répertoire racine '$projectRoot' créé." -ForegroundColor Green
}

# Boucle à travers la liste des répertoires pour les créer
foreach ($dir in $directories) {
    # Construit le chemin complet
    $fullPath = Join-Path -Path $projectRoot -ChildPath $dir
    
    # Vérifie si le sous-répertoire existe déjà
    if (Test-Path -Path $fullPath) {
        Write-Host "  - Le répertoire '$dir' existe déjà."
    } else {
        # Crée le répertoire et tous ses parents si nécessaire (grâce à -Force)
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  - Répertoire '$dir' créé."
    }
}

Write-Host "--------------------------------------------------------"
Write-Host "La structure des répertoires a été créée avec succès !" -ForegroundColor Green
Write-Host "Note : Le dossier 'node_modules' sera créé lors de l'exécution de 'npm install'."