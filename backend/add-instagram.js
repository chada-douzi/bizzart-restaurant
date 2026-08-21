const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017/bizzart');
  await client.connect();
  const db = client.db();
  
  console.log('━━━ AJOUT INSTAGRAM ━━━\n');
  
  const settings = await db.collection('settings').findOne({});
  
  console.log('Instagram actuel:', settings?.socialMedia?.instagram || 'non configuré');
  console.log('');
  
  if (!settings?.socialMedia?.instagram || settings.socialMedia.instagram === '') {
    console.log('Ajout URL Instagram...');
    const result = await db.collection('settings').updateOne(
      {},
      { $set: { 'socialMedia.instagram': 'https://www.instagram.com/bizzart_monastir/' } }
    );
    console.log('✅ Instagram ajouté (', result.modifiedCount, 'document modifié)');
  } else {
    console.log('✅ Instagram déjà configuré:', settings.socialMedia.instagram);
  }
  
  console.log('');
  
  // Vérification
  const updated = await db.collection('settings').findOne({});
  console.log('━━━ VÉRIFICATION ━━━\n');
  console.log('Instagram:', updated.socialMedia?.instagram);
  console.log('');
  
  await client.close();
})();
