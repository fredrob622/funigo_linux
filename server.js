// Importer les modules
require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const axios = require('axios');
const cheerio = require('cheerio');
const { log } = require('console');
const fs = require('fs').promises; // On utilise la version "promise" pour async/await


// Initialiser l'application Express
const app = express();

// Cette ligne est un "middleware". Elle dit à votre application Express : "Pour chaque requête qui arrive, 
// vérifie son en-tête Content-Type. S'il est application/json, alors prends le corps de la requête 
// (qui est une chaîne de caractères JSON) et transforme-le en un véritable objet JavaScript. 
// Stocke cet objet dans req.body."

app.use(express.json()); // Pour parser le corps des requêtes JSON

const PORT = process.env.PORT || 5000;

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour fichiers statiques (CSS, JS, images, html)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour parser le corps des requêtes POST
app.use(express.urlencoded({ extended: true }));

// Pool de connexions MySQL
const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ************************************************************************************************************************
// --- DÉFINITION DES ROUTES ---

// Accueil
app.get('/', async (req, res) => { // La fonction devient 'async'
    try {

        const query = 'SELECT id, titre, contenu, date_creat, blog_url, date_modif FROM blog ORDER BY DATE_MODIF DESC LIMIT 3;';
        console.log("Exécution de la requête :", query);

        const [articles] = await dbPool.query(query);

        // Formatage des dates avant de les passer au template
        const formattedArticles = articles.map(article => {
            // Convertir DATE_CREAT et DATE_MODIF en objets Date JavaScript si ce n'est pas déjà fait
            // Si DATE_CREAT/DATE_MODIF sont des strings, il faut les parser
            const dateCreat = article.date_creat ? new Date(article.date_creat) : null;
            const dateModif = article.date_modif ? new Date(article.date_modif) : null;

            // Définir les options de formatage
            const options = { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false // Pour utiliser le format 24 heures (HH:MM)
            };

            return {
                ...article,
                // Utiliser toLocaleString pour formater la date dans le fuseau horaire local du serveur
                // ou spécifiez un fuseau horaire si nécessaire
                DATE_CREAT_FORMATTED: dateCreat ? dateCreat.toLocaleString('fr-FR', options).replace(',', '') : null, // 'fr-FR' pour le format français, .replace(',', '') pour enlever la virgule entre date et heure
                DATE_MODIF_FORMATTED: dateModif ? dateModif.toLocaleString('fr-FR', options).replace(',', '') : null
            };
        });

        // console.log(`${formattedArticles.length} Liste des articles formatés.`);
        // console.log(formattedArticles);
        console.log("Page d'acceuil avec les 3 derniers articles du blog");
        // 1. Définir le chemin absolu vers le dossier des vidéos
        // path.join est la méthode la plus sûre pour construire des chemins de fichiers
        const videoDirectory = path.join(__dirname, 'public', 'video', 'acceuil');
        
        // 2. Lire tous les noms de fichiers dans le dossier
        const allFiles = await fs.readdir(videoDirectory);
        
        // 3. Filtrer pour ne garder que les fichiers .mp4
        const mp4Files = allFiles.filter(file => file.endsWith('.mp4'));
        
        let randomVideo = 'Funari.mp4'; // Une vidéo par défaut au cas où
        
        // 4. S'il y a des vidéos, en choisir une au hasard
        if (mp4Files.length > 0) {
            const randomIndex = Math.floor(Math.random() * mp4Files.length);
            randomVideo = mp4Files[randomIndex];
        }
        
        console.log(`Vidéo choisie pour la page d'accueil : ${randomVideo}`);
        
        // 5. Rendre la page en passant le nom du fichier vidéo au template
        res.render('pages/index', { 
            title: 'Derniers Articles du blog',
            videoFile: randomVideo ,// On envoie le nom du fichier    
            listeArticles: formattedArticles 
        });
        
    } catch (err) {
        console.error("Erreur lors de la lecture du dossier des vidéos :", err);
        // En cas d'erreur (dossier introuvable, etc.), on rend la page avec la vidéo par défaut
        res.render('pages/index', { 
            title: 'Accueil',
            videoFile: 'Funari.mp4' // Valeur de secours
        });
    }
    
});



// ------------------------------------------------------------- ACCEUIL ----------------------------------------------------------//
// *******************************************************************************************************************************//
// Page acceuil Redirection pour l'ancienne URL index.html
// *******************************************************************************************************************************//

app.get('/index.html', (req, res) => {
    // On fait une redirection 301 (redirection permanente) vers la racine du site.
    // C'est la meilleure pratique pour le SEO.
    res.redirect(301, '/');
});

// ------------------------------------------------------------- LANGUE KANJI ----------------------------------------------------//
// *******************************************************************************************************************************//
// Menu Kanji
// *******************************************************************************************************************************//

app.get('/kanji', (req, res) => {
    try {
        res.render('pages/kanji/kanji_form', { title: 'Kanji'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Kanji :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Dico Kanji_dico JPLT
// *******************************************************************************************************************************//

app.get('/kanji_dico', (req, res) => {
    res.render('pages/kanji/kanji_dico_form', { title: 'Dictionnaire Kanji', results: [], searchTerm: '' });
});

// ... à l'intérieur de app.post('/kanji/search', ...)

app.post('/kanji_dico/search', async (req, res) => {
    const searchTerm = req.body.searchTerm.trim();
    try {
        // --- MODIFICATION DE LA REQUÊTE ---

        // au lieu WHERE kanji LIKE '%日%' on met  WHERE kanji LIKE ?
        const query = `
            SELECT kanji, onyomi, kunyomi, francais, niveau 
            FROM kanji_char 
            WHERE kanji LIKE ? 
               OR onyomi LIKE ? 
               OR kunyomi LIKE ? 
               OR francais LIKE ? 
               OR niveau LIKE ?`; 

        // searchPattern est la donnée à rechercher dans query        
        const searchPattern = `%${searchTerm}%`;

        // Log pour voir la requête SQL et les paramètres
        console.log("--- NOUVELLE RECHERCHE KANJI ---");
        console.log("Requête SQL exécutée :", query);
        console.log("Avec le paramètre de recherche :", searchPattern);

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        res.render('pages/kanji/kanji_dico_form', { title: 'Résultats Kanji', results: results, searchTerm: searchTerm });
    } catch (err) { 
        console.error("ERREUR lors de la recherche Kanji :", err);
        res.status(500).send("Erreur serveur."); 
    }
});

// *******************************************************************************************************************************//
// Dico Kanji_tracer
// *******************************************************************************************************************************//

app.get('/kanji_tracer', (req, res) => {
    res.render('pages/kanji/kanji_tracer_form', { title: 'Tracer du Kanji', results: [], searchTerm: '' });
});

// ... à l'intérieur de app.post('/kanji_tracer/search', ...)

app.post('/kanji_tracer/search', async (req, res) => {
    const searchTerm = req.body.searchTerm;  // On récupère la donnée à chercher 
    try {
        // --- MODIFICATION DE LA REQUÊTE ---

        // au lieu WHERE kanji LIKE '%日%' on met  WHERE kanji LIKE ?
        const query = `
            SELECT kanji, onyomi, kunyomi, francais, niveau 
            FROM kanji_char 
            WHERE kanji LIKE ? 
               OR onyomi LIKE ? 
               OR kunyomi LIKE ? 
               OR francais LIKE ? 
               OR niveau LIKE ?`; 

        // searchPattern est la donnée à rechercher dans query        
        const searchPattern = `%${searchTerm}%`.trim();
        // searchPattern = searchPattern.trim();

        // Log pour voir la requête SQL et les paramètres
        console.log("--- NOUVELLE RECHERCHE KANJI ---");
        console.log("Requête SQL exécutée :", query);
        console.log("Avec le paramètre de recherche :", searchPattern);

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query, [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        res.render('pages/kanji/kanji_tracer_form', { title: 'Résultats Kanji', results: results, searchTerm: searchTerm });
    } catch (err) { 
        console.error("ERREUR lors de la recherche Kanji :", err);
        res.status(500).send("Erreur serveur."); 
    }
});

// *******************************************************************************************************************************//
// Dico KANJI en ligne
// *******************************************************************************************************************************//

app.get('/kanji_free_dico', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/kanji/kanji_free_dico_form', { 
        title: 'Dictionnaire des KANJI en ligne', 
        results: null, // On met null pour dire qu'il n'y a pas encore de résultat
        searchTerm: '' 
    });
});

// ====================================================================
// === NOUVELLE ROUTE : Proxy pour les images de kanji.free.fr ===
// ====================================================================
app.get('/kanji-image-proxy', async (req, res) => {
    try {
        // 1. On récupère le chemin de l'image depuis les paramètres de l'URL
        const imagePath = req.query.path;
        if (!imagePath) {
            return res.status(400).send('Chemin de l\'image manquant');
        }

        // 2. On reconstruit l'URL complète de l'image source
        const imageUrl = `http://kanji.free.fr/${imagePath}`;

        // 3. On télécharge l'image avec axios, en lui disant de traiter la réponse comme des données binaires
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer' 
        });

        // 4. On détermine le type de contenu de l'image (ici, on sait que ce sont des GIF)
        res.setHeader('Content-Type', 'image/gif');
        
        // 5. On envoie les données binaires de l'image au navigateur
        res.send(response.data);

    } catch (error) {
        console.error('Erreur du proxy d\'image:', error.message);
        res.status(500).send('Impossible de charger l\'image');
    }
});

// Fichier: server.js

app.post('/kanji_free_dico/search', async (req, res) => {
    const searchTerm = req.body.searchTerm.trim();
    
    if (!searchTerm) {
        return res.redirect('/kanji_free_dico');
    }

    try {
        const encodedPart = encodeURIComponent(searchTerm);
        const url = `http://kanji.free.fr/kanji.php?utf8=${encodedPart}`;

        console.log(`--- RECHERCHE KANJI EN LIGNE ---`);
        console.log(`Kanji recherché : ${searchTerm}`);
        console.log(`URL cible : ${url}`);
        
        const response = await axios.get(url);
       
        const $ = cheerio.load(response.data);


        // ====================================================================
        // === CHANGEMENT MAJEUR : On parse les données au lieu de prendre le HTML brut ===
        // ====================================================================

        // 1. On sélectionne le conteneur principal avec le bon sélecteur d'attribut
        const mainContent = $('td[width="600"]');
        
        // Si on ne trouve pas le conteneur, on arrête
        if (mainContent.length === 0) {
            throw new Error("Conteneur principal du kanji non trouvé sur la page.");
        }

        // 2. On crée un objet pour stocker toutes nos données
        const kanjiData = {};

        // 3. Extraction des différentes informations
        
        // Le kanji lui-même
        kanjiData.kanji = mainContent.find('font.kanji1').text().trim();

        // Les significations
        // On trouve le titre "Significations", on remonte à sa table parente, on prend la table *suivante*, et on récupère son texte.
        kanjiData.kanji = mainContent.find('font.kanji1').text().trim();
        kanjiData.significations = mainContent.find('font.titre2:contains("Significations")').closest('table').next('table').text().trim();

        // L'image du tracé
        const traceImgSrc = mainContent.find('font.titre2:contains("Tracé")').closest('table').next('table').find('img').attr('src');
        // On s'assure que le lien de l'image est absolu
        if (traceImgSrc) {
            // Au lieu de créer un lien absolu, on crée un lien vers notre proxy
            kanjiData.traceUrl = `/kanji-image-proxy?path=${encodeURIComponent(traceImgSrc)}`;
        }

        // Les caractères ou éléments approchés
        kanjiData.approches = [];
        // On trouve le titre, on va à la table suivante, et on cherche tous les kanji avec la classe 'kanji3'
        mainContent.find('font.titre2:contains("Caractères ou éléments approchés")')
            .closest('table')
            .next('table')
            .find('font.kanji3') // On cible les kanji
            .each((i, el) => {
                // On récupère le texte de chaque kanji et on l'ajoute au tableau
                const char = $(el).text().trim();
                if (char) {
                    kanjiData.approches.push(char);
                }
            });

        // La liste d'exemples
        kanjiData.exemples = [];
        // On trouve le titre "Exemples", on va à la table suivante, et on boucle sur chaque ligne (tr)
        mainContent.find('font.titre2:contains("Exemples")').closest('table').next('table').find('tr').each((i, el) => {
            // On récupère le texte de chaque ligne, on nettoie les espaces et on l'ajoute au tableau
            const exempleText = $(el).text().trim().replace(/\s+/g, ' ');
            if (exempleText) {
                kanjiData.exemples.push(exempleText);
            }
        });

        console.log("Données du kanji extraites avec succès.");
        console.log(JSON.stringify(kanjiData, null, 2));
        // 4. On envoie l'objet de données structuré à la page EJS
        res.render('pages/kanji/kanji_free_dico_form', { 
            title: `Détails pour ${searchTerm}`, 
            results: kanjiData, // C'est maintenant un objet avec des données propres
            searchTerm: searchTerm 
        });

    } catch (err) { 
        console.error("ERREUR lors de la recherche du kanji :", err.message);
        res.render('pages/kanji/kanji_free_dico_form', {
            title: 'Erreur',
            results: null,
            searchTerm: searchTerm,
            error: `Impossible de trouver les informations pour "${searchTerm}". Le site est peut-être inaccessible ou le kanji n'existe pas.`
        });
    }
});

// *******************************************************************************************************************************//
// Ecrire en japonais avec un PC ou téléphone
// *******************************************************************************************************************************//
app.get('/kanji_ecrire_japonais', (req, res) => {
    try {   
        // Cette route sert juste à afficher le formulaire vide au début.
        res.render('pages/kanji/kanji_ecrire_Japonais_form', { title: 'Ecrire en japonais avec un PC ou téléphone' });
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Ecrire en japonais avec un PC ou téléphone:", err);
        res.status(500).send("Erreur serveur.");
    }
});



// *******************************************************************************************************************************//
// Menu kanji Hiragana
// *******************************************************************************************************************************//
app.get('/kanji_hiragana', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/kanji/kanji_hiragana_form', { 
        title: 'Les Hiraganas'
    });
});

