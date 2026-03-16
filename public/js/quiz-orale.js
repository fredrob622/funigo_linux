document.getElementById('niveau-select').addEventListener('change', function () {
  const niveau = this.value;
  const anneeSelect = document.getElementById('annee-select');
  
  // Vide la liste année
  anneeSelect.innerHTML = '<option value="">Choisir une année</option>';
  
  if (!niveau) return; // Aucun choix : on arrête

  fetch(`/quiz_orale/${niveau}`)
    .then(res => res.json())
    .then(annees => {
        const anneesUniques = [...new Set(annees)];
        anneesUniques.forEach(annee => {
        const option = document.createElement('option');
        option.value = annee;
        option.textContent = annee;
        anneeSelect.appendChild(option);  
      });
    });

});


    