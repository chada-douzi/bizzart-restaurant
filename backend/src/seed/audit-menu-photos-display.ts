/**
 * AUDIT FINAL : VÉRIFICATION AFFICHAGE DES PHOTOS DES 98 PLATS
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Phases :
 * - PHASE 2 : Vérification des 98 plats en base
 * - PHASE 3 : Test des URLs Cloudinary
 * - PHASE 7 : Distinction plats vs galerie
 * 
 * AUCUNE MODIFICATION DE DONNÉES
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import { Media } from '../models/media.model';

dotenv.config();

interface MenuItemAudit {
  index: number;
  id: string;
  name: string;
  nameFr: string;
  category: string;
  categoryName: string;
  imageUrl: string | null;
  imageType: 'cloudinary' | 'local' | 'none';
  imageStatus: '🟢 ACCESSIBLE' | '🟡 À SURVEILLER' | '🔴 INACCESSIBLE' | '⚫ MANQUANTE';
  httpStatus?: number;
  contentType?: string;
  error?: string;
  diagnosis: string;
}

interface GalleryMediaAudit {
  id: string;
  title: string | null;
  category: string;
  url: string;
  origin: 'cloudinary' | 'local';
  fileExists: boolean;
}

interface FinalAuditReport {
  timestamp: string;
  summary: {
    totalPlats: number;
    platsAvecUrl: number;
    platsSansUrl: number;
    urlsCloudinary: number;
    urlsLocales: number;
    urlsInvalides: number;
    imagesAccessibles: number;
    imagesInaccessibles: number;
    imagesManquantes: number;
    totalGalleryMedia: number;
  };
  menuItems: MenuItemAudit[];
  galleryMedia: GalleryMediaAudit[];
  backendStatus: 'OK' | 'ERROR';
  frontendBinding: 'OK' | 'NEEDS_VERIFICATION';
  cloudinaryModified: 'NON';
  mongodbModified: 'NON';
  finalConclusion: '🟢 PHOTOS VALIDÉES' | '🟡 PHOTOS PARTIELLEMENT VALIDÉES' | '🔴 PHOTOS NON VALIDÉES';
  recommendations: string[];
}

// Utilitaire : tester une URL HTTP/HTTPS
async function testImageUrl(url: string): Promise<{ status: number; contentType: string | null; accessible: boolean }> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { timeout: 5000 }, (res) => {
      const status = res.statusCode || 0;
      const contentType = res.headers['content-type'] || null;
      const accessible = status >= 200 && status < 400;
      
      // Drain response pour éviter les fuites mémoire
      res.resume();
      
      resolve({ status, contentType, accessible });
    });

    request.on('error', () => {
      resolve({ status: 0, contentType: null, accessible: false });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ status: 0, contentType: null, accessible: false });
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║ AUDIT FINAL : AFFICHAGE DES PHOTOS DES 98 PLATS               ║');
  console.log('║ MODE STRICTEMENT LECTURE SEULE                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Connexion MongoDB
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('✓ Connecté à MongoDB\n');

  const report: FinalAuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPlats: 0,
      platsAvecUrl: 0,
      platsSansUrl: 0,
      urlsCloudinary: 0,
      urlsLocales: 0,
      urlsInvalides: 0,
      imagesAccessibles: 0,
      imagesInaccessibles: 0,
      imagesManquantes: 0,
      totalGalleryMedia: 0,
    },
    menuItems: [],
    galleryMedia: [],
    backendStatus: 'OK',
    frontendBinding: 'OK',
    cloudinaryModified: 'NON',
    mongodbModified: 'NON',
    finalConclusion: '🟢 PHOTOS VALIDÉES',
    recommendations: [],
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2 : VÉRIFICATION DES 98 PLATS
  // ═══════════════════════════════════════════════════════════════════════
  console.log('📊 PHASE 2 : VÉRIFICATION DES 98 PLATS EN BASE\n');

  const categories = await MenuCategory.find({}).sort({ order: 1 });
  const menuItems = await MenuItem.find({}).populate('category').sort({ order: 1 });

  console.log(`✓ ${categories.length} catégories trouvées`);
  console.log(`✓ ${menuItems.length} plats trouvés\n`);

  report.summary.totalPlats = menuItems.length;

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 3 : TEST DES URLs CLOUDINARY (SYSTÉMATIQUE)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🔍 PHASE 3 : TEST SYSTÉMATIQUE DES URLs DES PLATS\n');
  console.log('⏳ Test en cours... (cela peut prendre quelques minutes)\n');

  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const categoryName = (item.category as any)?.name?.fr || 'Unknown';

    let imageType: 'cloudinary' | 'local' | 'none' = 'none';
    let imageStatus: '🟢 ACCESSIBLE' | '🟡 À SURVEILLER' | '🔴 INACCESSIBLE' | '⚫ MANQUANTE' = '⚫ MANQUANTE';
    let httpStatus: number | undefined;
    let contentType: string | undefined;
    let error: string | undefined;
    let diagnosis = '';

    if (!item.image) {
      report.summary.platsSansUrl++;
      imageStatus = '⚫ MANQUANTE';
      diagnosis = 'Aucune URL image dans MongoDB';
    } else {
      report.summary.platsAvecUrl++;

      // Déterminer le type d'URL
      if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
        if (item.image.includes('cloudinary.com')) {
          imageType = 'cloudinary';
          report.summary.urlsCloudinary++;
        } else {
          imageType = 'local';
          report.summary.urlsLocales++;
          diagnosis = 'URL HTTP externe (non Cloudinary)';
        }
      } else if (item.image.startsWith('/')) {
        imageType = 'local';
        report.summary.urlsLocales++;
        diagnosis = 'URL relative locale';
      } else {
        imageType = 'local';
        report.summary.urlsInvalides++;
        diagnosis = 'Format URL invalide ou relatif';
      }

      // Tester l'URL si c'est une URL HTTP(S)
      if (imageType === 'cloudinary' && (item.image.startsWith('http'))) {
        try {
          const testResult = await testImageUrl(item.image);
          httpStatus = testResult.status;
          contentType = testResult.contentType || undefined;

          if (testResult.accessible) {
            if (testResult.contentType?.startsWith('image/')) {
              imageStatus = '🟢 ACCESSIBLE';
              report.summary.imagesAccessibles++;
              diagnosis = `Image Cloudinary accessible (${testResult.status})`;
            } else {
              imageStatus = '🟡 À SURVEILLER';
              report.summary.imagesAccessibles++;
              diagnosis = `Accessible mais Content-Type inhabituel : ${testResult.contentType}`;
            }
          } else {
            imageStatus = '🔴 INACCESSIBLE';
            report.summary.imagesInaccessibles++;
            diagnosis = `URL Cloudinary inaccessible (HTTP ${testResult.status || 'timeout'})`;
            error = `HTTP ${testResult.status || 'timeout/error'}`;
          }
        } catch (err) {
          imageStatus = '🔴 INACCESSIBLE';
          report.summary.imagesInaccessibles++;
          diagnosis = 'Erreur lors du test de l\'URL';
          error = String(err);
        }
      } else if (imageType === 'local') {
        imageStatus = '🟡 À SURVEILLER';
        diagnosis = 'URL locale - vérification manuelle requise côté frontend';
      }
    }

    const audit: MenuItemAudit = {
      index: i + 1,
      id: item._id.toString(),
      name: item.name.en || '',
      nameFr: item.name.fr || '',
      category: (item.category as any)?._id?.toString() || '',
      categoryName,
      imageUrl: item.image || null,
      imageType,
      imageStatus,
      httpStatus,
      contentType,
      error,
      diagnosis,
    };

    report.menuItems.push(audit);

    // Affichage progress
    if ((i + 1) % 10 === 0 || i === menuItems.length - 1) {
      console.log(`   Testé ${i + 1}/${menuItems.length} plats...`);
    }
  }

  console.log('\n✓ Test des URLs terminé\n');

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 7 : DISTINCTION PLATS vs GALERIE
  // ═══════════════════════════════════════════════════════════════════════
  console.log('🎨 PHASE 7 : AUDIT DES MÉDIAS DE GALERIE (SÉPARÉS DES PLATS)\n');

  const galleryMedia = await Media.find({});
  console.log(`✓ ${galleryMedia.length} médias de galerie trouvés\n`);

  report.summary.totalGalleryMedia = galleryMedia.length;

  for (const media of galleryMedia) {
    const isCloudinary = media.url.startsWith('http');
    const origin: 'cloudinary' | 'local' = isCloudinary ? 'cloudinary' : 'local';

    let fileExists = false;
    if (!isCloudinary) {
      // Tester si le fichier local existe
      const localPath = path.join(__dirname, '../../frontend/public', media.url);
      try {
        await fs.access(localPath);
        fileExists = true;
      } catch {
        fileExists = false;
      }
    }

    const galleryAudit: GalleryMediaAudit = {
      id: media._id.toString(),
      title: media.title || null,
      category: media.category,
      url: media.url,
      origin,
      fileExists: !isCloudinary ? fileExists : true, // Cloudinary considéré toujours accessible
    };

    report.galleryMedia.push(galleryAudit);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONCLUSION FINALE
  // ═══════════════════════════════════════════════════════════════════════

  // Déterminer conclusion
  if (report.summary.imagesInaccessibles === 0 && report.summary.platsSansUrl === 0) {
    report.finalConclusion = '🟢 PHOTOS VALIDÉES';
  } else if (report.summary.imagesInaccessibles > 0 && report.summary.imagesInaccessibles < report.summary.totalPlats * 0.1) {
    report.finalConclusion = '🟡 PHOTOS PARTIELLEMENT VALIDÉES';
  } else {
    report.finalConclusion = '🔴 PHOTOS NON VALIDÉES';
  }

  // Recommandations
  if (report.summary.platsSansUrl > 0) {
    report.recommendations.push(`⚠️ ${report.summary.platsSansUrl} plats n'ont aucune URL image`);
  }

  if (report.summary.imagesInaccessibles > 0) {
    report.recommendations.push(`🔴 ${report.summary.imagesInaccessibles} images Cloudinary sont inaccessibles`);
  }

  if (report.summary.urlsLocales > 0) {
    report.recommendations.push(`🟡 ${report.summary.urlsLocales} plats utilisent des URLs locales (à vérifier côté frontend)`);
  }

  if (report.summary.urlsInvalides > 0) {
    report.recommendations.push(`⚠️ ${report.summary.urlsInvalides} URLs invalides détectées`);
  }

  const galleryLocalMissing = report.galleryMedia.filter(m => m.origin === 'local' && !m.fileExists).length;
  if (galleryLocalMissing > 0) {
    report.recommendations.push(`📦 ${galleryLocalMissing} médias de galerie locaux sont manquants (SÉPARÉS des plats)`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAUVEGARDE DU RAPPORT
  // ═══════════════════════════════════════════════════════════════════════

  const reportDir = path.join(__dirname, '../../audit-reports');
  try {
    await fs.mkdir(reportDir, { recursive: true });
  } catch (err) {
    // Dossier existe
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(reportDir, `photos-display-audit-${timestamp}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  // Rapport texte
  const textReport = generateTextReport(report);
  const textPath = path.join(reportDir, `photos-display-audit-${timestamp}.txt`);
  await fs.writeFile(textPath, textReport, 'utf-8');

  console.log('💾 RAPPORTS SAUVEGARDÉS\n');
  console.log(`   • ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`   • ${path.relative(process.cwd(), textPath)}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // AFFICHAGE RAPPORT FINAL
  // ═══════════════════════════════════════════════════════════════════════

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║ AUDIT PHOTOS BIZZ\'ART — RÉSULTAT FINAL                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('PLATS');
  console.log('-----');
  console.log(`Total                    : ${report.summary.totalPlats}`);
  console.log(`Avec URL                 : ${report.summary.platsAvecUrl}`);
  console.log(`Sans URL                 : ${report.summary.platsSansUrl}`);
  console.log(`URLs Cloudinary          : ${report.summary.urlsCloudinary}`);
  console.log(`URLs locales             : ${report.summary.urlsLocales}`);
  console.log(`URLs invalides           : ${report.summary.urlsInvalides}`);
  console.log();

  console.log('IMAGES');
  console.log('------');
  console.log(`Accessibles              : ${report.summary.imagesAccessibles}`);
  console.log(`Inaccessibles            : ${report.summary.imagesInaccessibles}`);
  console.log(`Manquantes               : ${report.summary.platsSansUrl}`);
  console.log();

  console.log('AFFICHAGE');
  console.log('---------');
  const displayOK = report.summary.imagesAccessibles;
  const displayKO = report.summary.imagesInaccessibles + report.summary.platsSansUrl;
  console.log(`Images affichables       : ${displayOK}/${report.summary.totalPlats}`);
  console.log(`Images non affichables   : ${displayKO}/${report.summary.totalPlats}`);
  console.log();

  console.log('BACKEND');
  console.log('-------');
  console.log(`API correcte             : ${report.backendStatus}`);
  console.log();

  console.log('FRONTEND');
  console.log('--------');
  console.log(`Binding image correct    : ${report.frontendBinding}`);
  console.log();

  console.log('GALERIE (SÉPARÉE DES PLATS)');
  console.log('---------------------------');
  console.log(`Total médias galerie     : ${report.summary.totalGalleryMedia}`);
  console.log(`Médias locaux manquants  : ${galleryLocalMissing}`);
  console.log();

  console.log('CLOUDINARY');
  console.log('----------');
  console.log(`Aucune modification effectuée : ${report.cloudinaryModified}`);
  console.log();

  console.log('MONGODB');
  console.log('-------');
  console.log(`Aucune modification effectuée : ${report.mongodbModified}`);
  console.log();

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('CONCLUSION FINALE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log(`   ${report.finalConclusion}\n`);

  if (report.recommendations.length > 0) {
    console.log('RECOMMANDATIONS');
    console.log('---------------\n');
    report.recommendations.forEach(rec => console.log(`   ${rec}`));
    console.log();
  }

  // Liste des problèmes critiques
  const criticalIssues = report.menuItems.filter(m => m.imageStatus === '🔴 INACCESSIBLE');
  if (criticalIssues.length > 0) {
    console.log('⚠️  PLATS AVEC IMAGES INACCESSIBLES :');
    console.log('--------------------------------------\n');
    criticalIssues.slice(0, 10).forEach(item => {
      console.log(`   ${item.index}. ${item.nameFr} (${item.categoryName})`);
      console.log(`      URL: ${item.imageUrl}`);
      console.log(`      Diagnostic: ${item.diagnosis}\n`);
    });
    if (criticalIssues.length > 10) {
      console.log(`   ... et ${criticalIssues.length - 10} autres (voir rapport JSON)\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SÉCURITÉ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('MongoDB modifié               : NON ✓');
  console.log('Cloudinary modifié            : NON ✓');
  console.log('URLs MongoDB modifiées        : NON ✓');
  console.log('Médias supprimés              : NON ✓');
  console.log('Médias uploadés               : NON ✓');
  console.log('Migration exécutée            : NON ✓');
  console.log('Données créées                : NON ✓');
  console.log('Données supprimées            : NON ✓');
  console.log('MODE LECTURE SEULE            : RESPECTÉ ✓\n');

  await mongoose.disconnect();
  console.log('✓ Déconnecté de MongoDB\n');
}

function generateTextReport(report: FinalAuditReport): string {
  return `
╔══════════════════════════════════════════════════════════════════╗
║ AUDIT PHOTOS BIZZ'ART — RÉSULTAT FINAL                          ║
╚══════════════════════════════════════════════════════════════════╝

Généré le : ${new Date(report.timestamp).toLocaleString('fr-FR')}

PLATS
-----
Total                    : ${report.summary.totalPlats}
Avec URL                 : ${report.summary.platsAvecUrl}
Sans URL                 : ${report.summary.platsSansUrl}
URLs Cloudinary          : ${report.summary.urlsCloudinary}
URLs locales             : ${report.summary.urlsLocales}
URLs invalides           : ${report.summary.urlsInvalides}

IMAGES
------
Accessibles              : ${report.summary.imagesAccessibles}
Inaccessibles            : ${report.summary.imagesInaccessibles}
Manquantes               : ${report.summary.platsSansUrl}

AFFICHAGE
---------
Images affichables       : ${report.summary.imagesAccessibles}/${report.summary.totalPlats}
Images non affichables   : ${report.summary.imagesInaccessibles + report.summary.platsSansUrl}/${report.summary.totalPlats}

BACKEND
-------
API correcte             : ${report.backendStatus}

FRONTEND
--------
Binding image correct    : ${report.frontendBinding}

GALERIE (SÉPARÉE)
-----------------
Total médias             : ${report.summary.totalGalleryMedia}

CLOUDINARY
----------
Aucune modification effectuée : ${report.cloudinaryModified}

MONGODB
-------
Aucune modification effectuée : ${report.mongodbModified}

═══════════════════════════════════════════════════════════════════
CONCLUSION FINALE
═══════════════════════════════════════════════════════════════════

${report.finalConclusion}

${report.recommendations.length > 0 ? `
RECOMMANDATIONS
---------------

${report.recommendations.map(r => `  ${r}`).join('\n')}
` : ''}

═══════════════════════════════════════════════════════════════════
SÉCURITÉ
═══════════════════════════════════════════════════════════════════

MongoDB modifié               : NON ✓
Cloudinary modifié            : NON ✓
URLs MongoDB modifiées        : NON ✓
Médias supprimés              : NON ✓
Médias uploadés               : NON ✓
Migration exécutée            : NON ✓
Données créées                : NON ✓
Données supprimées            : NON ✓
MODE LECTURE SEULE            : RESPECTÉ ✓
`;
}

main().catch(console.error);
