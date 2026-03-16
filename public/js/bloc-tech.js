document.addEventListener('DOMContentLoaded', function() {
    
    // --- GESTION DE L'ACCORDÉON (CODE EXISTANT) ---
    const toggleButtons = document.querySelectorAll('.article-tech-toggle');
    
    if (toggleButtons.length > 0) {
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target-id');
                const contentToToggle = document.getElementById(targetId);
                
                if (contentToToggle) {
                    contentToToggle.classList.toggle('bloc_tech_hidden');
                    this.classList.toggle('active');
                }
            });
        });
    }

    // --- GESTION DES BOUTONS DE FICHIER (NOUVEAU CODE) ---
    // 1. On sélectionne tous les boutons avec la classe définie dans l'EJS
    const fileButtons = document.querySelectorAll('.btn-open-file');

    // 2. On attache l'événement click
    fileButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); // Empêche un rechargement de page accidentel
            
            // On récupère le nom du fichier depuis l'attribut data-fichier
            const fichier = this.getAttribute('data-fichier');
            if(fichier) {
                openTxtInNewTab(fichier);
            }
        });
    });

});

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('btn-open-file')) {
    const fileName = e.target.dataset.fichier;
    if (fileName) {
      window.open('fichier/fichier_note_tech/' + encodeURIComponent(fileName), '_blank');
    }
  }
});

