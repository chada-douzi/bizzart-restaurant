import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

interface CloudinaryMedia {
  index: number;
  id: string;
  title: string;
  url: string;
  category: string;
  isActive: boolean;
  publicId?: string;
}

function httpGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

async function fetchCloudinaryInventory() {
  console.log('📸 INVENTAIRE PHOTOS CLOUDINARY — BIZZ\'ART\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  try {
    // Récupérer les médias depuis l'API
    console.log('🔗 Connexion à l\'API Gallery...\n');
    const response = await httpGet('http://localhost:3000/api/gallery?limit=100');
    
    if (!response || !response.success || !response.data || !response.data.media) {
      throw new Error('Format de réponse API invalide');
    }
    
    const mediaData = response.data.media;
    const pagination = response.data.pagination;
    
    console.log(`✅ ${mediaData.length} médias trouvés sur ${pagination.total} total\n`);

    // Créer le dossier cloudinary-existing
    const existingDir = path.join(__dirname, '../../../menu-images/cloudinary-existing');
    if (!fs.existsSync(existingDir)) {
      fs.mkdirSync(existingDir, { recursive: true });
      console.log(`✅ Dossier créé : ${existingDir}\n`);
    }

    // Créer le manifest
    const manifest: CloudinaryMedia[] = mediaData.map((media: any, index: number) => ({
      index: index + 1,
      id: media._id || media.id,
      title: media.title || 'Sans titre',
      url: media.url,
      category: media.category || 'gallery',
      isActive: media.isVisible !== false,
      publicId: media.publicId
    }));

    // Sauvegarder le manifest
    const manifestPath = path.join(existingDir, 'cloudinary-existing-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`✅ Manifest sauvegardé : ${manifestPath}\n`);

    // Afficher le résumé
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log('📊 RÉSUMÉ INVENTAIRE\n');
    console.log(`   Total médias         : ${manifest.length}`);
    console.log(`   Médias actifs        : ${manifest.filter(m => m.isActive).length}`);
    console.log(`   Médias inactifs      : ${manifest.filter(m => !m.isActive).length}`);
    
    // Grouper par catégorie
    const byCategory = new Map<string, number>();
    manifest.forEach(m => {
      const count = byCategory.get(m.category) || 0;
      byCategory.set(m.category, count + 1);
    });

    console.log('\n   Par catégorie :');
    for (const [category, count] of byCategory) {
      console.log(`   - ${category.padEnd(20)} : ${count}`);
    }

    console.log('\n════════════════════════════════════════════════════════════════\n');

    // Afficher les URLs
    console.log('📋 LISTE DES MÉDIAS\n');
    manifest.forEach(media => {
      console.log(`${media.index.toString().padStart(3, '0')}. ${media.title}`);
      console.log(`     URL: ${media.url}`);
      console.log(`     Catégorie: ${media.category} | Actif: ${media.isActive ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('════════════════════════════════════════════════════════════════\n');
    console.log('✅ INVENTAIRE TERMINÉ\n');
    console.log(`Manifest disponible : ${manifestPath}\n`);

  } catch (error: any) {
    console.error('❌ ERREUR lors de la récupération des médias\n');
    console.error(`Erreur : ${error.message}\n`);
    
    console.error('Assurez-vous que le backend est accessible sur http://localhost:3000\n');
    
    process.exit(1);
  }
}

fetchCloudinaryInventory();
