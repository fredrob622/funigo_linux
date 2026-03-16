// Fichier : public/js/quiz.js (VERSION INTERACTIVE)

// Appel avec une valeur définie dans le HTML :

// en JavaScript, lorsque l'on parle de document (comme dans document.addEventListener ou document.getElementById), 
// on fait référence à la page HTML actuellement chargée dans le navigateur.

// document.addEventListener() est une méthode JavaScript fondamentale qui vous permet d'attacher une fonction 
// (un "écouteur d'événement" ou "event listener") à un événement spécifique qui se produit sur un élément du document HTML.

// element.addEventListener(event, function, useCapture);

// element : L'objet sur lequel l'événement est écouté (par exemple, document, window, un bouton, une div, etc.).
// event : Une chaîne de caractères spécifiant le nom de l'événement à écouter (par exemple, 'click', 'mouseover', 'submit', 'DOMContentLoaded').
// function : La fonction à exécuter lorsque l'événement se produit. C'est votre "gestionnaire d'événement".
// useCapture (optionnel) : Un booléen (vrai/faux) qui spécifie si l'événement doit être exécuté en phase de capture ou de propagation. Généralement false (par défaut) pour la propagation.

// En termes simples, c'est comme dire au navigateur : "Quand cet événement se produit sur cet élément, exécute cette fonction."

// DOMContentLoaded est un événement JavaScript qui se déclenche lorsque le document HTML initial a été entièrement chargé et 
// analysé par le navigateur, sans attendre que les feuilles de style, les images et les sous-cadres aient fini de charger.

