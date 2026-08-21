import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

interface CloudinaryMedia {
  index: number;
  id: string;
  title: string;
  url: string;
  category: string;
  isActive: boolean;
  publicId?: string;
}

interface DownloadResult {
  index: number;
  url: string;
  filename: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  error?: string;
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadCloudinaryPhotos() {
  console.log('📥 TÉLÉCHARGEMENT PHOTOS CLOUDINARY — BIZZ\'ART\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  const existingDir = path.join(__dirname, '../../../menu-images/cloudinary-existing');
  const manifestPath = path.join(existingDir, 'cloudinary-existing-manifest.json');

  // Vérifications
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Manifest introuvable\n');
    console.error('Exécutez d\'abord : npm run cloudinary:inventory\n');
    process.exit(1);
  }

  // Charger le manifest
  const manifest: CloudinaryMedia[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`✅ Manifest chargé : ${manifest.length} médias\n`);

  // Filtrer uniquement les URLs Cloudinary HTTPS
  const cloudinaryPhotos = manifest.filter(m => 
    m.url.startsWith('https://res.cloudinary.com/')
  );

  console.log(`📸 Photos Cloudinary trouvées : ${cloudinaryPhotos.length}\n`);
  console.log(`⏭️  URLs locales ignorées      : ${manifest.length - cloudinaryPhotos.length}\n`);

  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('🚀 TÉLÉCHARGEMENT EN COURS...\n');

  const results: DownloadResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const photo of cloudinaryPhotos) {
    const ext = path.extname(photo.url).split('?')[0] || '.jpg';
    const filename = `${photo.index.toString().padStart(3, '0')}${ext}`;
    const filepath = path.join(existingDir, filename);

    // Vérifier si le fichier existe déjà
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${photo.index.toString().padStart(3, '0')}. DÉJÀ TÉLÉCHARGÉ : ${filename}`);
      results.push({
        index: photo.index,
        url: photo.url,
        filename: filename,
        status: 'SKIPPED'
      });
      continue;
    }

    try {
      console.log(`   ${photo.index.toString().padStart(3, '0')}. Téléchargement : ${filename}...`);
      await downloadFile(photo.url, filepath);
      console.log(`   ✅ Succès : ${filename}`);
      
      results.push({
        index: photo.index,
        url: photo.url,
        filename: filename,
        status: 'SUCCESS'
      });
      
      successCount++;
      
    } catch (error: any) {
      console.log(`   ❌ Échec : ${filename} → ${error.message}`);
      
      results.push({
        index: photo.index,
        url: photo.url,
        filename: filename,
        status: 'FAILED',
        error: error.message
      });
      
      failedCount++;
    }
  }

  // Sauvegarder le rapport
  const reportPath = path.join(existingDir, 'download-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log('\n════════════════════════════════════════════════════════════════\n');
  console.log('📊 RÉSULTAT TÉLÉCHARGEMENT\n');
  console.log(`   Total photos Cloudinary  : ${cloudinaryPhotos.length}`);
  console.log(`   ✅ Téléchargées           : ${successCount}`);
  console.log(`   ⏭️  Déjà existantes        : ${results.filter(r => r.status === 'SKIPPED').length}`);
  console.log(`   ❌ Échouées               : ${failedCount}`);
  console.log('');
  
  console.log(`✅ Rapport sauvegardé : ${reportPath}\n`);

  console.log('════════════════════════════════════════════════════════════════\n');
  
  if (failedCount > 0) {
    console.log('⚠️  PHOTOS ÉCHOUÉES\n');
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(`   ${r.index.toString().padStart(3, '0')}. ${r.filename} → ${r.error}`);
    });
    console.log('');
  }

  console.log('✅ TÉLÉCHARGEMENT TERMINÉ\n');
  console.log(`Photos disponibles dans : ${existingDir}\n`);
}

downloadCloudinaryPhotos();
