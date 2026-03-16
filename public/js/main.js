document.addEventListener('DOMContentLoaded', () => {
    // --- Code existant pour les APIs ---
    const weatherApiUrlParis = 'https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m,cloud_cover,rain';
    const weatherApiUrlTokyo = 'https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.69&current=temperature_2m,cloud_cover,rain';
    const currencyApiUrl = 'https://api.exchangerate-api.com/v4/latest/EUR';

    // --- Logique du Menu Hamburger ---
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('#nav-links');

    // On vérifie que le menu hamburger existe
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }


    // --- Logique pour les sous-menus sur mobile (accordéon) ---
    const dropdownToggles = document.querySelectorAll('.dropdown > a');
    

    dropdownToggles.forEach(clickedToggle => {
        clickedToggle.addEventListener('click', (event) => {
            if (window.getComputedStyle(hamburger).display !== 'none') {
                event.preventDefault();
                const currentSubmenu = clickedToggle.nextElementSibling;
                dropdownToggles.forEach(otherToggle => {
                    if (otherToggle !== clickedToggle) {
                        otherToggle.nextElementSibling.classList.remove('open');
                    }
                });
                currentSubmenu.classList.toggle('open');
            }
        });
    });

    // --- NOUVEAU : Logique pour marquer l'onglet actif en vert ---
    const topLevelLinks = document.querySelectorAll('#nav-links > li > a');

    topLevelLinks.forEach(link => {
        link.addEventListener('click', () => {
            // D'abord, on retire la classe 'menu-active' de TOUS les onglets
            topLevelLinks.forEach(l => l.classList.remove('menu-active'));
            // Ensuite, on l'ajoute UNIQUEMENT à celui qui a été cliqué
            link.classList.add('menu-active');
        });
    });


    // --- Fonctions Fetch ---
    function fetchWeather(city, url) { /* ... (code inchangé) ... */ }
    function fetchCurrencyRate() { /* ... (code inchangé) ... */ }
    
    // (Je remets le code complet des fonctions pour être sûr)
    function fetchWeather(city, url) {
        fetch(url).then(response => response.json())
        .then(data => {
            if (data && data.current) {
                document.getElementById(`${city}-temp`).textContent = Math.round(data.current.temperature_2m);
                document.getElementById(`${city}-clouds`).textContent = data.current.cloud_cover;
                document.getElementById(`${city}-rain`).textContent = data.current.rain;
            }
        }).catch(error => console.error(`Erreur météo pour ${city}:`, error));
    }
    function fetchCurrencyRate() {
        fetch(currencyApiUrl).then(response => response.json())
        .then(data => {
            if (data && data.rates && data.rates.JPY) {
                document.getElementById('eur-jpy-rate').textContent = data.rates.JPY.toFixed(2);
            }
        }).catch(error => console.error('Erreur devise:', error));
    }

    // Lancement des appels API
    fetchWeather('paris', weatherApiUrlParis);
    fetchWeather('tokyo', weatherApiUrlTokyo);
    fetchCurrencyRate();

    
    // ***************************  page d'acceuil ******************************************************
   // Fichier : public/js/main.js (Nouvelles options pour le carrousel)

    const swiper = new Swiper('.my-swiper', {
        // --- NOUVELLES OPTIONS POUR L'AFFICHAGE EN GRILLE ---
        slidesPerView: 3,      // Affiche 3 slides en même temps sur grand écran
        spaceBetween: 20,      // Espace de 20px entre les slides
        
        loop: true, // pour faire tourner en boucle
        
        autoplay: {
            delay: 3000,  // temps en ms entre deux slides (ici 3 secondes)
            disableOnInteraction: false, // continue l'autoplay même après une action de l'utilisateur 
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        
        // --- NOUVEAU : Rendre le carrousel "responsive" ---
        // Pour que sur les petits écrans (mobiles), on ne voie qu'une seule image
        breakpoints: {
            // quand la largeur de la fenêtre est >= 320px
            320: {
            slidesPerView: 3,
            spaceBetween: 10
            },
            // quand la largeur de la fenêtre est >= 768px
            768: {
            slidesPerView: 4,
            spaceBetween: 20
            },
            // quand la largeur de la fenêtre est >= 1024px
            1024: {
            slidesPerView: 6,
            spaceBetween: 30
            }
        }
    });
    // ***************************  page carte des régions ******************************************************
    // Fonction:  charger l'image position pour la région dans region_carte_form.ejs
    // --- NOUVEAU : Logique pour la page carte des régions ---
    const regionSelect = document.getElementById('region-select');

    if (regionSelect) {
        const cartesContainer = document.getElementById('cartes-container');
        const positionImage = document.getElementById('region-position-image');
        const departementImage = document.getElementById('region-departement-image');

        regionSelect.addEventListener('change', () => {
            const selectedRegion = regionSelect.value;

            if (selectedRegion) {
                // Construire les deux chemins d'image
                const positionImagePath = `/images/cartes/france/reg_position/${selectedRegion}.webp`;
                const departementImagePath = `/images/cartes/france/reg_departement/${selectedRegion}.webp`;
                
                // Mettre à jour la source des deux images
                positionImage.src = positionImagePath;
                departementImage.src = departementImagePath;

                // Afficher le conteneur principal
                cartesContainer.style.display = 'flex'; // On utilise 'flex' pour activer le CSS Flexbox

            } else {
                // Cacher le conteneur si aucune région n'est sélectionnée
                cartesContainer.style.display = 'none';
            }
        });
    }

    // ====================================================================================
    // === NOUVELLE LOGIQUE STRUCTURÉE POUR LES PAGES DES DÉPARTEMENTS ===
    // ====================================================================================

    // --- Logique pour la page de RECHERCHE des départements (celle avec le formulaire) ---
    const depForm = document.getElementById('dep-form');
    if (depForm) {
        console.log("Logique pour la page de recherche des départements activée.");
        const nomSelect = document.getElementById('dep-nom-select');
        const numSelect = document.getElementById('dep-num-select');
        const prefSelect = document.getElementById('dep-pref-select');

        // On stocke la dernière liste modifiée pour éviter les boucles infinies
        let lastChanged = null;

         nomSelect.addEventListener('change', () => {
        // On ne fait quelque chose que si l'utilisateur a vraiment changé cette liste
        if (lastChanged !== nomSelect) {
            lastChanged = nomSelect;
            // On réinitialise les autres listes
            numSelect.value = '';
            prefSelect.value = '';
            // On soumet le formulaire
            if (nomSelect.value) depForm.submit();
            }
        });

        numSelect.addEventListener('change', () => {
            if (lastChanged !== numSelect) {
                lastChanged = numSelect;
                nomSelect.value = '';
                prefSelect.value = '';
                if (numSelect.value) depForm.submit();
            }
        });

        prefSelect.addEventListener('change', () => {
            if (lastChanged !== prefSelect) {
                lastChanged = prefSelect;
                nomSelect.value = '';
                numSelect.value = '';
                if (prefSelect.value) depForm.submit();
            }
        });
    }

// ====================================================================================
// === NOUVELLE LOGIQUE STRUCTURÉE POUR LES DETAILS ONOMATOPEES ===
// ====================================================================================

const onoDetailForm = document.getElementById('ono-detail-form'); // Assurez-vous que l'ID est correct
if (onoDetailForm) {
    console.log("Logique pour la page de recherche des détails de l'onomatopée activée.");
    
    // Récupération des 3 listes déroulantes
    const onoKatakanaSelect = document.getElementById('ono-katana-select');
    const onoSignificationSelect = document.getElementById('ono-signification-select');
    const onoRomanjiSelect = document.getElementById('ono-romanji-select');

    // On stocke la dernière liste modifiée pour éviter les soumissions multiples
    let lastChanged = null;

    // Écouteur pour la liste Katakana
    onoKatakanaSelect.addEventListener('change', () => {
        // On ne fait rien si l'événement a été déclenché par une autre liste
        if (lastChanged !== onoKatakanaSelect) {
            lastChanged = onoKatakanaSelect;
            // On réinitialise les autres listes pour garantir qu'un seul critère est envoyé
            onoSignificationSelect.value = '';
            onoRomanjiSelect.value = '';
            // On soumet le formulaire si une valeur est sélectionnée
            if (onoKatakanaSelect.value) {
                onoDetailForm.submit(); // C'est ici que la requête POST est lancée
            }
        }
    });

    // Écouteur pour la liste Signification
    onoSignificationSelect.addEventListener('change', () => {
        if (lastChanged !== onoSignificationSelect) {
            lastChanged = onoSignificationSelect;
            onoKatakanaSelect.value = '';
            onoRomanjiSelect.value = '';
            if (onoSignificationSelect.value) {
                onoDetailForm.submit();
            }
        }
    });

    // Écouteur pour la liste Romanji
    onoRomanjiSelect.addEventListener('change', () => {
        if (lastChanged !== onoRomanjiSelect) {
            lastChanged = onoRomanjiSelect;
            onoKatakanaSelect.value = '';
            onoSignificationSelect.value = '';
            if (onoRomanjiSelect.value) {
                onoDetailForm.submit();
            }
        }
    });
}

    // ====================================================================================
    // ***************************  page carte des DÉPARTEMENTS ***************************
    // --- NOUVEAU : Logique pour la page carte des DÉPARTEMENTS ---

    const nomSelect = document.getElementById('dep-nom-select');
    const numSelect = document.getElementById('dep-num-select');

    // On exécute le code uniquement si les listes déroulantes existent
    if (nomSelect && numSelect) {
        const cartesContainer = document.getElementById('cartes-container');
        // Les images
        const positionImage = document.getElementById('dep-position-image');
        const carteImage = document.getElementById('dep-carte-image');
        const aggloImage = document.getElementById('dep-agglo-image');
        // Les titres des cartes
        const titre1 = document.getElementById('carte-titre-1');
        const titre2 = document.getElementById('carte-titre-2');
        const titre3 = document.getElementById('carte-titre-3');

        // Fonction centrale pour mettre à jour les images et titres
        function updateDisplay(numero, nom) {
            // Si on n'a pas les infos, on ne fait rien
            if (!numero || !nom) return;

            // Construire le nom de fichier commun
            const filename = `${numero}-${nom}.webp`;

            // Mettre à jour les titres des cartes
            titre1.textContent = `Position de "${nom}"`;
            titre2.textContent = `Carte de "${nom}"`;
            titre3.textContent = `Agglomérations de "${nom}"`;
            
            // Mettre à jour les sources des 3 images
            positionImage.src = `/images/cartes/france/dep_position/${filename}`;
            carteImage.src = `/images/cartes/france/dep_carte/${filename}`;
            aggloImage.src = `/images/cartes/france/dep_aglomeration/${filename}`;

            // Afficher le conteneur des cartes
            cartesContainer.style.display = 'flex';
        }

        // Événement pour la liste des NOMS
        nomSelect.addEventListener('change', (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const nom = selectedOption.value;
            const numero = selectedOption.dataset.numero;

            // Synchroniser l'autre liste
            numSelect.value = numero;
            // Mettre à jour l'affichage
            updateDisplay(numero, nom);
        });

        // Événement pour la liste des NUMÉROS
        numSelect.addEventListener('change', (event) => {
            const selectedOption = event.target.selectedOptions[0];
            const numero = selectedOption.value;
            const nom = selectedOption.dataset.nom;

            // Synchroniser l'autre liste
            nomSelect.value = nom;
            // Mettre à jour l'affichage
            updateDisplay(numero, nom);
        });
    }

});


