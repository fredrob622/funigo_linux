document.querySelectorAll('.btn-speak').forEach(button => {
        button.addEventListener('click', (e) => {
            // Empêche la propagation si vous avez d'autres événements sur le parent
            e.stopPropagation();

            const text = button.getAttribute('data-text');
            
            // On vérifie si l'API est supportée
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ja-JP'; // Force la prononciation japonaise
                // 0.7 est généralement la vitesse idéale pour l'apprentissage des langues
                utterance.rate = 0.6; 

                // Vous pouvez aussi ajuster le pitch (tonalité) si vous voulez une voix plus grave ou aiguë
                utterance.pitch = 1;

                // Stop toute lecture en cours avant de lancer la nouvelle
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            } else {
                alert("Désolé, votre navigateur ne supporte pas la synthèse vocale.");
            }
        });
    });

    const readButton = document.getElementById('read-button');
    const textArea = document.getElementById('text-to-read');

    function playText() {
        const text = textArea.value;
        if ('speechSynthesis' in window) {
            // On annule toute lecture en cours pour éviter les superpositions
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ja-JP';
            utterance.rate = 0.8; // Un peu plus lent pour la compréhension
            
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Désolé, votre navigateur ne supporte pas la synthèse vocale.");
        }
    }

    // 1. Déclenchement au clic sur le bouton
    readButton.addEventListener('click', playText);

    // 2. Déclenchement automatique au chargement
    window.addEventListener('load', () => {
        // Note : Cela peut échouer si l'utilisateur n'a pas encore cliqué sur la page.
        // On tente quand même le coup !
        playText();
    });