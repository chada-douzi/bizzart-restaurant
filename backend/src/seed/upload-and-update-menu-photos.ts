import mongoose from 'mongoose';
import { config } from 'dotenv';
import { MenuItem } from '../models/menu-item.model';
import * as fs from 'fs';
import * as path from 'path';
import { uploadToCloudinary } from '../services/upload.service';

config({ path: path.join(__dirname, '../../.env') });

interface ManifestItem {
  menuItemId: string;
  name: string;
  category: string;
  slug: string;
  expectedFile: string;
  currentImage: string | null;
  description: string;
  price: number;
}

interface UploadResult {
  menuItemId: string;
  name: string;
  expectedFile: string;
  status: 'SUCCESS' | 'MISSING' | 'INVALID' | 'UPLOAD_FAILED' | 'UPDATE_FAILED';
  cloudinaryUrl?: string;
  error?: string;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 1024; // 1KB

function validateImageFile(filePath: string): { valid: boolean; error?: string } {
  // Vérifier existence
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'Fichier introuvable' };
  }

  // Vérifier extension
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Extension invalide. Attendu: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }

  // Vérifier taille
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return { valid: false, error: 'Fichier vide' };
  }
  if (stats.size < MIN_FILE_SIZE) {
    return { valid: false, error: `Fichier trop petit (< ${MIN_FILE_SIZE} bytes)` };
  }
  if (stats.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Fichier trop grand (> ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
  }

  return { valid: true };
}