// *******************************************************************************************************************************//
// Menu kanji Katakana
// *******************************************************************************************************************************//
app.get('/kanji_katakana', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/kanji/kanji_katakana_form', { 
        title: 'Les Katakanas'
    });
});


// *******************************************************************************************************************************//
// Menu kanji Furigana
// *******************************************************************************************************************************//
app.get('/kanji_furigana', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/kanji/kanji_furigana_form', { 
        title: 'Les Furiganas'
    });
});

// *******************************************************************************************************************************//
// route kanji les clés
// *******************************************************************************************************************************//

app.get('/kanji_les_cles', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT cle_nb_trait, cle_numero, cle_cle, cle_lecture, cle_signification FROM kanji_cle `; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/kanji/kanji_les_cles_form', { title: 'Les clé des Kanjis', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adverbes :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// ------------------------------------------------------------- Langue Vocabulaire ----------------------------------------------------------//
// *******************************************************************************************************************************//
// Menu Vocabulaire
// *******************************************************************************************************************************//

app.get('/vocab', (req, res) => {
    try {
        res.render('pages/vocab/vocab_form', { title: 'Vocabulaire'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Kanji :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route VOCAB Dico Vocab JPLT
// *******************************************************************************************************************************//

app.get('/vocab_jplt', (req, res) => {
    res.render('pages/vocab/vocab_jplt_form', { title: 'Vocabulaire du JPLT', results: [], searchTerm: '' });
});

// ... à l'intérieur de app.post('/vocab_jplt/search', ...)

app.post('/vocab_jplt/search', async (req, res) => {
    const searchTerm = req.body.searchTerm;
    try {
        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `
            SELECT kanji, kana, francais, niveau 
            FROM vocab_char 
            WHERE kanji LIKE ? 
               OR kana LIKE ? 
               OR francais LIKE ? 
               OR niveau LIKE ?`; // <-- ON AJOUTE CETTE LIGNE

        const searchPattern = `%${searchTerm}%`;

        // Log pour voir la requête SQL et les paramètres
        console.log("--- NOUVELLE RECHERCHE Vocabulaire ---");
        console.log("Requête SQL exécutée :", query);
        console.log("Avec le paramètre de recherche :", searchPattern);

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query, [searchPattern, searchPattern, searchPattern, searchPattern]); // <-- 4 paramètres maintenant

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        res.render('pages/vocab/vocab_jplt_form', { title: 'Résultats Vocab', results: results, searchTerm: searchTerm });
        } catch (err) { 
            console.error("ERREUR lors de la recherche du mot :", err);
            res.status(500).send("Erreur serveur."); 
        }
});

// *******************************************************************************************************************************//
// route VOCABDico franco/japonais en ligne
// *******************************************************************************************************************************//

app.get('/vocab_dico', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/vocab/vocab_dico_form', { 
        title: 'Recherche du mot', 
        results: null, // On met null pour dire qu'il n'y a pas encore de résultat
        searchTerm: '' 
    });
});

app.post('/vocab_dico/search', async (req, res) => {
    const searchTerm = req.body.searchTerm.trim();
    
    if (!searchTerm) {
        return res.redirect('/vocab_dico');
    }

    try {
        const encodedPart = encodeURIComponent(searchTerm);
        const url = `https://www.dictionnaire-japonais.com/search.php?w=${encodedPart}&t=1`;

        console.log(`--- Recherche dans le dictionnaire---`);
        console.log(`mot recherché : ${searchTerm}`);
        console.log(`URL cible : ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);

        // ===============================================
        // === LA CORRECTION EST SUR LA LIGNE SUIVANTE ===
        // ===============================================

        // 1. On crée un tableau vide pour stocker nos résultats structurés
        const scrapedResults = [];

        // 2. On boucle sur chaque élément <li> dans la liste des résultats
        $('ul.resultsList li').each((index, element) => {
            const li = $(element); // On sélectionne l'élément <li> courant

            // 3. Pour chaque <li>, on extrait le texte de chaque <span> spécifique
            const hiragana = li.find('span.kana').text().trim();
            const kanji = li.find('span.jp').text().trim();
            const romaji = li.find('span.romaji').text().trim();
            const francais = li.find('span.fr').text().trim();
            const detail = li.find('span.detail').text().trim();

            // 4. On combine la traduction française et les détails
            const fullFrancais = detail ? `${francais} (${detail})` : francais;

            // 5. On ajoute un objet bien structuré à notre tableau de résultats
            scrapedResults.push({
                hiragana: hiragana,
                kanji: kanji,
                romaji: romaji,
                francais: fullFrancais
            });
        });

        console.log(`Trouvé ${scrapedResults.length} résultats et formatés en objets.`);

        // 6. On envoie ce TABLEAU DE DONNÉES au template, et non plus le HTML brut
        res.render('pages/vocab/vocab_dico_form', { 
            title: `Traduction pour "${searchTerm}"`, 
            results: scrapedResults, // C'est maintenant un array d'objets !
            searchTerm: searchTerm 
        });

    } catch (err) { 
        console.error("ERREUR lors de la recherche sur dictionnaire-japonais.com :", err.message);
        res.render('pages/vocab/vocab_dico_form', {
            title: 'Erreur',
            results: [], // On envoie un tableau vide en cas d'erreur
            searchTerm: searchTerm,
            error: `Une erreur est survenue lors de la recherche pour "${searchTerm}".`
        });
    }
});

// *******************************************************************************************************************************//
// route VOCAB route adjectif
// *******************************************************************************************************************************//

app.get('/vocab_adjectif', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT francais, kanji, kana FROM adj_jp `; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/vocab/vocab_adjectif', { title: 'Les Adjectifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adjectifs :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route VOCAB adjectif_ii
// *******************************************************************************************************************************//

app.get('/vocab_adjectif_ii', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT francais, kanji, kana FROM adj_jp  WHERE type LIKE '%い%';`; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/vocab/vocab_adjectif_ii_na.ejs', { title: 'Les Adjectifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adjectifs :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route VOCAB  adjectif_na
// *******************************************************************************************************************************//

app.get('/vocab_adjectif_na', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT francais, kanji, kana FROM adj_jp  WHERE type LIKE '%な%';`; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/vocab/vocab_adjectif_ii_na', { title: 'Les Adjectifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adjectifs :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route VOCAB  adjectif utilisation
// *******************************************************************************************************************************//

app.get('/vocab_adjectif_utilisation', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT 
                TITRE, 
                REGLE_ADJ, 
                REGL_ADJ_EXEMPLE 
            FROM  jap_adj_uti ;
        `;

        const [results] = await dbPool.query(query);

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/vocab/vocab_adjectif_utilisation', { title: 'Utilisation des Adjectifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des onomatopées Gitaigo :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route VOCABles liaisons des adjectifs /vocab_adjectif_liaison
// *******************************************************************************************************************************//
app.get('/vocab_adjectif_liaison', (req, res) => {
    // Cette route sert juste à afficher la page.
    res.render('pages/vocab/vocab_adjectif_liaison_form', { 
        title: 'Liaisons des adjectifs'
    });
});

// *******************************************************************************************************************************//
// route VOCAB  exercice de liaison des adjectifs /vocab_adjectif_exercice_liaison
// *******************************************************************************************************************************//

app.get('/vocab_adjectif_exercice_liaison', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT kanji, hiragana, francais, liste_adj FROM jap_adj_liaison  ;`; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/vocab/vocab_adjectif_exercice_liaison_form', { title: 'Exercice sur la liaison des adjectifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adjectifs :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route VOCAB  passé des adjectifs /vocab_adjectif_passe
// *******************************************************************************************************************************//
app.get('/vocab_adjectif_passe', (req, res) => {
    // Cette route sert juste à afficher la page.
    res.render('pages/vocab/vocab_adjectif_passe_form', { 
        title: 'Passé des adjectifs'
    });
});

// *******************************************************************************************************************************//
// route VOCAB exercice du passé des adjectifs /vocab_adjectif_exercice_liaison
// *******************************************************************************************************************************//

app.get('/vocab_adjectif_exercice_passe', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT kanji, hiragana, francais, liste_adj FROM jap_adj_passe  ;`; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/vocab/vocab_adjectif_exercice_passe_form', { title: 'Exercice sur le passe des adjectifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adjectifs :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route VOCAB  adverbe
// *******************************************************************************************************************************//

app.get('/vocab_adverbe', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT francais, kanji, kana FROM adv_jp `; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/vocab/vocab_adverbe', { title: 'Les Adverbes', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adverbes :", err);
        res.status(500).send("Erreur serveur.");
    }
});



// *******************************************************************************************************************************//
// route vocab onomatopee
// *******************************************************************************************************************************//

app.get('/vocab_onomatopee', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/vocab/vocab_onomatopee_form', { 
        title: 'Mots onomatopee'
    });
});

