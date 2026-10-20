// /public/js/dialogue-audio.js
// Lecture du dialogue complet : Aiko = voix de femme, Kenji = voix d'homme (le nom n'est pas lu)
(function () {

    // const $ : déclare une constante nommée $ — un choix d'écriture emprunté à jQuery, 
    // mais ici sans aucune bibliothèque : c'est simplement un nom de variable.
    // const $ = id => document.getElementById(id);
    // const monBouton = document.getElementById('monBouton');
    // const monBouton = $('monBouton');

    const $ = id => document.getElementById(id);

    // C'est un « garde-fou » (garde conditionnelle) : si une des deux conditions échoue, la fonction s'arrête immédiatement avec return.
    // <button type="button" id="da-play" class="vocab_href">🔊 Écouter le dialogue</button>
    // peechSynthesis est l'API Web Speech du navigateur : elle permet de faire lire un texte à voix haute (synthèse vocale).
    // 'x' in window teste si la propriété x existe dans l'objet window (donc si le navigateur la supporte).
    // S'il n'existe pas dans la page, getElementById renvoie null, et !null vaut true.

    if (!$('da-play') || !('speechSynthesis' in window)) return;

    // On stocke l'API speechSynthesis dans une constante synth 
    const synth = window.speechSynthesis;
    // voices = [] : un tableau (vide pour l'instant) qui accueillera la liste des voix installées sur la machine (Kyoko, Otoya, Google 日本語…).

    let voices = [], token = 0;

    const FEM = /kyoko|haruka|ayumi|nanami|mizuki|sayaka|o-ren|female|女|google 日本語|hina|shiori/i;
    const MAL = /ichiro|otoya|keita|takumi|hattori|male|男|daichi|naoki/i;

    // Les répliques sont lues directement dans la page (colonne kanji affichée)    <p><%= article.kanji %>   </p>
    // querySelectorAll('.article-dialogue-toggle') retrouve toutes les divs en-têtes générées par la boucle EJS 
    // (la classe sert de point de rendez-vous entre le template et le script). 
    // Array.from(…) les convertit en tableau pour pouvoir itérer facilement.

    const entetes = Array.from(document.querySelectorAll('.article-dialogue-toggle'));

    console.log('entetes', entetes[0]); //entete est tableau qui contient toutes les phrases en kanji
    // pour index 0 "Aiko : 昨日、友達 と 公園に 行きました。"
    // textContent: " \n                   \n                    Aiko : 昨日、友達 と 公園に 行きました。   \n\n\n                "


    const lines = entetes.map((el, i) => {

        // .trim() : supprime les espaces/sauts de ligne en début et fin.
        // .match(/^(Aiko|Kenji)\s*[:：]\s*([\s\S]+)$/i) 
        // ^ début de la chaîne - (Aiko|Kenji) groupe 1 : le nom du locuteur — soit « Aiko » soit « Kenji »
        // \s*[:：]\s* : zéro ou plusieurs espaces, suivi d'un caractère « : » ou « ： », suivi de zéro ou plusieurs espaces
        // \s* espaces éventuels après les deux-points
        // ([\s\S]+) groupe 2 : le texte de la réplique (au moins un caractère, y compris les sauts de ligne)
        // $ fin de la chaîne
        // i : insensible à la casse (Aiko, aiko, AIKO…)

        const m = el.textContent.trim().match(/^(Aiko|Kenji)\s*[:：]\s*([\s\S]+)$/i);

        //console.log('m', m); //m est tableau qui contient le nom du locuteur et la phrase en kanji

        // Opérateur ternaire : si m est nul (le texte ne suit pas le format attendu), on renvoie null ; sinon on construit un objet avec trois propriétés :
        // /^aiko$/i.test(m[1]) : teste si le nom capturé (m[1]) est « aiko » — ^…$ exige la correspondance totale (pas juste une portion), /i ignore la casse.

        // {
        // idx:  i,                    // position dans entetes (pour repérer la ligne à l'écran)
        // who:  … ? 'Aiko' : 'Kenji', // le locuteur, normalisé
        // text: m[2].trim()           // la réplique, nettoyée des espaces parasites
        // }
        return m ? { idx: i, who: /^aiko$/i.test(m[1]) ? 'Aiko' : 'Kenji', text: m[2].trim() } : null;

        //  .filter(Boolean)
        // map a produit un tableau contenant des objets et des null (lignes non reconnues, divs vides, en-têtes sans « Nom : »…).
        // filter(Boolean) garde uniquement les éléments « truthy » — les null sont supprimés.


    }).filter(Boolean);

        //     console.log('lines', lines); //lines est tableau qui contient les objets {idx, who, text} pour chaque réplique

        // lines est un tableau d'objets représentant les répliques du dialogue, avec l'index de la ligne, le locuteur (Aiko ou Kenji) et le texte de la réplique.
        // Array(7) [ {…}, {…}, {…}, {…}, {…}, {…}, {…} ]
        // ​
        // 0: Object { idx: 0, who: "Aiko", text: "昨日、友達 と 公園に 行きました。" }
        // ​
        // 1: Object { idx: 1, who: "Kenji", text: "いい です ね。 公園 で 何を しました か。" }
        // ​
        // 2: Object { idx: 2, who: "Aiko", text: "犬 と 遊びました。 犬 は とても 面白い です。" }
        // ​
        // 3: Object { idx: 3, who: "Kenji", text: "犬 は 鳴きました か。" }
        // ​
        // 4: Object { idx: 4, who: "Aiko", text: "はい、たくさん 鳴きました。でも、猫 は 鳴きませんでした。" }
        // ​
        // 5: Object { idx: 5, who: "Kenji", text: "誰 の 猫 です か。" }
        // ​
        // 6: Object { idx: 6, who: "Aiko", text: "私 の 友達 の 猫 です。" }
        // ​
        // <prototype>: Array []

    function loadVoices() {
        // récupérer les voix japonaises  const synth = window.speechSynthesis; stoke API Web Speech du navigateur

        // synth.getVoices() : demande au navigateur la liste de toutes les voix installées sur la machine 
        // — toutes langues confondues : français, anglais, japonais, etc. (cela peut représenter des dizaines de voix).
        // filter(v => /^ja/i.test(v.lang)) : garde uniquement celles dont le code de langue commence par « ja » : Le test /^ja/i.test('ja-JP') → true

        voices = synth.getVoices().filter(v => /^ja/i.test(v.lang));

        // Une fonction locale, déclarée à l'intérieur de loadVoices (donc invisible depuis l'extérieur). Elle remplit un menu déroulant <select> avec les voix trouvées. Elle prend deux paramètres :
        // sel : l'élément <select> HTML à remplir (par exemple un menu « voix d'Aiko » et un menu « voix de Kenji » dans votre page).
        // ick : l'index de la voix à sélectionner par défaut (celle qui sera affichée choisie dans le menu au chargement).

        const fill = (sel, pick) => {
            sel.innerHTML = ''; // on vide le menu déroulant avant de le remplir
            // !voices.length : vrai si le tableau est vide 
            if (!voices.length)
                // -1 est une valeur sentinelle : convention classique pour dire « pas de choix valide ». Le reste du code testera probablement 
                // if (voiceIndex >= 0) avant d'utiliser une voix, et retombera sur la voix par défaut du système sinon (qui lira le japonais… avec un accent, si elle l'accepte du tout).
                 { sel.innerHTML = '<option value="-1">(voix par défaut)</option>'; 
                    return; //on sort, inutile de continuer à remplir.
                    }

            // Pour chaque voix japonaise v (à l'index i dans le tableau voices) :new Option(v.name, i) : crée une option HTML <option>.
            // 1er argument v.name = le texte affiché dans le menu (ex. « Kyoko », « Google 日本語 », « Otoya ») ;
            // 2e argument i = la valeur renvoyée quand l'utilisateur choisit cette option.
            // sel.add(…) : ajoute l'option au menu.

            voices.forEach((v, i) => sel.add(new Option(v.name, i)));
            sel.value = pick;
        };

        // const FEM = /kyoko|haruka|ayumi|nanami|mizuki|sayaka|o-ren|female|女|google 日本語|hina|shiori/i;
        // const MAL = /ichiro|otoya|keita|takumi|hattori|male|男|daichi|naoki/i;

        let f = voices.findIndex(v => FEM.test(v.name) && !MAL.test(v.name)); // voix féminine par défaut
        let m = voices.findIndex(v => MAL.test(v.name)); // voix masculine par défaut

        //console.log('f', f, 'm', m, ); //f 0 m 2
        if (f < 0) f = 0;
        if (m < 0) m = voices.length > 1 ? (f === 0 ? 1 : 0) : 0;

        // <label>Aiko <select id="da-vf"></select></label>
        // <label>Kenji <select id="da-vm"></select></label>
        // const $ = id => document.getElementById(id);

        fill($('da-vf'), f); fill($('da-vm'), m);

        // <span id="da-msg"></span>
        // .textContent = … : remplace le texte de cet élément — sans interpréter de HTML (contrairement à innerHTML), donc sûr et adapté à un simple message.
        $('da-msg').textContent = !voices.length
            ? "Aucune voix japonaise installée sur cet appareil." //aucune voix japonaise
            : (voices.length === 1 ? "Une seule voix japonaise : la hauteur du son distingue femme et homme." : ""); // une seule voix japonaise
    }

    // On appelle la fonction dès l'exécution du script, pour peupler les menus le plus tôt possible.
    // Problème connu de l'API : au chargement initial de la page, synth.getVoices() renvoie souvent un tableau vide — les moteurs de voix se chargent en arrière-plan et le navigateur ne les a pas encore « découverts ». Selon les navigateurs :parfois le premier appel fonctionne directement,
    // souvent il renvoie [] et les menus affichent « (voix par défaut) » avec le message « aucune voix japonaise ».

    loadVoices();

    // synth.onvoiceschanged = … : l'événement onvoiceschanged est déclenché par le navigateur quand la liste des voix disponibles change 
    // (par exemple quand les moteurs de voix sont chargés).
    // On réexécute loadVoices pour mettre à jour les menus déroulants avec les voix japonaises nouvellement disponibles.

    synth.onvoiceschanged = loadVoices;

    // Le rôle : effacer le surlignage
    // clearHl = « clear highlight » : une fonction qui retire le surlignage de toutes les lignes de dialogue en cours de lecture.
    // Concrètement, pendant la lecture vocale, le script met probablement la réplique en cours en évidence, par exemple 
    // entetes[line.idx].classList.add('da-en-cours'); dans fonction lireTout(). 
    // clearHl() supprime cette classe de tous les éléments, pour que plus aucune ligne ne soit surlignée.
    const clearHl = () => document.querySelectorAll('.da-en-cours').forEach(e => e.classList.remove('da-en-cours'));

    // line 0: Object { idx: 0, who: "Aiko", text: "昨日、友達 と 公園に 行きました。" }
    // cette fonction fait lire une réplique à voix haute et renvoie une Promesse pour enchaîner les lignes suivantes
    // speak renvoie une Promesse qui se résout quand la réplique est terminée.
    function speak(line) {
        return new Promise(res => {

            // SpeechSynthesisUtterance : l'objet qui représente « une chose à dire » — on lui donne un texte et des réglages, puis on le passe à synth.speak().
            // line.text.replace(/\s+/g, '') : supprime tous les espaces blancs (espaces, tabulations, retours à la ligne — \s+ = une suite d'espacements, 
            // g = partout dans la chaîne). Le japonais s'écrit sans espaces
            const u = new SpeechSynthesisUtterance(line.text.replace(/\s+/g, ''));
            console.log('speak', line.who, line.text, u);
            // speak Aiko 昨日、友達 と 公園に 行きました。 
            // SpeechSynthesisUtterance { text: "昨日、友達と公園に行きました。", 
            // lang: "ja-JP", voice: SpeechSynthesisVoice, 
            // volume: 1, 
            // rate: 0.8999999761581421, 
            // pitch: 1.2000000476837158, 
            // onstart: null, 
            // onend: onerror(), 
            // onerror: onerror(), onpause: null }

            // u.lang = 'ja-JP' : langue japonaise — guide le navigateur pour la prononciation
            u.lang = 'ja-JP';
            // u.rate : la vitesse de lecture. $('da-rate') est probablement un <input type="range"> sur la page ; sa valeur .value est une chaîne ("0.8", "1"…), 
            // d'où pparseFloat pour la convertir en nombre (l'API exige un nombre : 0.5 = lent, 1 = normal, 2 = rapide).
            u.rate = parseFloat($('da-rate').value);

            // Choisir la voix selon le personnage
            // line.who === 'Aiko' ? $('da-vf') : $('da-vm') : si c'est Aiko qui parle → menu da-vf (voix féminine) ; sinon (Kenji) → menu da-vm (voix masculine). 
            // Ce sont les <select> remplis par fill() dans loadVoices.
            // .value : l'index choisi dans le menu (souvenez-vous : la valeur de chaque option est l'index dans voices) — c'est une chaîne, d'où parseInt.
            const v = voices[parseInt((line.who === 'Aiko' ? $('da-vf') : $('da-vm')).value)];

            if (v) { u.voice = v; u.lang = v.lang; }

            // same : vrai si on n'a qu'une seule voix japonaise installée, ou si l'utilisateur a choisi la même voix pour Aiko et Kenji.
            const same = voices.length < 2 || $('da-vf').value === $('da-vm').value;

            // Même voix → écart fort pour marquer la différence : Aiko 1.6 (très aiguë), Kenji 0.5 (très grave)
            u.pitch = same ? (line.who === 'Aiko' ? 1.6 : 0.5) : (line.who === 'Aiko' ? 1.2 : 0.8);

            // u.onend = u.onerror = … : la même fonction assignée aux deux événements — fin normale ou erreur (voix indisponible, interruption…). 
            // Dans les deux cas, on appelle res() : la Promesse est résolue, le await du code appelant se débloque, la réplique suivante peut commencer.
            u.onend = u.onerror = () => res();

            // synth.speak(u) : lance réellement la lecture — met l'utterance dans la file du navigateur et rend la main immédiatement 
            // (d'où l'importance de la Promesse).
            synth.speak(u);
        });
    }

    // async permet d'utiliser await à l'intérieur : la fonction peut marquer une pause (attendre la fin d'une lecture) sans bloquer le navigateur.
    // Sans cela, impossible d'écrire await speak(line).

    async function lireTout() {

        // synth.cancel(); couper toute lecture en cours
        // Vide immédiatement la file de speechSynthesis et arrête la voix en cours.
        // Si l'utilisateur clique une deuxième fois sur « play » pendant une lecture, il faut tuer l'ancienne lecture 
        // avant de démarrer la nouvelle — sinon les deux se superposent.
       
        synth.cancel();
        
        // ++token : incrémente le compteur global puis renvoie la nouvelle valeur. Chaque appel à lireTout prend un numéro unique — son « jeton ».
        // my : « c'est mon numéro de lecture ».
        // quand deux lectures se chevauchent (double clic sur play, ou clic play puis stop), seule la plus récente doit continuer. 
        // L'ancienne boucle, elle, doit s'arrêter dès qu'elle rend la main — c'est le test suivant :

        const my = ++token;

        // Parcourt les répliques dans l'ordre : { idx, who, text } préparées par le map/filter du début.
        
        for (const line of lines) {

            // si une lecture plus récente a démarré, on abandonne avant même de surligner ou de parler.
            if (my !== token) return;

            // clearHl() : efface le surlignage partout (la ligne précédente) ;
            clearHl();
            // puis l'ajoute sur la ligne en cours. C'est pour ça que idx était conservé : entetes[line.idx]
            entetes[line.idx].classList.add('da-en-cours');

            // Lire la réplique et attendre sa fin
            // Lance la lecture vocale (voix et pitch selon Aiko/Kenji) et attend que la Promesse de speak se résolve (événement onend/onerror).
            await speak(line);

            // Pause de 350 ms entre les répliques pour que la lecture ne soit pas trop rapide et que l'utilisateur ait le temps de voir le surlignage.
            await new Promise(r => setTimeout(r, 350));
        }

        //  nettoyer si on est toujours légitime
        if (my === token) clearHl();
    }

    $('da-play').addEventListener('click', lireTout);
    
    $('da-stop').addEventListener('click', () => { token++; synth.cancel(); clearHl(); });
    
    window.addEventListener('beforeunload', () => synth.cancel());
})();
