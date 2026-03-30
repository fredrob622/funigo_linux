#!/bin/bash

# Aller dans le dossier du projet
cd /var/www/funigo/

# Ajouter les modifications (nouveaux articles, fichiers robots.txt, etc.)
git add .

# Créer un commit avec la date du jour
DATE=$(date +'%Y-%m-%d %H:%M')
git commit -m "Sauvegarde automatique du $DATE"

# Pousser vers le dépôt distant (branche main)
# Note : assurez-vous que vos identifiants sont mémorisés (voir plus bas)
git push origin main
