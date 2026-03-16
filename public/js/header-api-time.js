// Fichier : public/js/header-api-time.js (VERSION FINALE avec Intl)

document.addEventListener("DOMContentLoaded", () => {

    // --- 1. Créer les formateurs d'heure une seule fois ---
    // C'est plus performant de les créer en avance.

    // Formateur pour Paris
    const parisTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Utiliser le format 24h
    });

    // Formateur pour Tokyo
    const tokyoTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Utiliser le format 24h
    });

    // --- 2. Fonction pour mettre à jour l'affichage ---
    // Cette fonction sera appelée toutes les secondes.
    function updateClocks() {
        // On récupère l'heure ACTUELLE du système de l'utilisateur
        const now = new Date();

        // On formate cette heure pour chaque fuseau horaire et on met à jour le HTML
        document.getElementById('paris-time').textContent = parisTimeFormatter.format(now);
        document.getElementById('tokyo-time').textContent = tokyoTimeFormatter.format(now);
    }

    // --- 3. Lancer la mise à jour ---

    // On appelle la fonction une première fois pour un affichage immédiat
    updateClocks();

    // On lance la mise à jour toutes les secondes (1000 ms)
    setInterval(updateClocks, 1000);

});