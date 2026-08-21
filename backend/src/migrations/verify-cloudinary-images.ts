/**
 * VÉRIFICATION LECTURE SEULE DES IMAGES CLOUDINARY
 * 
 * Ce script vérifie uniquement l'accessibilité des 2 nouvelles images
 * sans aucune modification de MongoDB ou Cloudinary
 */

import https from 'https';

// ═══════════════════════════════════════════════════════════════════════════════
// Les 2 nouvelles images validées
// ═══════════════════════════════════════════════════════════════════════════════

const VALIDATED_IMAGES = [
  {
    plat: 'Pâtes BIZZ\'Art',
    url: 'https://res.cloudinary.com/gmpztbom/image/upload/v1787060811/bizzart/menu/IMG_9720_jytrma.jpg',
  },
  {
    plat: 'Pizza Margherita',
    url: 'https://res.cloudinary.com/gmpztbom/image/upload/v1787060767/bizzart/menu/r07qxo_-_R_Download_9_bp8oao.jpg',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Fonction de vérification HTTP HEAD (lecture seule)
// ═══════════════════════════════════════════════════════════════════════════════

function checkImageAccessibility(url: string): Promise<{ accessible: boolean; status?: number; error?: string }> {
  return new Promise((resolve) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD', // Méthode HEAD = lecture seule, ne télécharge pas l'image
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      resolve({
        accessible: res.statusCode === 200,
        status: res.statusCode,
      });
    });

    req.on('error', (error) => {
      resolve({
        accessible: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        accessible: false,
        error: 'Timeout',
      });
    });

    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exécution
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyCloudinaryImages() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('VÉRIFICATION CLOUDINARY (LECTURE SEULE)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('🔒 MODE : STRICTEMENT LECTURE SEULE');
  console.log('   - Aucune modification MongoDB');
  console.log('   - Aucune modification Cloudinary');
  console.log('   - Vérification HTTP HEAD uniquement');
  console.log('');

  let allAccessible = true;

  for (const image of VALIDATED_IMAGES) {
    console.log(`🔍 Vérification : ${image.plat}`);
    console.log(`   URL: ${image.url.substring(0, 70)}...`);

    const result = await checkImageAccessibility(image.url);

    if (result.accessible) {
      console.log(`   ✅ ACCESSIBLE (HTTP ${result.status})`);
    } else {
      console.log(`   ❌ INACCESSIBLE`);
      if (result.status) {
        console.log(`      Status: HTTP ${result.status}`);
      }
      if (result.error) {
        console.log(`      Erreur: ${result.error}`);
      }
      allAccessible = false;
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('RÉSULTAT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  if (allAccessible) {
    console.log('✅ TOUTES LES IMAGES SONT ACCESSIBLES');
    console.log('');
    console.log('Les 2 nouvelles photos Cloudinary sont valides et prêtes');
    console.log('pour la migration.');
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ CERTAINES IMAGES SONT INACCESSIBLES');
    console.log('');
    console.log('⚠️ BLOCKER : Corrigez les URLs avant de migrer');
    console.log('');
    process.exit(1);
  }
}

verifyCloudinaryImages();
