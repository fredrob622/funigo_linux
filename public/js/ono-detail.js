document.addEventListener('DOMContentLoaded', () => {
    /**
     * Fonction pour traiter le texte du DÉTAIL : retire la première section (intro) 
     * et les éventuels espaces et sauts de ligne au début, en se basant sur '\n\n'.
     * Ceci est spécifiquement pour le champ 'detail' (qui a une intro à retirer).
     * @param {string} rawText - Le texte brut du champ 'detail' lu depuis l'attribut data-detail-brut.
     * @returns {string} Le texte modifié, sans la première section d'introduction.
     */
    function cleanDetailSection(rawText) {
        if (!rawText) return '';
        
        // 1. Supprimer les espaces et sauts de ligne au début et à la fin.
        const trimmedText = rawText.trim();

        // 2. Chercher la fin de la première section (marquée par '\n\n' dans vos données CSV).
        const firstDoubleNewlineIndex = trimmedText.indexOf('\n\n');

        if (firstDoubleNewlineIndex !== -1) {
            // Retourner tout ce qui suit '\n\n', puis supprimer les espaces/sauts de ligne supplémentaires au début du résultat.
            return trimmedText.substring(firstDoubleNewlineIndex).trim();
        }

        // Si la structure de séparation n'est pas trouvée (cas non standard), on retourne le texte simplement nettoyé des bords.
        return trimmedText; 
    }
    

    /**
     * Fonction pour afficher/masquer la ligne de détail associée.
     * @param {HTMLElement} clickedRow - La ligne principale (tr) qui a été cliquée.
     */
    function toggleDetail(clickedRow) {
        // 1. Trouver la ligne suivante (qui est la ligne de détail)
        const detailRow = clickedRow.nextElementSibling;
        
        if (detailRow && detailRow.classList.contains('detail-row')) {
            // Logique de bascule de l'affichage
            detailRow.classList.toggle('hidden');
            clickedRow.classList.toggle('active');

            // Logique d'insertion du texte net si le détail vient d'être affiché
            if (!detailRow.classList.contains('hidden')) {
                
                // --- Traitement du Détail (detail-text) ---
                const detailTextElement = detailRow.querySelector('.detail-text');
                const rawDetail = detailRow.getAttribute('data-detail-brut');
                
                if (detailTextElement && rawDetail) {
                    // Utilisation de la fonction spécifique de nettoyage pour le détail
                    const cleanDetailText = cleanDetailSection(rawDetail); 
                    // Utiliser innerHTML pour conserver les sauts de ligne \n (interprétés par la classe pre-wrap)
                    detailTextElement.innerHTML = cleanDetailText;
                }

                // --- Traitement de l'Exemple (exemple-text) ---
                const exempleTextElement = detailRow.querySelector('.exemple-text');
                const rawExemple = detailRow.getAttribute('data-exemple-brut');

                if (exempleTextElement && rawExemple) {
                    // Pour l'exemple, nous évitons le nettoyage agressif et nous contentons de supprimer 
                    // les espaces inutiles en bordure (.trim()).
                    exempleTextElement.innerHTML = rawExemple.trim();
                }
            }
        } else {
            console.error("Erreur de structure de table : La ligne de détail suivante n'a pas été trouvée.");
        }
    }

    // Attacher l'événement 'click' à toutes les lignes 'main-row'
    document.querySelectorAll('.main-row').forEach(row => {
        row.addEventListener('click', function() {
            toggleDetail(this);
        });
    });
});
