const http = require('http');
const fs = require('fs');

// Fetch galerie API
http.get('http://localhost:3000/api/gallery?limit=100', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const media = json.data?.media || [];
      
      console.log('━━━ AUDIT GALERIE COMPLÈTE ━━━\n');
      console.log(`Total médias: ${media.length}\n`);
      
      // Sauvegarder JSON complet
      fs.writeFileSync('gallery-audit-complete.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        total: media.length,
        media: media
      }, null, 2));
      
      console.log('✅ Sauvegardé: gallery-audit-complete.json\n');
      
      // Afficher inventaire résumé
      console.log('━━━ INVENTAIRE PAR CATÉGORIE ━━━\n');
      const byCategory = {};
      media.forEach(m => {
        if (!byCategory[m.category]) byCategory[m.category] = [];
        byCategory[m.category].push(m);
      });
      
      Object.keys(byCategory).forEach(cat => {
        console.log(`${cat}: ${byCategory[cat].length} images`);
      });
      
      console.log('\n━━━ LISTE COMPLÈTE ━━━\n');
      media.forEach((m, i) => {
        console.log(`${i + 1}. [${m.category}] ${m.title || '(sans titre)'}`);
        console.log(`   ID: ${m._id}`);
        console.log(`   URL: ${m.url.substring(0, 80)}...`);
        console.log('');
      });
      
    } catch (e) {
      console.error('❌ Erreur:', e);
    }
  });
}).on('error', (e) => {
  console.error('❌ Erreur requête:', e);
});