// *******************************************************************************************************************************//
// route vocab onomatopee giseigo
// *******************************************************************************************************************************//

app.get('/vocab_giseigo', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT 
                type, 
                signification, 
                katakana, 
                romanji, 
                detail, 
                exemple 
            FROM onomatopees_jp 
            WHERE type = 'Giseigo';
        `;

        const [results] = await dbPool.query(query);

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/vocab/vocab_giseigo_form', { title: 'Mots onomatopées Giseigo', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des onomatopées Giseigo :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// route vocab onomatopee gitaigo
// *******************************************************************************************************************************//

app.get('/vocab_gitaigo', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT 
                type, 
                signification, 
                katakana, 
                romanji, 
                detail, 
                exemple 
            FROM onomatopees_jp 
            WHERE type = 'Gitaigo';
        `;

        const [results] = await dbPool.query(query);

        // Log pour voir le résultat brut de la base de données
        // console.log("Résultat brut obtenu de la DB :", results);
        // console.log("Nombre de résultats trouvés :", results.length);
        // console.log("--------------------------------------");

        res.render('pages/vocab/vocab_gitaigo_form', { title: 'Mots onomatopées Gitaigo', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des onomatopées Gitaigo :", err);
        res.status(500).send("Erreur serveur.");
    }
});



// *******************************************************************************************************************************//
// route vocab onomatopee gitaigo
// *******************************************************************************************************************************//

