// Fichier : public/js/kanji-tracer.js

 document.addEventListener('DOMContentLoaded', () => {
        const targetDiv = document.getElementById('kanji-target');
        
        if (targetDiv) {
            const kanjiChar = targetDiv.dataset.char;

            if (kanjiChar) {
                // L'initialisation est beaucoup plus simple maintenant !
                const writer = HanziWriter.create(targetDiv, kanjiChar, {
                    width: 250,
                    height: 250,
                    padding: 5,
                    showOutline: true,
                    strokeAnimationSpeed: 1,
                    delayBetweenStrokes: 200,
                    showHintAfterMisses: 1,
                    highlightOnComplete: true,

                    showOutline: true, // On s'assure que l'esquisse est bien visible
        
                    // La couleur de l'esquisse de départ
                    outlineColor: '#555555', // Un gris moyen, bien visible sur fond noir
                    
                    // La couleur du tracé final
                    strokeColor: '#FFFFFF', // Blanc pur
                    
                    // La couleur du radical (si présent), on le met en blanc aussi pour la cohérence
                    radicalColor: '#FFFFFF',

                    // IMPORTANT : La couleur du crayon de l'utilisateur en mode "S'entraîner"
                    // Le noir par défaut serait invisible sur fond noir, on le met en vert vif.
                    drawingColor: '#FFFFFF'
                });
                

                document.getElementById('animate-btn').addEventListener('click', () => {
                    writer.animateCharacter();
                });

                document.getElementById('quiz-btn').addEventListener('click', () => {
                    writer.quiz();
                });
            }
        }
    });