document.addEventListener("DOMContentLoaded", () => {
    // --- VARIABLES D'ÉTAT DU QUIZ ---
    // Elles gardent en mémoire la progression du jeu.
    let questionsArray = [];       // Le tableau complet de toutes les questions.
    let tabNombreDeQuestion = [];  // Le tableau des numéros de questions RESTANTES.
    let score = 0;                 // Le score du joueur.
    let questionsPosees = 0;       // Le nombre de questions jouées.
    let currentQuestion = null;    // L'objet de la question actuellement affichée.
    
    // --- ÉLÉMENTS DU DOM ---
    // Dans ejs <div id="affichage"></div>
    //      <button id="continue-btn" style="display: none;">CONTINUE</button>
    //     <button id="end-btn" style="display: none;">FIN</button>
    const affichageDiv = document.getElementById('affichage');
    const continueBtn = document.getElementById('continue-btn');
    const endBtn = document.getElementById('end-btn');

    // --- INITIALISATION DU QUIZ ---
    // Cette fonction prépare le jeu.
    function initQuiz() {
        // Dans ejs <div data-nbquestion="<%= results.length %>"> </div>
        // <!-- data-nbquestion c'est le nombre ligne qui est envoyé à quiz.js-->
        // <!-- data-nbquestion: C'est un attribut de données HTML5 (ou "data attribute"). 

        //   Les attributs data-* sont un moyen standard de stocker des données personnalisées, privées, sur des éléments HTML.
        //   Ces données peuvent ensuite être accédées et manipulées facilement avec JavaScript. Le nom nbquestion ici est 
        //   arbitraire et choisi par le développeur pour sa signification. -->
        const nbElement = document.querySelector('[data-nbquestion]');

        // Si l’élément existe, sa valeur sera un objet DOM correspondant S’il n’existe pas, sa valeur sera null
        // L’opérateur ET logique && signifie que les deux conditions entourant l’opérateur doivent être vraies

        // parseInt(nbElement.dataset.nbquestion, 10) > 0

        // nbElement.dataset.nbquestion => lire la valeur de l’attribut HTML data-nbquestion de l’élément.
        // cette valeur est toujours une chaîne de caractères, même si tu mets un chiffre dans le HTML.

        // parseInt(..., 10) Convertit cette chaîne en nombre entier. Le 10 base décimal.

        if (nbElement && parseInt(nbElement.dataset.nbquestion, 10) > 0) {
            
            // 1. Récupérer les données des questions
            
            // --- Récupération des données complètes des questions ---
            // On lit le contenu de notre balise script <script id="questions-data" type="application/json"> <%- JSON.stringify(results) %> </script>
            const questionsJsonString = document.getElementById('questions-data').textContent;
            questionsArray = JSON.parse(questionsJsonString);

            // On le parse en un vrai tableau JavaScript
            // Par exemple, questionsJsonString pourrait contenir la valeur suivante :
            // '[{"id": 1, "question": "Quelle est la capitale du Japon?", "answer": "Tokyo"}, {"id": 2, "question": "2+2?", "answer": "4"}]'
            
            // JSON.parse(): C'est une méthode JavaScript intégrée (faisant partie de l'objet global JSON).
            // Sa fonction est de parser (analyser) une chaîne de caractères JSON et de la convertir en un objet ou une valeur JavaScript correspondante.
            // Si la chaîne JSON représente un tableau (comme dans l'exemple ci-dessus), JSON.parse() la convertira en un tableau JavaScript.
            // Si la chaîne JSON représente un objet (par exemple, '{"name": "Alice", "age": 30}'), JSON.parse() la convertira en un objet JavaScript
            
            // Déclare une nouvelle constante (const) nommée questionsArray.
            // Cette constante va stocker le tableau JavaScript (ou l'objet JavaScript) qui résulte de l'analyse de la chaîne questionsJsonString 
            // par JSON.parse(). 
            
            // 2. Créer la liste des numéros de questions
            tabNombreDeQuestion = Array.from({ length: questionsArray.length }, (_, i) => i + 1);

            // 3. Afficher la première question
            displayNextQuestion();
            
            // 4. Montrer le bouton "FIN"
            endBtn.style.display = 'inline-block';
        } else {
            affichageDiv.innerHTML = "Veuillez choisir un niveau pour commencer le quiz.";
        }
    }

    // --- AFFICHER LA QUESTION SUIVANTE ---
    // C'est le cœur de la boucle de jeu.
    function displayNextQuestion() {
        // S'il n'y a plus de questions, on termine le jeu.
        if (tabNombreDeQuestion.length === 0) {
            endQuiz();
            return;
        }

        // Cacher le bouton "CONTINUE"
        continueBtn.style.display = 'none';

        // Choisir une question au hasard parmi celles qui restent

                // --- Logique du jeu ---
        // Sélectionner un élément aléatoire dans un tableau en générant un index aléatoire valide pour ce tableau.
        // Math.random(): C'est une fonction JavaScript intégrée qui renvoie un nombre flottant pseudo-aléatoire dans l'intervalle [0, 1)

        // Si Math.random() renvoie 0.1, et que tabNombreDeQuestion.length est 49, le résultat sera 0.1 * 49 = 4.9.
        // Math.floor(...): C'est une fonction JavaScript intégrée qui arrondit un nombre à l'entier inférieur le plus proche.
            // Math.floor(4.9) donnera 4.
            // Math.floor(48.951) donnera 48.

        const randomIndex = Math.floor(Math.random() * tabNombreDeQuestion.length);

        // On récupère le *numéro* de la question à afficher
        const questionNumber = tabNombreDeQuestion[randomIndex];

        // q.index_quiz: Accède à la propriété index_quiz de l'objet q et compare à questionNumber
        currentQuestion = questionsArray.find(q => q.index_quiz === questionNumber);

        // Afficher la question et les réponses

        // data-answer="A" : C'est un attribut de données personnalisé HTML5 (data-*).
        // Les attributs data-* sont conçus pour stocker des données personnalisées, privées, et spécifiques à la page ou à l'application 
        // directement dans le HTML. Ces données ne sont pas visibles pour l'utilisateur final sur la page, mais peuvent être facilement 
        // accédées et manipulées par JavaScript.

        // Ici, data-answer="A" stocke la valeur "A". Cela signifie que ce bouton représente l'option de réponse "A". Lorsque l'utilisateur 
        // clique sur ce bouton, votre code JavaScript pourra lire cet attribut (buttonElement.dataset.answer) pour savoir quelle option a 
        // été choisie par l'utilisateur. C'est très utile pour vérifier la réponse.
        affichageDiv.innerHTML = `
            <div class="quiz-question-container">
                <h3>Question n°${questionsPosees + 1} (Année: ${currentQuestion.ANNEE})</h3>

                <p class="question-text">Dans la phrase ou le texte suivant:</p>
                <p class="question-text quiz-txt-question">${currentQuestion.TEXTE}</p>
                <p class="question-text">Question :</p>
                <p class="question-text quiz-txt-question">${currentQuestion.QUESTION}</p>
            </div>
            <div class="quiz-options-container">
                <button class="quiz-btn-question" data-answer="A">A : ${currentQuestion.REP1}</button>
                <button class="quiz-btn-question" data-answer="B">B : ${currentQuestion.REP2}</button>
                <button class="quiz-btn-question" data-answer="C">C : ${currentQuestion.REP3}</button>
                <button class="quiz-btn-question" data-answer="D">D : ${currentQuestion.REP4}</button>
            </div>
        `;

        // Retirer la question de la liste des questions restantes
        tabNombreDeQuestion.splice(randomIndex, 1);

        // Ajouter les écouteurs d'événements aux nouveaux boutons de réponse
        // Cette portion de code est un pattern très courant et efficace en JavaScript 
        // pour attacher des écouteurs d'événements à plusieurs éléments similaires sur une page HTML.

        // Résultat de cette partie : Une NodeList contenant tous les éléments <button> ayant la classe quiz-btn-question.
        document.querySelectorAll('.quiz-btn-question').forEach(button => {
            // button.addEventListener('click', handleAnswerClick); :
            // button : Fait référence à l'élément <button> individuel dans l'itération actuelle de la boucle forEach.
            // .addEventListener() : Comme nous l'avons expliqué précédemment, cette méthode attache un écouteur d'événement 
            // à un élément. 'click' : C'est l'événement que nous écoutons. Dans ce cas, nous voulons réagir lorsque l'utilisateur 
            // clique sur le bouton.
            
            button.addEventListener('click', handleAnswerClick);
        });
    }

    // --- GÉRER LE CLIC SUR UNE RÉPONSE ---
    function handleAnswerClick(event) {
        questionsPosees++;
        const selectedButton = event.target;
        const userAnswer = selectedButton.dataset.answer;

        // Vérifier si la réponse sélectionnée est correcte
        if (userAnswer === currentQuestion.REP_OK) {
            score++;
            // Ajoute la classe "correct" Le bouton devient vert
            selectedButton.classList.add('correct');
        } else {
            // // Ajoute la classe "correct" Le bouton devient rouge
            selectedButton.classList.add('incorrect');

            // Mettre en évidence la bonne réponse
            // Si la réponse est bonne 
            const correctButton = document.querySelector(`.quiz-btn-question[data-answer="${currentQuestion.REP_OK}"]`);
            if (correctButton) {
                // La bonne réponse est en vert
                correctButton.classList.add('correct');
            }
        }
        
        // Désactiver tous les boutons de réponse
        document.querySelectorAll('.quiz-btn-question').forEach(button => {
            button.disabled = true;
        });

        // Afficher le bouton "CONTINUE"
        continueBtn.style.display = 'inline-block';
    }

    // --- TERMINER LE QUIZ ET AFFICHER LE SCORE ---
    function endQuiz() {
        affichageDiv.innerHTML = `
            <h2>Quiz Terminé !</h2>
            <p>Votre score est de :</p>
            <p style="font-size: 2em; font-weight: bold;">${score} / ${questionsPosees}</p>
        `;
        // Cacher les boutons de contrôle
        continueBtn.style.display = 'none';
        endBtn.style.display = 'none';
    }

    // --- ÉCOUTEURS D'ÉVÉNEMENTS POUR LES BOUTONS DE CONTRÔLE ---
    // Si on clique sur CONTINUE On recherche la question suivante par la fonction "displayNextQuestion"
    continueBtn.addEventListener('click', displayNextQuestion);
    // Si on clique sur FIN on affiche le score 
    endBtn.addEventListener('click', endQuiz);

    // --- DÉMARRER LE JEU ---
    initQuiz();
});