async function uploadAndUpdateMenuPhotos() {
  console.log('🚀 UPLOAD ET MISE À JOUR DES PHOTOS MENU — BIZZ\'ART\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Chemins
  const menuImagesDir = path.join(__dirname, '../../../menu-images');
  const manifestPath = path.join(menuImagesDir, 'menu-images-manifest.json');

  // Vérifications préliminaires
  if (!fs.existsSync(menuImagesDir)) {
    console.error('❌ Dossier menu-images/ introuvable');
    console.error('   Exécutez d\'abord generate-menu-manifest.ts\n');
    process.exit(1);
  }

  if (!fs.existsSync(manifestPath)) {
    console.error('❌ Manifest introuvable');
    console.error('   Exécutez d\'abord generate-menu-manifest.ts\n');
    process.exit(1);
  }

  // Charger le manifest
  const manifest: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`✅ Manifest chargé : ${manifest.length} plats\n`);

  // Connexion MongoDB
  console.log('🔗 Connexion à MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('✅ Connecté à MongoDB\n');

  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('🔍 PHASE 1 — VALIDATION DES FICHIERS\n');

  const results: UploadResult[] = [];
  let validCount = 0;
  let missingCount = 0;
  let invalidCount = 0;

  for (const item of manifest) {
    const filePath = path.join(menuImagesDir, item.expectedFile);
    
    // Chercher aussi avec d'autres extensions
    let actualFilePath = filePath;
    if (!fs.existsSync(filePath)) {
      // Essayer d'autres extensions
      const baseName = path.basename(item.expectedFile, path.extname(item.expectedFile));
      let found = false;
      for (const ext of ALLOWED_EXTENSIONS) {
        const altPath = path.join(menuImagesDir, baseName + ext);
        if (fs.existsSync(altPath)) {
          actualFilePath = altPath;
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`❌ MANQUANT : ${item.expectedFile} → ${item.name}`);
        results.push({
          menuItemId: item.menuItemId,
          name: item.name,
          expectedFile: item.expectedFile,
          status: 'MISSING',
          error: 'Fichier non trouvé'
        });
        missingCount++;
        continue;
      }
    }

    // Valider le fichier
    const validation = validateImageFile(actualFilePath);
    if (!validation.valid) {
      console.log(`⚠️  INVALIDE : ${item.expectedFile} → ${validation.error}`);
      results.push({
        menuItemId: item.menuItemId,
        name: item.name,
        expectedFile: item.expectedFile,
        status: 'INVALID',
        error: validation.error
      });
      invalidCount++;
      continue;
    }

    console.log(`✅ VALIDE   : ${item.expectedFile} → ${item.name}`);
    validCount++;
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');
  console.log('📊 RÉSULTAT VALIDATION\n');
  console.log(`   Total plats           : ${manifest.length}`);
  console.log(`   ✅ Fichiers valides    : ${validCount}`);
  console.log(`   ❌ Fichiers manquants  : ${missingCount}`);
  console.log(`   ⚠️  Fichiers invalides : ${invalidCount}`);
  console.log('');

  if (validCount === 0) {
    console.log('❌ Aucune photo valide trouvée. Aucune mise à jour effectuée.\n');
    await mongoose.connection.close();
    process.exit(0);
  }

  console.log('════════════════════════════════════════════════════════════════\n');
  console.log(`🚀 PHASE 2 — UPLOAD CLOUDINARY (${validCount} photo(s))\n`);

  let uploadedCount = 0;
  let uploadFailedCount = 0;

  for (const item of manifest) {
    // Skipper les fichiers manquants ou invalides
    const existingResult = results.find(r => r.menuItemId === item.menuItemId);
    if (existingResult && (existingResult.status === 'MISSING' || existingResult.status === 'INVALID')) {
      continue;
    }

    const filePath = path.join(menuImagesDir, item.expectedFile);
    let actualFilePath = filePath;
    
    // Trouver le fichier avec l'extension correcte
    if (!fs.existsSync(filePath)) {
      const baseName = path.basename(item.expectedFile, path.extname(item.expectedFile));
      for (const ext of ALLOWED_EXTENSIONS) {
        const altPath = path.join(menuImagesDir, baseName + ext);
        if (fs.existsSync(altPath)) {
          actualFilePath = altPath;
          break;
        }
      }
    }

    try {
      console.log(`   📤 Upload : ${item.expectedFile}...`);
      
      // Read file as buffer
      const fileBuffer = fs.readFileSync(actualFilePath);
      const cloudinaryResult = await uploadToCloudinary(fileBuffer, 'bizzart/menu');
      
      console.log(`   ✅ Succès : ${cloudinaryResult.url}`);
      
      results.push({
        menuItemId: item.menuItemId,
        name: item.name,
        expectedFile: item.expectedFile,
        status: 'SUCCESS',
        cloudinaryUrl: cloudinaryResult.url
      });
      
      uploadedCount++;
      
    } catch (error: any) {
      console.log(`   ❌ Échec  : ${error.message}`);
      
      results.push({
        menuItemId: item.menuItemId,
        name: item.name,
        expectedFile: item.expectedFile,
        status: 'UPLOAD_FAILED',
        error: error.message
      });
      
      uploadFailedCount++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');
  console.log('📊 RÉSULTAT UPLOAD CLOUDINARY\n');
  console.log(`   ✅ Uploads réussis : ${uploadedCount}`);
  console.log(`   ❌ Uploads échoués : ${uploadFailedCount}`);
  console.log('');

  if (uploadedCount === 0) {
    console.log('❌ Aucun upload réussi. Aucune mise à jour MongoDB effectuée.\n');
    await mongoose.connection.close();
    process.exit(0);
  }

  console.log('════════════════════════════════════════════════════════════════\n');
  console.log(`💾 PHASE 3 — MISE À JOUR MONGODB (${uploadedCount} plat(s))\n`);

  let updatedCount = 0;
  let updateFailedCount = 0;

  for (const result of results) {
    if (result.status !== 'SUCCESS' || !result.cloudinaryUrl) {
      continue;
    }

    try {
      // Vérifier que le plat existe
      const menuItem = await MenuItem.findById(result.menuItemId);
      
      if (!menuItem) {
        console.log(`   ⚠️  Plat introuvable : ${result.name}`);
        result.status = 'UPDATE_FAILED';
        result.error = 'Plat introuvable dans MongoDB';
        updateFailedCount++;
        continue;
      }

      // Mettre à jour uniquement le champ image
      menuItem.image = result.cloudinaryUrl;
      await menuItem.save();

      console.log(`   ✅ MàJ : ${result.name}`);
      updatedCount++;

    } catch (error: any) {
      console.log(`   ❌ Échec : ${result.name} → ${error.message}`);
      result.status = 'UPDATE_FAILED';
      result.error = error.message;
      updateFailedCount++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');
  console.log('📊 RÉSULTAT MISE À JOUR MONGODB\n');
  console.log(`   ✅ Plats mis à jour : ${updatedCount}`);
  console.log(`   ❌ Mises à jour échouées : ${updateFailedCount}`);
  console.log('');

  // Sauvegarder le rapport complet
  const reportPath = path.join(menuImagesDir, 'upload-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`✅ Rapport sauvegardé : ${reportPath}\n`);

  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📋 RAPPORT FINAL — PHOTOS MENU BIZZ\'ART\n');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log(`   Total plats                : ${manifest.length}`);
  console.log(`   ✅ Photos appliquées        : ${updatedCount}`);
  console.log(`   ❌ Photos manquantes        : ${missingCount}`);
  console.log(`   ⚠️  Photos invalides        : ${invalidCount}`);
  console.log(`   ❌ Uploads échoués          : ${uploadFailedCount}`);
  console.log(`   ❌ Mises à jour échouées    : ${updateFailedCount}`);
  console.log('');
  console.log('════════════════════════════════════════════════════════════════\n');

  if (updatedCount === manifest.length) {
    console.log('🎉 SUCCÈS TOTAL — Toutes les photos ont été appliquées !\n');
  } else if (updatedCount > 0) {
    console.log('⚠️  SUCCÈS PARTIEL — Certaines photos manquent ou ont échoué.\n');
  } else {
    console.log('❌ AUCUNE PHOTO APPLIQUÉE\n');
  }

  console.log('Prochaine étape :');
  console.log('1. Vérifier le rapport : upload-report.json');
  console.log('2. Tester l\'API : GET /api/menu/items');
  console.log('3. Vérifier le frontend : http://localhost:4200/menu\n');

  await mongoose.connection.close();
  console.log('✅ Déconnecté de MongoDB\n');
}

uploadAndUpdateMenuPhotos().catch(error => {
  console.error('❌ ERREUR FATALE:', error);
  process.exit(1);
});
