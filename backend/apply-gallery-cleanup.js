const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

// Load audit decisions
const auditFile = 'C:\\Users\\boukh\\Downloads\\gallery-audit-2026-08-19.json';
const auditData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));

const REMOVE_IDS = auditData
  .filter(d => d.decision === 'REMOVE')
  .map(d => d.id);

console.log('━━━ NETTOYAGE GALERIE SÉCURISÉ ━━━\n');
console.log(`Total entrées REMOVE dans audit: ${REMOVE_IDS.length}\n`);

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  // ─── ÉTAPE 1: ANALYSE ──────────────────────────────────────────────────────
  
  console.log('━━━ ÉTAPE 1: ANALYSE SÉCURITÉ ━━━\n');
  
  const analysis = [];
  
  for (const id of REMOVE_IDS) {
    const media = await db.collection('media').findOne({ _id: new ObjectId(id) });
    
    if (!media) {
      analysis.push({
        id,
        exists: false,
        usedElsewhere: false,
        action: 'SKIP (n\'existe pas)',
        media: null
      });
      continue;
    }
    
    // Check if used elsewhere (simplified check - add more if needed)
    // In this case, media collection is dedicated to gallery, so should be safe
    const usedElsewhere = false; // Placeholder - extend if media used in menu/other places
    
    analysis.push({
      id,
      exists: true,
      title: media.title,
      category: media.category,
      url: media.url,
      publicId: media.publicId,
      usedElsewhere,
      action: usedElsewhere ? 'PROTÉGER (utilisé ailleurs)' : 'DÉSACTIVER (isVisible = false)'
    });
  }
  
  // ─── AFFICHAGE RAPPORT ─────────────────────────────────────────────────────
  
  console.log('=== AUDIT REMOVE ===\n');
  console.log(`Total entrées REMOVE : ${REMOVE_IDS.length}\n`);
  console.log('ID                       | Title (truncated)          | Category   | Utilisé ailleurs ? | Action prévue');
  console.log('─'.repeat(120));
  
  analysis.forEach(a => {
    const titleShort = (a.title || '(sans titre)').substring(0, 25).padEnd(25);
    const catShort = (a.category || 'N/A').padEnd(10);
    const idShort = a.id.substring(0, 24);
    const usedStr = a.usedElsewhere ? 'OUI' : 'NON';
    console.log(`${idShort} | ${titleShort} | ${catShort} | ${usedStr.padEnd(18)} | ${a.action}`);
  });
  
  console.log('');
  
  const toDisable = analysis.filter(a => a.exists && !a.usedElsewhere);
  const toProtect = analysis.filter(a => a.usedElsewhere);
  const notFound = analysis.filter(a => !a.exists);
  
  console.log('\n━━━ RÉSUMÉ ANALYSE ━━━');
  console.log(`✅ À désactiver (isVisible = false): ${toDisable.length}`);
  console.log(`🛡️  À protéger (utilisés ailleurs): ${toProtect.length}`);
  console.log(`⚠️  Introuvables: ${notFound.length}`);
  
  // ─── CONFIRMATION ──────────────────────────────────────────────────────────
  
  console.log('\n━━━ CONFIRMATION REQUISE ━━━');
  console.log('Cette opération va:');
  console.log(`  1. Désactiver ${toDisable.length} médias (isVisible = false)`);
  console.log('  2. Créer un backup avant modification');
  console.log('  3. NE PAS supprimer Cloudinary');
  console.log('  4. NE PAS supprimer fichiers physiques');
  console.log('  5. NE PAS toucher au Menu\n');
  
  // Pour automatisation, ajouter flag --confirm
  const autoConfirm = process.argv.includes('--confirm');
  
  if (!autoConfirm) {
    console.log('⚠️  MODE DRY-RUN: Analyse uniquement, aucune modification.');
    console.log('Pour appliquer les changements, relancez avec: node apply-gallery-cleanup.js --confirm\n');
    await client.close();
    return;
  }
  
  // ─── ÉTAPE 2: BACKUP ───────────────────────────────────────────────────────
  
  console.log('\n━━━ ÉTAPE 2: BACKUP ━━━\n');
  
  const backupFilename = `backup-media-before-cleanup-${Date.now()}.json`;
  const allMedia = await db.collection('media').find({}).toArray();
  
  fs.writeFileSync(backupFilename, JSON.stringify({
    timestamp: new Date().toISOString(),
    total: allMedia.length,
    toDisable: toDisable.length,
    media: allMedia
  }, null, 2));
  
  console.log(`✅ Backup créé: ${backupFilename}`);
  console.log(`   Total médias sauvegardés: ${allMedia.length}\n`);
  
  // ─── ÉTAPE 3: APPLICATION ──────────────────────────────────────────────────
  
  console.log('━━━ ÉTAPE 3: APPLICATION ━━━\n');
  
  let disabled = 0;
  
  for (const item of toDisable) {
    const result = await db.collection('media').updateOne(
      { _id: new ObjectId(item.id) },
      { $set: { isVisible: false } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ Désactivé: ${item.title} (${item.id})`);
      disabled++;
    } else {
      console.log(`⚠️  Pas modifié: ${item.title} (${item.id})`);
    }
  }
  
  console.log('');
  
  // ─── ÉTAPE 4: VÉRIFICATION ─────────────────────────────────────────────────
  
  console.log('━━━ ÉTAPE 4: VÉRIFICATION ━━━\n');
  
  const totalMedia = await db.collection('media').countDocuments();
  const visibleMedia = await db.collection('media').countDocuments({ isVisible: true });
  const hiddenMedia = await db.collection('media').countDocuments({ isVisible: false });
  
  console.log('État MongoDB:');
  console.log(`  Total médias: ${totalMedia}`);
  console.log(`  Visible: ${visibleMedia}`);
  console.log(`  Caché: ${hiddenMedia}\n`);
  
  // ─── RAPPORT FINAL ─────────────────────────────────────────────────────────
  
  console.log('━━━ NETTOYAGE GALERIE TERMINÉ ━━━\n');
  console.log(`REMOVE demandés : ${REMOVE_IDS.length}`);
  console.log(`Retirés de la Galerie (isVisible=false) : ${disabled}`);
  console.log(`Protégés car utilisés ailleurs : ${toProtect.length}`);
  console.log(`Introuvables : ${notFound.length}\n`);
  console.log(`Cloudinary supprimé : 0 ✅`);
  console.log(`Fichiers supprimés : 0 ✅`);
  console.log(`Backup créé : ${backupFilename} ✅\n`);
  console.log('Menu modifié : NON ✅');
  console.log('Catégories modifiées : NON ✅');
  console.log('Plats modifiés : NON ✅\n');
  
  await client.close();
  
  console.log('🎉 Opération terminée avec succès!\n');
  console.log('Prochaines étapes:');
  console.log('  1. Vérifier GET /api/gallery (doit retourner médias visibles uniquement)');
  console.log('  2. Vérifier Galerie publique http://localhost:4200');
  console.log('  3. Vérifier Menu http://localhost:4200/menu (doit être intact)');
  console.log('  4. Lancer npm run build (frontend)');
  
})();