app.get('/vocab_adjectif_utilisation', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT 
                TITRE, 
                REGLE_ADJ, 
                REGL_ADJ_EXEMPLE 
                FROM  jap_adj_uti ;
        `;

        const [results] = await dbPool.query(query);

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/vocab/vocab_adjectif_utilisation', { title: 'Utilisation des Adjectifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des onomatopées Gitaigo :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Dico Vocab Onomatopée Détails /vocab_onomatopee_detail
// *******************************************************************************************************************************//

app.get('/vocab_onomatopee_detail', async (req, res) => {
    try {
        // 1. On récupère la liste complète des départements pour les menus déroulants
        const query = 'SELECT signification, katakana, romanji FROM onomatopees_jp ORDER BY romanji ASC;';
        
        console.log("--- Liste pour la sélection ---");
        console.log("Exécution de la requête :", query);

        const [onomatopees] = await dbPool.query(query);

        console.log(`${onomatopees.length} Onomatopées.`);
        console.log("------------------------------------------");
        console.log(onomatopees);
		
	    // 2. On rend la page en lui passant la liste, et des valeurs VIDES pour les résultats
        res.render('pages/vocab/vocab_onomatopee_detail_form', { 
            title: 'Détail onomatopée', 
            listeOnoDetail: onomatopees,
            results: [], // Tableau de résultats vide au premier chargement
            searchTerm: '' // Terme de recherche vide au premier chargement
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la selection des onomatopées:", err);
        res.status(500).send("ERREUR lors du chargement de la selection des onomatopées.");
    }
});

app.post('/vocab_onomatopee_detail/search', async (req, res) => {
    // NOUVEAU : On récupère la valeur de la liste qui a été changée
    const onoKatakana = req.body.katakana;
    const onoSignification = req.body.signification;
    const onoRomanji = req.body.romanji;
    
    console.log("recherche détail")
    // 2. On détermine le terme de recherche (le premier qui n'est pas vide)
    const searchTerm = onoKatakana || onoSignification || onoRomanji ; 
    console.log(searchTerm)
    try {
        // --- On doit toujours re-charger la liste complète pour réafficher les menus ---
        const listQuery = 'SELECT signification, katakana, romanji FROM onomatopees_jp ORDER BY romanji ASC;';
        const [onomatopees] = await dbPool.query(listQuery);

        let searchResults = [];

        // --- On exécute la recherche si un terme a été sélectionné ---
        if (searchTerm) {
            // La requête recherche maintenant une correspondance EXACTE, ce qui est mieux pour une liste
            const searchQuery = `
                SELECT signification, katakana, romanji, detail, exemple 
                FROM onomatopees_jp 
                WHERE signification = ? OR katakana = ? OR romanji = ?`;
            console.log(searchQuery)
            // On passe le même terme pour les deux conditions
            const [results] = await dbPool.query(searchQuery, [searchTerm, searchTerm, searchTerm ]);
            searchResults = results;
        }

        // console.log(`${results} onomatopéess.`);
        // --- On rend la même page, en passant toutes les infos nécessaires ---
        res.render('pages/vocab/vocab_onomatopee_detail_form', { 
            title: 'Détail onomatopée', 
            listeOnoDetail: onomatopees,
            results: searchResults,
            searchTerm: searchTerm // Très important pour pré-sélectionner les listes !
        });

    } catch (err) { 
        console.error("ERREUR lors de la recherche des détails de l'onomatopées :", err);
        res.status(500).send("ERREUR lors de la recherche des détails de l'onomatopées."); 
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Compter
// *******************************************************************************************************************************//

app.get('/vocab_compter', async (req, res) => {
    try {
        // --- PARTIE 1 : On charge TOUJOURS la liste complète des compteurs ---
        const queryAllCompteur = 'SELECT DISTINCT compteur_type FROM vocab_compteur;';
        const [allCompteur] = await dbPool.query(queryAllCompteur);
        
        // --- PARTIE 2 : On regarde si l'utilisateur a sélectionné une région ---
        // Le compteur sélectionné arrivera dans l'URL, comme: /vocab_compter?selection=Personne
        const selectedCompteurName = req.query.selection || '';

        let compteurDetails = []; // On initialise un tableau vide pour compteurs

        // --- PARTIE 3 : Si un compteur est sélectionné, on va chercher ses détails ---
        if (selectedCompteurName) {
            console.log(`--- Recherche des détails pour le compteur : ${selectedCompteurName} ---`);
            const queryDetails = `
                SELECT compteur_compteur, compteur_numero, compteur_kanji, compteur_hiragana 
                FROM vocab_compteur 
                WHERE compteur_type = ?`; // Recherche exacte avec le nom de la région

            const [details] = await dbPool.query(queryDetails, [selectedCompteurName]);
            compteurDetails = details; // On remplit notre tableau avec le résultat
        }

        // --- PARTIE 4 : On rend la page en lui passant TOUTES les données ---
        res.render('pages/vocab/vocab_compter_form', { 
            title: 'Compter',
            listeCompteur: allCompteur,      // Pour la liste déroulante
            results: compteurDetails,       // Pour le tableau de résultats (contient les détails ou est vide)
            searchTerm: selectedCompteurName // Pour savoir quelle région pré-sélectionner dans la liste
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la page pages/vocab/vocab_compter_form :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse
// *******************************************************************************************************************************//

app.get('/vocab_politesse', (req, res) => {
    try {
        res.render('pages/vocab/vocab_politesse_form', { title: 'La politesse Japonaise' });
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de vocab_politesse_form :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse keisho
// *******************************************************************************************************************************//

app.get('/vocab_politesse_keisho', (req, res) => {
    try {
        res.render('pages/vocab/politesse/vocab_politesse_keisho_form', { title: 'Keishō 敬称' });
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de vocab_politesse_keisho_form :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse keisho exercice
// *******************************************************************************************************************************//

app.get('/vocab_keisho_exercice', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT type, francais, liste_terme, kanji, hiragana
			FROM vocab_exer_politesse
			WHERE TYPE = 'Keisho'
        `;

        const [results] = await dbPool.query(query);


        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/vocab/politesse/vocab_keisho_exercice_form', { title: 'Exercice sur Keisho', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page Exercice sur Keisho :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse teineigo
// *******************************************************************************************************************************//

app.get('/vocab_politesse_teineigo', (req, res) => {
    try {
        res.render('pages/vocab/politesse/vocab_politesse_teineigo_form', { title: 'Teineigo 丁寧語' });
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de vocab_politesse_teineigo_form :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse teineigo exercice
// *******************************************************************************************************************************//

app.get('/vocab_exerc_teineigo', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT type, francais, liste_terme, kanji, hiragana
			FROM vocab_exer_politesse
			WHERE TYPE = 'Teineigo'
        `;

        const [results] = await dbPool.query(query);



        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/vocab/politesse/vocab_teineigo_exercice_form', { title: 'Exercice sur Teineigo', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page Exercice sur Teineigo :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse sonkeigo
// *******************************************************************************************************************************//

app.get('/vocab_politesse_sonkeigo', (req, res) => {
    try {
        res.render('pages/vocab/politesse/vocab_politesse_sonkeigo_form', { title: 'Sonkeigo 尊敬語' });
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de vocab_politesse_sonkeigo_form :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse sonkeigo exercice
// *******************************************************************************************************************************//

app.get('/vocab_exerc_sonkeigo', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT type, francais, liste_terme, kanji, hiragana
			FROM vocab_exer_politesse
			WHERE TYPE = 'Sonkeigo'
        `;

        const [results] = await dbPool.query(query);



        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/vocab/politesse/vocab_sonkeigo_exercice_form', { title: 'Exercice sur Sonkeigo', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page Exercice sur Sonkeigo :", err);
        res.status(500).send("Erreur serveur.");
    }
});


// *******************************************************************************************************************************//
//  route VOCAB Politesse kenjougo
// *******************************************************************************************************************************//

app.get('/vocab_politesse_kenjougo', (req, res) => {
    try {
        res.render('pages/vocab/politesse/vocab_politesse_kenjougo_form', { title: 'Kenjougo 恥謝語' });
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de vocab_politesse_kenjougo_form :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
//  route VOCAB Politesse kenjougo exercice
// *******************************************************************************************************************************//

app.get('/vocab_kenjougo_exercice', async (req, res) => {

    try {
        // MODIFICATION CLÉ : Sélectionner TOUTES les colonnes
        const query = `
            SELECT type, francais, liste_terme, kanji, hiragana
			FROM vocab_exer_politesse
			WHERE TYPE = 'Kenjougo'
        `;

        const [results] = await dbPool.query(query);


        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/vocab/politesse/vocab_kenjougo_exercice_form', { title: 'Exercice sur Kenjougo', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page Exercice sur Kenjougo :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// ------------------------------------------------------------- Langue Grammaire ----------------------------------------------------------//
// *******************************************************************************************************************************//
// Menu Grammaire
// *******************************************************************************************************************************//

app.get('/grammaire', (req, res) => {
    try {
        res.render('pages/gram/gram_form', { title: 'Grammaire'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Kanji :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Grammaire japonaise gram_jap_rech_regles
// *******************************************************************************************************************************//

app.get('/gram_jap_rech_regles', (req, res) => {
    res.render('pages/gram/gram_jap_rech_regles_form', { title: 'Recherche d\'un régle', results: [], searchTerm: '' });
});

app.post('/gram_jap_liste_regles/search', async (req, res) => {
    const searchTerm = req.body.searchTerm.trim();
    try {
        // --- MODIFICATION DE LA REQUÊTE ---
		

        const query = `
            SELECT  nom, description, construction, exemple
            FROM gram_char
            WHERE nom LIKE ?
			   OR description LIKE ?`; // Valeur LIKE
			   
	    // searchPattern est la donnée à rechercher dans query        
        const searchPattern = `%${searchTerm}%`;
		
		// Log pour voir la requête SQL et les paramètres
        console.log("--- NOUVELLE RECHERCHE KANJI ---");
        console.log("Requête SQL exécutée :", query);
        console.log("Avec le paramètre de recherche :", searchPattern);
			
		const [results] = await dbPool.query(query, [searchPattern, searchPattern, searchPattern, searchPattern ]);
		
		// Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
		
        res.render('pages/gram/gram_jap_rech_regles_form', { title: 'Règle recherchée', results: results, searchTerm: searchTerm });
    } catch (err) { 
        console.error("ERREUR lors de la recherche Kanji :", err);
        res.status(500).send("Erreur serveur."); 
    }
});

// *******************************************************************************************************************************//
// Dico gram_conjugaison
// *******************************************************************************************************************************//

app.get('/gram_jap_conjugaison', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/gram/gram_jap_conjugaison', { 
        title: 'Conjugaison du verbe', 
        results: null, // On met null pour dire qu'il n'y a pas encore de résultat
        searchTerm: '' 
    });
});

// CORRECTION 1 : On transforme la route de recherche en app.post
app.post('/gram_jap_conjugaison/search', async (req, res) => {
    // CORRECTION 2 : On récupère le terme de recherche depuis req.body
    const searchTerm = req.body.searchTerm.trim();
    
    // On vérifie que le terme n'est pas vide
    if (!searchTerm) {
        // Si vide, on redirige vers le formulaire de base
        return res.redirect('/gram_jap_conjugaison');
    }

    try {
        // On encode le terme pour l'URL
        const encodedPart = encodeURIComponent(searchTerm).trim();
        const url = `https://fr.wiktionary.org/wiki/Conjugaison:japonais/${encodedPart}`;
        // const url = `https://fr.wiktionary.org/wiki/Conjugaison:japonais/飲む`;

        console.log(`--- RECHERCHE CONJUGAISON JAPONAISE ---`);
        console.log(`Verbe recherché : ${searchTerm}`);
        console.log(`URL cible : ${url}`);
        
        // const response = await axios.get(url);
        // Remplacez votre ligne axios.get par celle-ci :
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9'
            }
        });
        const $ = cheerio.load(response.data);

         // 1. On sélectionne un conteneur plus fiable sur la page du Wiktionnaire.
        const contentContainer = $('div.mw-parser-output');

        // 2. On nettoie les styles et attributs inutiles qui peuvent casser notre layout.
        contentContainer.find('[style]').removeAttr('style'); // Supprime tous les attributs "style"
        contentContainer.find('[class*="thumb"]').remove(); // Supprime les miniatures et légendes
        contentContainer.find('script').remove(); // Supprime les balises <script>
        
        // 3. On récupère le HTML nettoyé.
        const content = contentContainer.html();

        if (!content) {
            console.log("Aucun contenu de conjugaison trouvé sur la page.");
        }

        // CORRECTION 3 : On n'envoie qu'une seule réponse, avec res.render
        res.render('pages/gram/gram_jap_conjugaison', { 
            title: `Conjugaison de ${searchTerm}`, 
            results: content, // On passe le HTML scrappé
            searchTerm: searchTerm 
        });

    } catch (err) { 
        console.error("ERREUR lors de la recherche du verbe :", err.message);
        // On peut rendre la même page avec un message d'erreur pour l'utilisateur
        res.render('pages/gram/gram_jap_conjugaison', {
            title: 'Erreur',
            results: `<p style="color: red;">Impossible de trouver la conjugaison pour "${searchTerm}". Vérifiez que le verbe est correct et existe sur le Wiktionnaire.</p>`,
            searchTerm: searchTerm
        });
    }
});


// *******************************************************************************************************************************//
// Grammaire japonaise liste des règles
// *******************************************************************************************************************************//

app.get('/gram_jap_liste_regles', async (req, res) => {
    try {
        // --- PARTIE 1 : On charge TOUJOURS la liste complète de la colonne nom ---
        const gramAllNom = 'SELECT nom FROM gram_char ORDER BY nom ASC;';
        const [allGramNom] = await dbPool.query(gramAllNom);
        
        // --- PARTIE 2 : On regarde si l'utilisateur a sélectionné un nom dans la liste allGramNom ---
        // La nom sélectionnée arrivera dans l'URL, comme: /gram_jap_regles?Nom=挙げ句に (あげくに) : finalement, en fin de compte
        const selectedGramName = req.query.selection || '';

        let gramNomDetails = []; // On initialise un tableau vide pour les détails

        // --- PARTIE 3 : Si un nom est sélectionné, on va chercher ses détails ---
        if (selectedGramName) {
            console.log(`--- Recherche des détails pour le nom : ${selectedGramName} ---`);
            const queryDetails = `
                SELECT  nom, description, construction, exemple
                FROM gram_char
                WHERE nom = ?`; // Recherche exacte avec le nom

            const [details] = await dbPool.query(queryDetails, [selectedGramName]);
           
            gramNomDetails = details; // On remplit notre tableau avec le résultat
            // === MODIFICATION DU CONSOLE.LOG ===
            // On utilise JSON.stringify pour voir la vraie structure des données
            console.log('--- Données brutes envoyées au template ---');
            console.log(JSON.stringify(gramNomDetails, null, 2)); // Le 2 est pour une jolie indentation
        }

        // --- PARTIE 4 : On rend la page en lui passant TOUTES les données ---
        res.render('pages/gram/gram_jap_liste_regles_form', { 
            title: 'Les Règles de grammaire Japonaise',
            listeGramRegle: allGramNom,      // Pour la liste déroulante
            results: gramNomDetails,       // Pour le tableau de résultats (contient les détails ou est vide)
            searchTerm: selectedGramName   // Pour savoir quel nom pré-sélectionner dans la liste
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la page des grammaire japonaise :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Grammaire japonaise les verbes transitifs/intansitifs
// *******************************************************************************************************************************//

app.get('/verbe_transitif_intransitif', (req, res) => {
    try {
        res.render('pages/gram/gram_verbe_transitif_intransitif', { title: 'Les verbes transitifs / intransitifs'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Kanji :", err);
        res.status(500).send("Erreur serveur.");
    }
});


// *******************************************************************************************************************************//
// Grammaire japonaise les verbes transitifs
// *******************************************************************************************************************************//

app.get('/verbe_transitif', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT trans_kanji, trans_hiragana, trans_francais, trans_romanji FROM verbe_trans_intrans  `; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/gram/gram_verbe_transitif_form', { title: 'Les verbes transitifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adverbes :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Grammaire japonaise les verbes intransitifs
// *******************************************************************************************************************************//

app.get('/verbe_intransitif', async (req, res) => { 
    
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT  intrans_kanji, intrans_hiragana, intrans_francais, intrans_romanji FROM verbe_trans_intrans  `; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
        const [results] = await dbPool.query(query); 

        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/gram/gram_verbe_intransitif_form', { title: 'Les verbes intransitifs', results: results});
    } catch (err) {
        console.error("ERREUR lors du chargement des adverbes :", err);
        res.status(500).send("Erreur serveur.");
    }
});
// *******************************************************************************************************************************//
// route gram mot interrogatif
// *******************************************************************************************************************************//

app.get('/gram_mot_interrogatif', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/gram/gram_interrogatif_form', { 
        title: 'Mots Interrogatifs'
    });
});

// *******************************************************************************************************************************//
// route gram les particules
// *******************************************************************************************************************************//


app.get('/gram_particuleGaWa', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/lecon/lecon_01_10/lecon_01/lecon01_gram_particuleGaWa_form', { 
        title: 'Les Particules は et が'
    });
});

app.get('/gram_particuleNo', (req, res) => {
    // Cette route sert juste à afficher le formulaire vide au début.
    res.render('pages/lecon/lecon_01_10/lecon_01/lecon01_gram_particuleNo_form', { 
        title: 'La Particule の'
    });
});

// *******************************************************************************************************************************//
// route GRAM  exercice de liaison des adjectifs /gram_particuleGaWa_exec
// *******************************************************************************************************************************//

app.get('/gram_exec', async (req, res) => { 

	const paramName = req.query.paramName;
	
	if (!paramName) {
        return res.status(400).send("Le paramètre 'paramName' est requis.");
    }
	
    try {

        // --- MODIFICATION DE LA REQUÊTE ---
        const query = `SELECT question, kanji, hiragana, romanji, reponse, francais FROM gram_excercice where titre_excercice = ? ;`; 

        // --- ON AJOUTE LE PARAMÈTRE UNE FOIS DE PLUS ---
		const [results] = await dbPool.query(query, [paramName ]);


        // Log pour voir le résultat brut de la base de données
        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");
        
        
        res.render('pages/lecon/lecon_01_10/lecon_01/lecon01_gram_particule_exec_form', 
            { 
            results : results,
			title : results[0].question
			});
			
    } catch (err) {
        console.error("ERREUR lors du chargement de l'excercice ${paramName}", err);
        res.status(500).send("Erreur serveur.");
    }
});

// ------------------------------------------------------------- France ----------------------------------------------------------//

// *******************************************************************************************************************************//
// Dico departements
// *******************************************************************************************************************************//

app.get('/departements', async (req, res) => {
    try {
        // 1. On récupère la liste complète des départements pour les menus déroulants
        const query = 'SELECT num_dep, nom_dep, nom_pref FROM dep_fr ORDER BY num_dep ASC;';
        
        console.log("--- NOUVELLE PAGE DÉPARTEMENTS ---");
        console.log("Exécution de la requête :", query);

        const [departements] = await dbPool.query(query);

        console.log(`${departements.length} départements trouvés pour les listes.`);
        console.log("------------------------------------------");
       console.log(departements);
		
	    // 2. On rend la page en lui passant la liste, et des valeurs VIDES pour les résultats
        res.render('pages/france/departements_form', { 
            title: 'Caractéristiques d\'un département', 
            listeDepartement: departements,
            results: [], // Tableau de résultats vide au premier chargement
            searchTerm: '' // Terme de recherche vide au premier chargement
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la page des départements :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.post('/departements/search', async (req, res) => {
    // NOUVEAU : On récupère la valeur de la liste qui a été changée
    const nomDep = req.body.nom_dep;
    const numDep = req.body.num_dep;
    const nomPref = req.body.nom_pref;
    
 
    // 2. On détermine le terme de recherche (le premier qui n'est pas vide)
    const searchTerm = nomDep || numDep || nomPref; // <-- On ajoute la préfecture ici

    try {
        // --- On doit toujours re-charger la liste complète pour réafficher les menus ---
        const listQuery = 'SELECT num_dep, nom_dep, nom_pref FROM dep_fr ORDER BY num_dep ASC;';
        const [departements] = await dbPool.query(listQuery);

        let searchResults = [];

        // --- On exécute la recherche si un terme a été sélectionné ---
        if (searchTerm) {
            // La requête recherche maintenant une correspondance EXACTE, ce qui est mieux pour une liste
            const searchQuery = `
                SELECT num_dep, nom_dep, nom_reg, superficie, pop_dep, densite, nom_pref, pop_pref, sous_pref
                FROM dep_fr 
                WHERE nom_dep = ? OR num_dep = ? OR nom_pref = ?`;
            
            // On passe le même terme pour les deux conditions
            const [results] = await dbPool.query(searchQuery, [searchTerm, searchTerm, searchTerm]);
            searchResults = results;
        }

        // --- On rend la même page, en passant toutes les infos nécessaires ---
        res.render('pages/france/departements_form', { 
            title: 'Résultats Départements',
            listeDepartement: departements,
            results: searchResults,
            searchTerm: searchTerm // Très important pour pré-sélectionner les listes !
        });

    } catch (err) { 
        console.error("ERREUR lors de la recherche du Département :", err);
        res.status(500).send("Erreur serveur lors de la recherche du département."); 
    }
});

//*******************************************************************************************************************************//
// Carte interactive des Départements
//*******************************************************************************************************************************//
app.get('/departement_carte', async (req, res) => {
    try {
        // 1. On fait une seule requête pour récupérer les numéros ET les noms
        // On trie par numéro de département pour un ordre logique.
        const query = 'SELECT num_dep, nom_dep FROM dep_fr ORDER BY num_dep ASC;';
        
        console.log("--- NOUVELLE PAGE CARTE DES DÉPARTEMENTS ---");
        console.log("Exécution de la requête :", query);

        const [departements] = await dbPool.query(query);

        console.log(`${departements.length} départements trouvés.`);
        console.log("------------------------------------------");

        // 2. On rend la nouvelle page EJS en lui passant la liste complète
        res.render('pages/france/departement_carte_form', { 
            title: 'Carte des Départements',
            // La variable `listeDepartement` contient maintenant un tableau d'objets [{ num_dep: '01', nom_dep: 'Ain' }, ...]
            listeDepartement: departements
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la page carte des départements :", err);
        res.status(500).send("Erreur serveur.");
    }
});

//*******************************************************************************************************************************//
// Régions (avec liste déroulante et affichage des détails)
//*******************************************************************************************************************************//

app.get('/regions', async (req, res) => {
    try {
        // --- PARTIE 1 : On charge TOUJOURS la liste complète des régions ---
        const queryAllRegions = 'SELECT reg_nom FROM reg_fr ORDER BY reg_nom ASC;';
        const [allRegions] = await dbPool.query(queryAllRegions);
        
        // --- PARTIE 2 : On regarde si l'utilisateur a sélectionné une région ---
        // La région sélectionnée arrivera dans l'URL, comme: /regions?selection=Bretagne
        const selectedRegionName = req.query.selection || '';

        let regionDetails = []; // On initialise un tableau vide pour les détails

        // --- PARTIE 3 : Si une région est sélectionnée, on va chercher ses détails ---
        if (selectedRegionName) {
            console.log(`--- Recherche des détails pour la région : ${selectedRegionName} ---`);
            const queryDetails = `
                SELECT reg_nom, reg_cheflieu, reg_dep, reg_superficie, reg_population
                FROM reg_fr 
                WHERE reg_nom = ?`; // Recherche exacte avec le nom de la région

            const [details] = await dbPool.query(queryDetails, [selectedRegionName]);
            regionDetails = details; // On remplit notre tableau avec le résultat
        }

        // --- PARTIE 4 : On rend la page en lui passant TOUTES les données ---
        res.render('pages/france/region_form', { 
            title: 'Les Régions Françaises',
            listeRegion: allRegions,      // Pour la liste déroulante
            results: regionDetails,       // Pour le tableau de résultats (contient les détails ou est vide)
            searchTerm: selectedRegionName // Pour savoir quelle région pré-sélectionner dans la liste
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la page des régions :", err);
        res.status(500).send("Erreur serveur.");
    }
});

//*******************************************************************************************************************************//
// Carte interactive des Régions
//*******************************************************************************************************************************//
app.get('/region_carte', async (req, res) => {
    try {
        // 1. La requête SQL pour récupérer tous les noms de régions
        // J'ajoute ORDER BY pour que la liste déroulante soit triée par ordre alphabétique
        const query = 'SELECT reg_nom FROM reg_fr ORDER BY reg_nom ASC;';
        
        console.log("--- NOUVELLE PAGE CARTE DES RÉGIONS ---");
        console.log("Exécution de la requête :", query);

        // 2. On exécute la requête
        const [regions] = await dbPool.query(query);

        console.log(`${regions.length} régions trouvées.`);
        console.log("---------------------------------------");

        // 3. On rend la nouvelle page EJS en lui passant la liste des régions
        res.render('pages/france/region_carte_form', { 
            title: 'Carte des Régions',
            // La variable `listeRegion` contient maintenant un tableau d'objets [{ reg_nom: '...' }, ...]
            listeRegion: regions 
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la page carte des régions :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// ------------------------------------------------------------- Japon ----------------------------------------------------------//

// *******************************************************************************************************************************//
// Le Japon
// *******************************************************************************************************************************//

app.get('/japon', (req, res) => {
    try {
        res.render('pages/japon/japon_form', { title: 'Le Japon'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon  :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Ile de Honshu
// *******************************************************************************************************************************//

app.get('/japon_honshu', (req, res) => {
    try {
        res.render('pages/japon/japon_honshu_form', { title: 'Ile de Honshu'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Honshu :", err);
        res.status(500).send("Erreur serveur.");
    }
});

//***********************************************************//
//  ********************* Honshu Kanto *********************//

app.get('/japon_honshu_kanto', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kanto_form', { title: 'Région du Kanto'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto :", err);
        res.status(500).send("Erreur serveur.");
    }
});

//  ********************* Honshu Kanto Tokyo *********************//

app.get('/japon_kanto_tokyo', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_form', { title: 'Tokyo'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto Tokyo:", err);
        res.status(500).send("Erreur serveur.");
    }
});

//  ********************* Honshu Kanto quartier de Tokyo *********************//

app.get('/japon_quartier_tokyo', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_quartiers_form', { title: 'Les quartiers de Tokyo'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier Tokyo:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_ameyoko', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_ameyoko_form', { title: 'Ameyoko'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Ameyoko:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_akihabara', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_akihabara_form', { title: 'Akihabara'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Akihabara:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_asakusa', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_asakusa_form', { title: 'Asakusa'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Asakusa:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_harajuku', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_harajuku_form', { title: 'Harajuku'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Harajuku:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_ikebukuro', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_ikebukuro_form', { title: 'Ikebukuro'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Ikebukuro:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_imperial', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_imperial_form', { title: 'Imperial'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Imperial:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_mairie', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_mairie_form', { title: 'Mairie'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Mairie:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_odaiba', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_odaiba_form', { title: 'Odaiba'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Odaiba:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_ochanomizu', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_ochanomizu_form', { title: 'Ochanomizu'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Ochanomizu:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_roppongi', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_roppongi_form', { title: 'Roppongi'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Roppongi:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_ryogoku', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_ryogoku_form', { title: 'Ryogoku'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Ryogoku:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_skytree', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_skytree_form', { title: 'Skytree'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Skytree:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_shimbashi', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_shimbashi_form', { title: 'Shimbashi'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Shimbashi:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_shibuya', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_shibuya_form', { title: 'Shibuya'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Shibuya:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_shinagawa', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_shinagawa_form', { title: 'Shinagawa'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Shinagawa:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_tour', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_tour_form', { title: 'Tour'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Tour:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_yanaka', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_yanaka_form', { title: 'Yanaka'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Yanaka:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_tokyo_yasukuni', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_yasukuni_form', { title: 'Yasukuni'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Quartier  Yasukuni:", err);
        res.status(500).send("Erreur serveur.");
    }
});

//  ********************* Honshu Kanto aéroports de Tokyo *********************//

app.get('/japon_aeroport_tokyo', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/tokyo/japon_kanto_tokyo_aeroport_form', { title: 'Aéroports de Tokyo'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page des Aéroports de Tokyo:", err);
        res.status(500).send("Erreur serveur.");
    }
});

// ******************************************************************************

app.get('/japon_kanto_yokohama', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/japon_kanto_yokohama_form', { title: 'Yokohama'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto Yokohama:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_nikko', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/japon_kanto_nikko_form', { title: 'Nikko'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto Nikko:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_enoshima', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/japon_kanto_enoshima_form', { title: 'Enoshima'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto Enoshima:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_kawagoe', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/japon_kanto_kawagoe_form', { title: 'Kawagoe'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto Kawagoe:", err);
        res.status(500).send("Erreur serveur.");
    }
});


app.get('/japon_kanto_hakone', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/japon_kanto_hakone_form', { title: 'Hakone'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto Hakone:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kanto_kamakura', (req, res) => {
    try {
        res.render('pages/japon/honshu/kanto/japon_kanto_kamakura_form', { title: 'Kamakura'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanto Kamakura:", err);
        res.status(500).send("Erreur serveur.");
    }
});
//********************* Honshu Kansai *********************//

app.get('/japon_honshu_kansai', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_form', { title: 'Région du Kansai'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kansai :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_osaka', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_osaka_form', { title: 'Osaka'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Osaka :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_kyoto', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_kyoto_form', { title: 'Kyoto'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyoto :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_nara', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_nara_form', { title: 'Nara'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Nara :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_arashiyama', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_arashiyama_form', { title: 'Arashiyama'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Arashiyama :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_inari', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_inari_form', { title: 'Inari'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Inari :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_himeji', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_himeji_form', { title: 'Himeji'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Himeji :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_koyasan', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_koyasan_form', { title: 'Kōyasan'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kōyasan :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_kobe', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_kobe_form', { title: 'Kobe'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kobe :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kansai_inari', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_kansai_inari_form', { title: 'Inari'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Inari :", err);
        res.status(500).send("Erreur serveur.");
    }
});

//********************* Honshu Chubu *********************//

app.get('/japon_honshu_chubu', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_chubu_form', { title: 'Région du Chubu'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Chubu :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_montfuji', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_montfuji_form', { title: 'Mont Fuji 富士山'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Mont Fuji :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_takayama', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_takayama_form', { title: 'Takayama 高山'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Takayama :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_shiragawago', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_shiragawago_form', { title: 'Shirakawa-go 白川村'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shirakawa-go :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_matsumoto', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_matsumoto_form', { title: 'Matsumoto 松本'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Matsumoto :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_kanazawa', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_kanazawa_form', { title: 'Kanazawa 加治川'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kanazawa :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_nagoya', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_nagoya_form', { title: 'Nagoya 名古屋'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Nagoya :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_inuyama', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_inuyama_form', { title: 'Inuyama 伊吹山'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Inuyama :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_shiragawago', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_shiragawago_form', { title: 'Shirakawa-go 白川村'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shirakawa-go :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chubu_hammatsu', (req, res) => {
    try {
        res.render('pages/japon/honshu/chubu/japon_chubu_hammatsu_form', { title: 'Hammatsu 浜松'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Hammatsu :", err);
        res.status(500).send("Erreur serveur.");
    }
});

//********************* Honshu Chugoku *********************//

app.get('/japon_honshu_chugoku', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_chugoku_form', { title: 'Région du Chugoku'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Chugoku :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chugoku_okayama', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_chugoku_okayama_form', { title: 'Région du Okayama'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Chugoku Okayama :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chugoku_matsue', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_chugoku_matsue_form', { title: 'Région du Matsue'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Chugoku Matsue :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chugoku_hiroshima', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_chugoku_hiroshima_form', { title: 'Région du Hiroshima'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Chugoku Hiroshima :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chugoku_miyajima', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_chugoku_miyajima_form', { title: 'Région du Miyajima'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Chugoku Miyajima :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_chugoku_kurashiki', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_chugoku_kurashiki_form', { title: 'Région du Kurashiki'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Chugoku Kurashiki :", err);
        res.status(500).send("Erreur serveur.");
    }
});


//********************* Honshu Tohoku *********************//

app.get('/japon_honshu_tohoku', (req, res) => {
    try {
        res.render('pages/japon/honshu/japon_tohoku_form', { title: 'Région du Tohoku'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Tohoku :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_tohoku_sendai', (req, res) => {
    try {
        res.render('pages/japon/honshu/tohoku/japon_tohoku_sendai_form', { title: 'Sendai'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Sendai :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_tohoku_matsushima', (req, res) => {
    try {
        res.render('pages/japon/honshu/tohoku/japon_tohoku_matsushima_form', { title: 'Matsushima'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Matsushima :", err);
        res.status(500).send("Erreur serveur.");
    }
});
// *******************************************************************************************************************************//
// Ile de Kyushuu
// *******************************************************************************************************************************//

app.get('/japon_kyushu', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_form', { title: 'Ile de Kyushu'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_fukuoka', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_fukuoka_form', { title: 'Ville de Fukuoka 福岡'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Fukuoka :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_kagoshima', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_kagoshima_form', { title: 'Ville de Kagoshima 鹿児'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Kagoshima:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_kumamoto', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_kumamoto_form', { title: 'Ville de Kumamoto 熊本'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Kumamoto:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_miyazaki', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_miyazaki_form', { title: 'Ville de Miyazaki 雲仙'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Miyazaki:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_nagasaki', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_nagasaki_form', { title: 'Ville de Nagasaki 長崎'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Nagasaki:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_oita', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_oita_form', { title: 'Ville de Oita 大分'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Oita:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_saga', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_saga_form', { title: 'Ville de Saga 佐賀'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Saga:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_kyushu_okinawa', (req, res) => {
    try {
        res.render('pages/japon/japon_kyushu_okinawa_form', { title: 'Ile d\'Okinawa 沖縄'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Kyushu Okinawa:", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Ile de Shikoku
// *******************************************************************************************************************************//

app.get('/japon_shikoku', (req, res) => {
    try {
        res.render('pages/japon/japon_shikoku_form', { title: 'Ile de Shikoku'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shikoku :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_shikoku_kochi', (req, res) => {
    try {
        res.render('pages/japon/japon_shikoku_kochi_form', { title: 'Ville de Kochi 高知'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shikoku Kochi:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_shikoku_matsuyama', (req, res) => {
    try {
        res.render('pages/japon/japon_shikoku_matsuyama_form', { title: 'Ville de Matsuyama 松山'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shikoku :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_shikoku_takamatsu', (req, res) => {
    try {
        res.render('pages/japon/japon_shikoku_takamatsu_form', { title: 'Ville de Takamatsu 高松'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shikoku Takamatsu:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_shikoku_kotohira', (req, res) => {
    try {
        res.render('pages/japon/japon_shikoku_kotohira_form', {title: 'Ville de Kotohira 金刀比羅宮'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shikoku Kotohira:", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.get('/japon_shikoku_naoshima', (req, res) => {
    try {
        res.render('pages/japon/japon_shikoku_naoshima_form', { title: 'Ile de Naoshima 直島'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Shikoku Naoshima:", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Ile de Hokkaido
// *******************************************************************************************************************************//

app.get('/japon_hokkaido', (req, res) => {
    try {
        res.render('pages/japon/japon_hokkaido_form', { title: 'Ile de Hokkaido'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Hokkaido :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Ile de Okinawa
// *******************************************************************************************************************************//


app.get('/japon_okinawa', (req, res) => {
    try {
        res.render('pages/japon/japon_okinawa_form', { title: 'Ile d\'Okinawa'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Japon Okinawa :", err);
        res.status(500).send("Erreur serveur.");
    }
});


// ------------------------------------------------------------- Quiz ----------------------------------------------------------//

// *******************************************************************************************************************************//
// Quiz
// *******************************************************************************************************************************//

// Route pour afficher le formulaire du quiz
app.get('/quiz', (req, res) => {
    res.render('pages/quiz/quiz_form', { title: 'Le Quiz', results: [], searchTerm: '' });
});

// Route pour traiter la recherche de quiz
app.post('/quiz/search', async (req, res) => {
    const searchTerm = req.body.searchTerm;
    try {
        const viewName = `vue_quiz_${searchTerm}`;
        const searchPattern = `%${searchTerm}%`;

        console.log("--- Recherche dans Quiz ---");

        // 1. Supprimer la vue si elle existe déjà
        // **************************************
        const dropViewQuery = `DROP VIEW IF EXISTS ${viewName};`;
        console.log("Exécution de la requête SQL :", dropViewQuery);
        await dbPool.query(dropViewQuery);
        console.log(`Vue '${viewName}' supprimée si elle existait.`);

        // 2. Créer la vue avec les questions sélectionées par niveau
        // *************************************************************
        const createViewQuery = `
            CREATE VIEW ${viewName} AS
            SELECT ANNEE, NIVEAU, TEXTE, REP_OK, QUESTION, REP1, REP2, REP3, REP4
            FROM quiz
            WHERE NIVEAU LIKE ?
            ORDER BY RAND()
            LIMIT 1000;`;
        console.log("Exécution de la requête SQL (CREATE VIEW) :", createViewQuery.trim().replace(/\s+/g, ' '));
        console.log("Avec le paramètre de recherche :", searchPattern);
        await dbPool.query(createViewQuery, [searchPattern]);
        console.log(`Vue '${viewName}' créée avec succès.`);

        // 3. Initialiser la variable utilisateur pour l'indexation
        // Note: Cette requête doit être exécutée séparément pour s'assurer que @i est réinitialisé
        const setIndexQuery = `SET @i := 0;`;
        console.log("Exécution de la requête SQL :", setIndexQuery);
        await dbPool.query(setIndexQuery);
        console.log("Variable @i initialisée.");

        // 4. Sélectionner les données de la vue avec l'index
        // Cette requête est exécutée APRÈS que la vue soit créée et @i initialisée
        const selectFromViewQuery = `
            SELECT @i := @i + 1 AS index_quiz, v.*
            FROM ${viewName} v;`;
        console.log("Exécution de la requête SQL (SELECT FROM VIEW) :", selectFromViewQuery.trim().replace(/\s+/g, ' '));
        const [results] = await dbPool.query(selectFromViewQuery);

        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/quiz/quiz_form', {
            title: 'Les questions du quiz',
            results: results, // Maintenant 'results' contiendra les données de la vue
            searchTerm: searchTerm
        });

    } catch (err) {
        console.error("ERREUR lors de la recherche du Quiz :", err);
        res.status(500).send("Erreur serveur lors de la recherche du Quiz.");
    }
});

// *******************************************************************************************************************************//
// Quiz_orale
// *******************************************************************************************************************************//


app.get('/quiz_orale', async (req, res) => {
  const { niveau, annee } = req.query;
 console.log(annee);
  try {
    let results = [];
    if (niveau || annee) {
      const query = `
        SELECT ANNEE, NIVEAU, TEXTE, REP_OK, REP1, REP2, REP3, REP4, TRADUCTION, IMAGE
        FROM quiz_ora
        WHERE ANNEE LIKE ? AND NIVEAU LIKE ?
        LIMIT 1000;
      `;
      console.log(query);
      const params = [
        annee ? annee : '%',
        niveau ? niveau : '%'
      ];
      const [rows] = await dbPool.query(query, params);
      results = rows;
      console.log(results);
    }
   
    res.render('pages/quiz/quiz_orale_form', {
      title: 'Quiz Orale',
      results: results
    });

  } catch (err) {
    console.error("Erreur lors de la requête quiz_orale :", err);
    res.status(500).send("Erreur serveur");
  }
});


// Express et pool MySQL supposés déjà configurés
    app.get('/quiz_orale/:niveau', async (req, res) => {
        const { niveau } = req.params;
        
        console.log(niveau);
        try {
            const [rows] = await dbPool.query(
                'SELECT DISTINCT ANNEE FROM quiz_ora WHERE NIVEAU = ? ORDER BY ANNEE',
                [niveau]
            );
            
            res.json(rows.map(row => row.ANNEE));
            
        } catch (err) {
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    app.get('/quiz_ora_query', async (req, res) => {
        const { annee, niveau } = req.query;

        try {
            const query = `
            SELECT ANNEE, NIVEAU, TEXTE, REP_OK, REP1, REP2, REP3, REP4, TRADUCTION, IMAGE
            FROM quiz_ora
            WHERE ANNEE LIKE ? AND NIVEAU LIKE ?
            LIMIT 1000;
            `;
            const params = [
            annee ? annee : '%',      // Permet de garder la requête générique si non filtré
            niveau ? niveau : '%'
            ];
            console.log("Exécution de la requête :", query);
            const [results] = await dbPool.query(query, params);
            res.json(results);

        } catch (err) {
            console.error("Erreur lors de la requête de recherche avec annee et niveau :", err);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

// ------------------------------------------------------------- Le blog ----------------------------------------------------------//

// *******************************************************************************************************************************//
// Menu Blog liste des articles
// *******************************************************************************************************************************//

app.get('/blog_liste', async (req, res) => {
    try {
        const query = 'SELECT id, titre, contenu, blog_url, date_creat, date_modif FROM blog ORDER BY DATE_MODIF DESC;';
        console.log("Exécution de la requête :", query);

        const [articles] = await dbPool.query(query);

        // Formatage des dates avant de les passer au template
        const formattedArticles = articles.map(article => {
            // Convertir DATE_CREAT et DATE_MODIF en objets Date JavaScript si ce n'est pas déjà fait
            // Si DATE_CREAT/DATE_MODIF sont des strings, il faut les parser
            const dateCreat = article.date_creat ? new Date(article.date_creat) : null;
            const dateModif = article.date_modif ? new Date(article.date_modif) : null;

            // Définir les options de formatage
            const options = { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false // Pour utiliser le format 24 heures (HH:MM)
            };

            return {
                ...article,
                // Utiliser toLocaleString pour formater la date dans le fuseau horaire local du serveur
                // ou spécifiez un fuseau horaire si nécessaire
                DATE_CREAT_FORMATTED: dateCreat ? dateCreat.toLocaleString('fr-FR', options).replace(',', '') : null, // 'fr-FR' pour le format français, .replace(',', '') pour enlever la virgule entre date et heure
                DATE_MODIF_FORMATTED: dateModif ? dateModif.toLocaleString('fr-FR', options).replace(',', '') : null
            };
        });

        console.log(`${formattedArticles.length} Liste des articles formatés.`);
        // console.log(formattedArticles);

        res.render('pages/blog/blog_liste_article_form.ejs', { 
            title: 'Liste des Articles du Blog',
            listeArticles: formattedArticles 
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la liste des articles :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Blog modification ou suppression d'un article
// *******************************************************************************************************************************//
app.get('/blog_modif', async (req, res) => {
    try {
        const query = 'SELECT id, titre, contenu, blog_url, date_creat, date_modif FROM blog ORDER BY DATE_MODIF DESC;';
        console.log("Exécution de la requête :", query);

        const [articles] = await dbPool.query(query);

        // Formatage des dates avant de les passer au template
        const formattedArticles = articles.map(article => {
            // Convertir DATE_CREAT et DATE_MODIF en objets Date JavaScript si ce n'est pas déjà fait
            // Si DATE_CREAT/DATE_MODIF sont des strings, il faut les parser
            const dateCreat = article.date_creat ? new Date(article.date_creat) : null;
            const dateModif = article.date_modif ? new Date(article.date_modif) : null;

            // Définir les options de formatage
            const options = { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: false // Pour utiliser le format 24 heures (HH:MM)
            };

            return {
                ...article,
                // Utiliser toLocaleString pour formater la date dans le fuseau horaire local du serveur
                // ou spécifiez un fuseau horaire si nécessaire
                DATE_CREAT_FORMATTED: dateCreat ? dateCreat.toLocaleString('fr-FR', options).replace(',', '') : null, // 'fr-FR' pour le format français, .replace(',', '') pour enlever la virgule entre date et heure
                DATE_MODIF_FORMATTED: dateModif ? dateModif.toLocaleString('fr-FR', options).replace(',', '') : null
            };
        });

        console.log(`${formattedArticles.length} Liste des articles formatés.`);
        console.log(formattedArticles);

        res.render('pages/blog/blog_modif_article_form.ejs', { 
            title: 'Modifier ou supprimer un Articles du Blog',
            listeArticles: formattedArticles 
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la liste des articles :", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// Blog écriture d'un article
// *******************************************************************************************************************************//

app.get('/blog_ecriture', (req, res) => {
    try {
        res.render('pages/blog/blog_ecriture_article_form', { title: 'Ecrirure d\'un article'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Blog_ecriture :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.post('/blog_stockage', async (req, res) => {
    const artTitre = req.body.titre;
    const artContenu = req.body.contenu;
    const artUrl = req.body.url;
    const artDateCreat = new Date();
    const artDateModif = new Date();

    try {

        const queryDetails=`
            INSERT INTO blog (titre, contenu, blog_url, date_creat, date_modif )
            VALUES (?, ?, ?, ?, ?)
        `;

        // Exécution de la requête avec les valeurs des variables comme paramètres
        // dbPool.query attend un tableau de valeurs correspondant aux placeholders (?)
        await dbPool.query(queryDetails, [artTitre, artContenu, artUrl, artDateCreat, artDateModif]);
        res.redirect('/blog_liste'); // Rediriger vers la liste après modification

        } catch (err) { 
        console.error("ERREUR lors de l'intégration d'un article:", err);
        res.status(500).send("ERREUR lors de l'intégration d'un article:"); 
    }
});

// *******************************************************************************************************************************//
// Blog Route pour afficher le formulaire de modification d'un article
// *******************************************************************************************************************************//


app.get('/blog/modifier/:id', async (req, res) => {
    const articleId = req.params.id;
    try {
        const query = 'SELECT id, titre, contenu, blog_url FROM blog WHERE id = ?';
        const [rows] = await dbPool.query(query, [articleId]);

        if (rows.length === 0) {
            return res.status(404).send("Article non trouvé.");
        }

        const article = rows[0];
        res.render('pages/blog/blog_modifier_article_form.ejs', {
            title: `Modifier l'article : ${article.titre}`,
            article: article
        });

    } catch (err) {
        console.error(`ERREUR lors du chargement de l'article ${articleId} pour modification :`, err);
        res.status(500).send("Erreur serveur.");
    }
});

// Route pour soumettre la modification (POST)

app.post('/blog/modifier/:id', async (req, res) => {
    const articleId = req.params.id;
    const { titre, contenu, url } = req.body; // Récupérer le titre et le contenu du formulaire

    try {
        const query = 'UPDATE blog SET titre = ?, contenu = ?, blog_url = ? , date_modif = NOW() WHERE id = ?';
        await dbPool.query(query, [titre, contenu, url, articleId]);
        res.redirect('/blog_liste'); // Rediriger vers la liste après modification
    } catch (err) {
        console.error(`ERREUR lors de la modification de l'article ${articleId} :`, err);
        res.status(500).send("Erreur serveur.");
    }
});

//*******************************************************************************************************************************//
// Route pour la suppression d'un article (via POST)
//*******************************************************************************************************************************//

app.post('/blog/supprimer/:id', async (req, res) => {
    const articleId = req.params.id;
    try {
        const query = 'DELETE FROM blog WHERE id = ?';
        await dbPool.query(query, [articleId]);
        res.redirect('/blog_liste'); // Rediriger vers la liste après suppression
    } catch (err) {
        console.error(`ERREUR lors de la suppression de l'article ${articleId} :`, err);
        res.status(500).send("Erreur serveur.");
    }
});

//*******************************************************************************************************************************//
// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur Funigo démarré sur http://localhost:${PORT}`);
});

// ------------------------------------------------------------- Le blog tech-------------------------------------------------------//
// *******************************************************************************************************************************//
// Menu Blog_tech liste des articles
// *******************************************************************************************************************************//

app.get('/blog_tech_liste', async (req, res) => {
    try {
        const query = 'SELECT id, type, titre, contenu, image, fichier FROM  note_tech  ORDER BY id DESC;';
        console.log("Exécution de la requête :", query);

        const [articles] = await dbPool.query(query);

        // Formatage des dates avant de les passer au template

        // console.log(`articles.length} Liste des articles TECH formatés.`);
        // console.log(articles);

        res.render('pages/blog/blog_tech_liste_article_form.ejs', { 
            title: 'Liste des Articles du Blog TECH',
            listeArticles: articles 
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la liste des articles TECH:", err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// BLOG_TECH écriture d'un article
// *******************************************************************************************************************************//

app.get('/blog_tech_ecriture', (req, res) => {
    try {
        res.render('pages/blog/blog_tech_ecriture_article_form', { title: 'Ecrirure d\'un article TECH'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Blog_tech_ecriture :", err);
        res.status(500).send("Erreur serveur.");
    }
});

app.post('/blog_tech_stockage', async (req, res) => {
    const artType = req.body.type;
    const artTitre = req.body.titre;
    const artContenu = req.body.contenu;
    const artImage = req.body.image;
    const artFichier = req.body.fichier;

    try {

        const queryDetails=`
            INSERT INTO note_tech (type, titre, contenu, image, fichier )
            VALUES (?, ?, ?, ?, ?)
        `;

        // Exécution de la requête avec les valeurs des variables comme paramètres
        // dbPool.query attend un tableau de valeurs correspondant aux placeholders (?)
        await dbPool.query(queryDetails, [artType, artTitre, artContenu, artImage, artFichier]);
        res.redirect('/blog_tech_liste'); // Rediriger vers la liste après modification

        } catch (err) { 
        console.error("ERREUR lors de l'intégration d'un article TECH:", err);
        res.status(500).send("ERREUR lors de l'intégration d'un article TECH:"); 
    }
});

//*******************************************************************************************************************************//
// BLOG_TECH Route pour la suppression d'un article (via POST)
//*******************************************************************************************************************************//

app.post('/blog_tech/supprimer/:id', async (req, res) => {
    const articleId = req.params.id;
    try {
        const query = 'DELETE FROM note_tech WHERE id = ?';
        await dbPool.query(query, [articleId]);
        res.redirect('/blog_tech_liste'); // Rediriger vers la liste après suppression
    } catch (err) {
        console.error(`ERREUR lors de la suppression de l'article TECH ${articleId} :`, err);
        res.status(500).send("Erreur serveur.");
    }
});

// *******************************************************************************************************************************//
// BLOG_TECH modification ou suppression d'un article
// *******************************************************************************************************************************//
app.get('/blog_tech_modif', async (req, res) => {
    try {
        const query = 'SELECT id, type, titre, contenu, image, fichier FROM note_tech ORDER BY id DESC;';
        console.log("Exécution de la requête :", query);

        const [articles] = await dbPool.query(query);


        res.render('pages/blog/blog_tech_modif_article_form.ejs', { 
            title: 'Modifier ou supprimer un Articles du Blog TECH',
            listeArticles: articles 
        });

    } catch (err) {
        console.error("ERREUR lors du chargement de la liste des articles TECH:", err);
        res.status(500).send("Erreur serveur.");
    }
});

//*******************************************************************************************************************************//
// BLOG_TECH Route pour la suppression d'un article (via POST)
//*******************************************************************************************************************************//

app.post('/blog_tech/supprimer/:id', async (req, res) => {
    const articleId = req.params.id;
    try {
        const query = 'DELETE FROM note_tech WHERE id = ?';
        await dbPool.query(query, [articleId]);
        res.redirect('/blog_tech_liste'); // Rediriger vers la liste après suppression
    } catch (err) {
        console.error(`ERREUR lors de la suppression de l'article TECH ${articleId} :`, err);
        res.status(500).send("Erreur serveur.");
    }
});


// *******************************************************************************************************************************//
// BLOG_TECH Route pour afficher le formulaire de modification d'un article
// *******************************************************************************************************************************//


app.get('/blog_tech/modifier/:id', async (req, res) => {
    const articleId = req.params.id;
    try {
        const query = 'SELECT id, titre, contenu FROM note_tech WHERE id = ?';
        const [rows] = await dbPool.query(query, [articleId]);

        if (rows.length === 0) {
            return res.status(404).send("Article non trouvé.");
        }

        const article = rows[0];
        res.render('pages/blog/blog_tech_modifier_article_form.ejs', {
            title: `Modifier l'article : ${article.titre}`,
            article: article
        });

    } catch (err) {
        console.error(`ERREUR lors du chargement de l'article ${articleId} TECH pour modification :`, err);
        res.status(500).send("Erreur serveur.");
    }
});

// Route pour soumettre la modification (POST)
console.log('block tech modifier');

app.post('/blog_tech/modifier/:id', async (req, res) => {
    const articleId = req.params.id;
    const { type, titre, contenu, image, fichier  } = req.body; // Récupérer le titre et le contenu du formulaire

    try {
        const query = 'UPDATE note_tech SET type = ?, titre = ?, contenu = ?, image = ?, fichier = ? WHERE id = ?';
        await dbPool.query(query, [type, titre, contenu, image, fichier, articleId]);
        console.log('Article modifier')
            res.redirect('/blog_tech_liste'); // Rediriger vers la liste après modification

    } catch (err) {
        console.error(`ERREUR lors de la modification de l'article ${articleId} TECH :`, err);
        res.status(500).send("Erreur serveur.");
    }
});
// *******************************************************************************************************************************//
/// BLOG_TECH Route blog_tech_rech  d'un articles dans blog_tech
// *******************************************************************************************************************************//

app.get('/blog_tech_rech', (req, res) => {
    // On envoie un tableau vide sous le nom 'listeArticles' pour éviter l'erreur au premier chargement
    res.render('pages/blog/blog_tech_rech_form', { 
        title: 'Recherche d\'un article', 
        listeArticles: [], 
        searchTerm: '' 
    });
});

app.post('/blog_tech_rech/search',  async (req, res) => {
    const searchTerm = req.body.searchTerm.trim();
	
try {
    const searchTerm = req.body.searchTerm.trim();
    const searchPattern = `%${searchTerm}%`; // Ajout des % pour le LIKE

    const query = `
        SELECT id, type, titre, contenu, image, fichier 
        FROM note_tech 
        WHERE titre LIKE ? OR contenu LIKE ?`;

    // On passe [searchPattern, searchPattern] pour remplir les deux "?"
    const [articles] = await dbPool.query(query, [searchPattern, searchPattern]);

    res.render('pages/blog/blog_tech_rech_form', { 
        title: 'Résultats de recherche',
        listeArticles: articles, // Le nom doit correspondre à celui de l'EJS
        searchTerm: searchTerm
    });

} catch (err) {
    console.error("ERREUR :", err);
    res.status(500).send("Erreur serveur.");
}
});

// ------------------------------------------------------------- LANGUE Leçon ----------------------------------------------------//
// *******************************************************************************************************************************//
// Menu Lecon
// *******************************************************************************************************************************//

app.get('/lecon', (req, res) => {
    try {
        res.render('pages/lecon/lecon_form', { title: 'Leçons'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Leçons :", err);
        res.status(500).send("Erreur serveur.");
    }
});


// *******************************************************************************************************************************//
// Menu lecon 01 
// *******************************************************************************************************************************//

app.get('/lecon01', (req, res) => {
    try {
        res.render('pages/lecon/lecon_01_10/lecon_01/lecon01_form', { title: 'Leçon 01'});
    } catch (err) {
        console.error("ERREUR lors du chargement de la page de Leçons 01", err);
        res.status(500).send("Erreur serveur.");
    }
});

// dialogue de la leçon 01

app.get('/lecon_dialogue', async (req, res) => {
    const paramName1 = req.query.paramName1;
    const paramName2 = req.query.paramName2;

    if (!paramName1 || !paramName2) {
        return res.status(400).send("Les paramètres 'paramName1' et 'paramName2' sont requis.");
    }

    try {
        const query = `SELECT dialogue_num, kanji, hiragana, romanji, francais, explication 
                       FROM dialogue 
                       WHERE lecon_num = ? AND dialogue_num = ?;`;
        const [results] = await dbPool.query(query, [paramName1, paramName2]);

        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/lecon/lecon_01_10/lecon_01/lecon_dialogue_form', {
            title: `${paramName1} - ${paramName2}`,
            results: results
        });

    } catch (err) {
        console.error(`ERREUR lors du chargement de Vocabulaire de la leçon ${paramName}`, err);
        res.status(500).send("Erreur serveur.");
    }
});


// vocabulaire de la leçon 01

app.get('/lecon_vocabulaire', async (req, res) => {
    const paramName = req.query.paramName;
    const section = req.query.section;

    if (!paramName) {
        return res.status(400).send("Le paramètre 'paramName' est requis.");
    }

    try {
        const query = `SELECT section, kanji, hiragana, romanji, francais, type 
                       FROM vocabulaire 
                       WHERE lecon_num = ? AND section = ?;`;
        const [results] = await dbPool.query(query, [paramName, section]);

        console.log("Résultat brut obtenu de la DB :", results);
        console.log("Nombre de résultats trouvés :", results.length);
        console.log("--------------------------------------");

        res.render('pages/lecon/lecon_01_10/lecon_01/lecon01_vocab_form', {
            title: `Vocabulaire de la leçon ${paramName} - ${section}`,
            results: results
        });

    } catch (err) {
        console.error(`ERREUR lors du chargement de Vocabulaire de la leçon ${paramName}`, err);
        res.status(500).send("Erreur serveur.");
    }
});


