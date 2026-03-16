// public/js/quiz-orale2.js


document.addEventListener('DOMContentLoaded', () => {


    
    // =================================================================
    // ==         INITIALISATION DE LA SYNTHÈSE VOCALE             ==
    // =================================================================
    // On exécute cette partie sur toutes les pages où le script est chargé
    const synth = window.speechSynthesis;

    // Fonction pour "réveiller" l'API. C'est la clé.
    function warmUpSpeechSynthesis() {
        // Crée un énoncé vide
        const warmUpUtterance = new SpeechSynthesisUtterance('');
        // Le lance avec un volume de 0 pour qu'il soit inaudible
        warmUpUtterance.volume = 0;
        // L'envoie au synthétiseur.
        synth.speak(warmUpUtterance);
        console.log("Synthèse vocale 'réchauffée' et prête.");
    }

    // On attache l'événement de réveil à la première interaction possible, UNE SEULE FOIS.
    document.body.addEventListener('click', warmUpSpeechSynthesis, { once: true });
    document.body.addEventListener('submit', warmUpSpeechSynthesis, { once: true });
    
    // --- Le reste du code ne s'exécute que si le quiz est affiché ---
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) {
        return;
    }
    
    // --- Préparation des voix (uniquement sur la page du quiz) ---
    let voices = [];
    function populateVoiceList() {
        voices = synth.getVoices();
        console.log("Voix chargées :", voices);
    }
    populateVoiceList();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }


    // --- LOGIQUE DU QUIZ EXISTANTE ---
    const continuerBtn = document.getElementById('continuer-btn');
    const arreterBtn = document.getElementById('arreter-btn');
    const scoreElement = document.getElementById('score');
    const questions = document.querySelectorAll('.question-container');
    const totalQuestions = questions.length;

    let currentQuestionIndex = 0;
    let score = 0;
    let answerChecked = false;

    continuerBtn.addEventListener('click', () => {
        const currentQuestion = questions[currentQuestionIndex];
        const selectedAnswer = currentQuestion.querySelector(`input[name="reponse-${currentQuestionIndex}"]:checked`);
        const feedbackElement = document.getElementById(`feedback-${currentQuestionIndex}`);

        if (answerChecked) {
            currentQuestion.classList.remove('active');
            
            currentQuestionIndex++;
            if (currentQuestionIndex < totalQuestions) {
                questions[currentQuestionIndex].classList.add('active');
                continuerBtn.textContent = 'Valider';
                answerChecked = false;
            } else {
                continuerBtn.style.display = 'none';
                arreterBtn.style.display = 'block';
                arreterBtn.textContent = `Quiz terminé ! Score : ${score}/${totalQuestions}. Recommencer ?`;
            }
            return;
        }

        if (!selectedAnswer) {
            feedbackElement.textContent = "Veuillez sélectionner une réponse.";
            feedbackElement.style.color = "red";
            return;
        }

        const correctAnswer = currentQuestion.getAttribute('data-rep-ok');
        if (selectedAnswer.value === correctAnswer) {
            score++;
            scoreElement.textContent = score;
            feedbackElement.textContent = "Bonne réponse !";
            feedbackElement.style.color = "green";
        } else {
            feedbackElement.textContent = `Mauvaise réponse. La bonne réponse était : ${correctAnswer}`;
            feedbackElement.style.color = "orange";
        }
        
        answerChecked = true;
        continuerBtn.textContent = 'Question Suivante';
        if (currentQuestionIndex === totalQuestions - 1) {
            continuerBtn.textContent = 'Voir le score final';
        }

        const radioButtons = currentQuestion.querySelectorAll(`input[name="reponse-${currentQuestionIndex}"]`);
        radioButtons.forEach(radio => radio.disabled = true);
    });

    arreterBtn.addEventListener('click', () => {
        window.location.href = '/quiz_orale'; 
    });


    // =================================================================
    // ==   GESTION CENTRALISÉE DES CLICS (CORRIGÉE ET AMÉLIORÉE)   ==
    // =================================================================
    quizContainer.addEventListener('click', function(event) {
        const button = event.target;

        // --- Logique pour "Voir/Cacher le texte" ---
        if (button.matches('.show-texte-btn')) {
            const questionContainer = button.closest('.question-container');
            const elem = questionContainer.querySelector('.question-text');
            
            if (elem.style.display === "none") {
                elem.style.display = "block";
                button.textContent = "Cacher le texte";
                button.title = "Cacher le texte";
            } else {
                elem.style.display = "none";
                button.textContent = "Voir le texte";
                button.title = "Voir le texte";
            }
        }

        // --- Logique pour "Voir/Cacher la traduction" ---
        if (button.matches('.show-translation-btn')) {
            const questionContainer = button.closest('.question-container');
            const elem = questionContainer.querySelector('.translation-text');

            if (elem.style.display === "none") {
                elem.style.display = "block";
                button.textContent = "Cacher la traduction";
                button.title = "Cacher la traduction";
            } else {
                elem.style.display = "none";
                button.textContent = "Voir la traduction";
                button.title = "Voir la traduction";
            }
        }
        
        // --- Logique de lecture du texte (adaptée pour le JAPONAIS) ---
        if (button.matches('.speak-btn')) {
            if (synth && voices.length > 0) {
                const questionDiv = button.closest('.question-container');
                if (!questionDiv) return;

                const textElement = questionDiv.querySelector('.question-text');
                if (!textElement) return;
                
                const textToSpeak = textElement.textContent;
                synth.cancel(); 

                const utterance = new SpeechSynthesisUtterance(textToSpeak);

                // --- DÉBUT DE LA PARTIE CORRIGÉE POUR LE JAPONAIS ---
                // Recherche une voix japonaise.
                let selectedVoice = voices.find(voice => voice.lang === 'ja-JP' && voice.name.includes('Google'));
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => voice.lang === 'ja-JP' && voice.name.includes('Microsoft'));
                }
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => voice.lang === 'ja-JP');
                }
                
                // Si une voix japonaise est trouvée, on l'applique
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                } else {
                    console.warn("Aucune voix japonaise (ja-JP) n'a été trouvée sur ce navigateur.");
                }
                
                // Paramètres de l'énoncé pour le japonais
                utterance.lang = 'ja-JP'; // On spécifie la langue du texte
                utterance.pitch = 1; 
                utterance.rate = 0.8; // Une vitesse légèrement plus lente est souvent meilleure pour le japonais
                // --- FIN DE LA PARTIE CORRIGÉE ---
                
                setTimeout(() => {
                    synth.speak(utterance);
                }, 100);

            } else {
                if(voices.length === 0) {
                     alert("Les voix de synthèse ne sont pas encore chargées. Veuillez patienter un instant et réessayer.");
                } else {
                     alert("Désolé, votre navigateur ne supporte pas la lecture de texte.");
                }
            }
        }
    });
});