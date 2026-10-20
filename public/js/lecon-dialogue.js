document.addEventListener('DOMContentLoaded', function() {
    // Rôle : Cette ligne garantit que le code JavaScript ne s'exécutera qu'une fois que la structure HTML de la page 
    // sera entièrement chargée et prête. Cela évite d'essayer de cibler des éléments qui n'existeraient pas encore dans la page.
    
    // --- GESTION DE L'ACCORDÉON (CODE EXISTANT) ---
    // Rôle : On recherche dans toute la page HTML tous les éléments possédant la classe CSS .article-dialogue-toggle 
    // (ce sont les en-têtes sur lesquels on clique, générés dynamiquement par votre template EJS). Le résultat est une liste 
    // (NodeList) stockée dans la constante toggleButtons.
    
    const toggleButtons = document.querySelectorAll('.article-dialogue-toggle');
    
    if (toggleButtons.length > 0) {
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target-id');
                const contentToToggle = document.getElementById(targetId);
                
                if (contentToToggle) {
                    contentToToggle.classList.toggle('bloc_dialogue_hidden');
                    this.classList.toggle('active');
                }
            });
        });
    }

});



