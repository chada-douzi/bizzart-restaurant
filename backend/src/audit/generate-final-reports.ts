/**
 * GÉNÉRATION DES RAPPORTS FINAUX D'AUDIT VISUEL BIZZ'ART
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Ce script :
 * 1. Lit le JSON de validation exporté depuis l'interface HTML
 * 2. Lit les données MongoDB (lecture seule)
 * 3. Génère les rapports finaux
 * 
 * NE MODIFIE PAS :
 * - MongoDB
 * - Cloudinary
 * - Les MenuItems
 * - Les Media
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Models
const MenuItemSchema = new mongoose.Schema({
  nameFr: String,
  nameAr: String,
  nameEn: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory' },
  image: String,
  price: Number,
  description: String,
  isAvailable: Boolean,
});

const MenuCategorySchema = new mongoose.Schema({
  nameFr: String,
  nameAr: String,
  nameEn: String,
  order: Number,
});

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
const MenuCategory = mongoose.model('MenuCategory', MenuCategorySchema);

interface ValidationData {
  [photoId: string]: {
    photoType: string;
    origin: string;
    matchingPlats: string[];
    validated: boolean;
    validatedAt: string;
    comment?: string;
  };
}

interface PhotoInfo {
  photoId: string;
  url: string;
  filename: string;
  origin: string;
  dishType: string;
  matchedMenuItems: string[];
  currentMenuItems: string[];
  comment: string;
  validated: boolean;
}

interface PlatClassification {
  menuItemId: string;
  nameFr: string;
  category: string;
  currentImage: string;
  classification: 'PHOTO_REELLE_BIZZART_CORRECTE' | 'PHOTO_REELLE_BIZZART_MAUVAIS_PLAT' | 'PHOTO_STOCK_GENERIQUE' | 'PHOTO_INCERTAINE' | 'PHOTO_MANQUANTE';
  reason: string;
  needsNewPhoto: boolean;
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart';
  await mongoose.connect(mongoUri);
  console.log('✅ Connecté à MongoDB (LECTURE SEULE)');
}

async function loadValidationData(): Promise<ValidationData> {
  const validationPath = path.join(__dirname, '../../validation-exports');
  const files = fs.readdirSync(validationPath).filter(f => f.endsWith('.json') && f !== '.gitkeep');
  
  if (files.length === 0) {
    throw new Error('❌ Aucun fichier de validation trouvé dans validation-exports/');
  }
  
  // Prendre le fichier le plus récent
  const latestFile = files.sort().reverse()[0];
  const filepath = path.join(validationPath, latestFile);
  
  console.log(`📖 Lecture du fichier de validation : ${latestFile}`);
  
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

async function loadAuditData() {
  const auditPath = path.join(__dirname, '../../AUDIT-VISUEL-98-PLATS.json');
  const content = fs.readFileSync(auditPath, 'utf-8');
  return JSON.parse(content);
}

function findPhotoIdForPlat(platId: string, auditData: any): string | null {
  const plat = auditData.menuItems.find((p: any) => p._id === platId);
  if (!plat) return null;
  
  const photoGroups: { [url: string]: any[] } = {};
  auditData.menuItems.forEach((item: any) => {
    if (!photoGroups[item.image]) photoGroups[item.image] = [];
    photoGroups[item.image].push(item);
  });
  
  let photoIndex = 1;
  for (const [url, plats] of Object.entries(photoGroups)) {
    if (plats.find((p: any) => p._id === platId)) {
      return `photo_${photoIndex}`;
    }
    photoIndex++;
  }
  
  return null;
}

function classifyPlat(plat: any, photoId: string | null, validation: any, auditData: any): PlatClassification {
  const classification: PlatClassification = {
    menuItemId: plat._id,
    nameFr: plat.nameFr,
    category: plat.categoryName,
    currentImage: plat.image,
    classification: 'PHOTO_MANQUANTE',
    reason: '',
    needsNewPhoto: true,
  };
  
  if (!photoId || !validation || !validation.validated) {
    classification.classification = 'PHOTO_MANQUANTE';
    classification.reason = 'Photo non validée';
    classification.needsNewPhoto = true;
    return classification;
  }
  
  const origin = validation.origin;
  const matchingPlats = validation.matchingPlats || [];
  const isMatching = matchingPlats.includes(plat._id);
  
  // VRAIE_PHOTO_BIZZART
  if (origin === 'Vraie photo Bizz\'Art' || origin === 'VRAIE_PHOTO_BIZZART') {
    if (isMatching) {
      classification.classification = 'PHOTO_REELLE_BIZZART_CORRECTE';
      classification.reason = 'Photo réelle Bizz\'Art correspondant au plat';
      classification.needsNewPhoto = false;
    } else {
      classification.classification = 'PHOTO_REELLE_BIZZART_MAUVAIS_PLAT';
      classification.reason = 'Photo réelle Bizz\'Art mais correspond à un autre plat';
      classification.needsNewPhoto = true;
    }
  }
  // STOCK_GENERIQUE
  else if (origin === 'Stock/générique' || origin === 'STOCK_GENERIQUE') {
    classification.classification = 'PHOTO_STOCK_GENERIQUE';
    classification.reason = 'Photo générique ou stock';
    classification.needsNewPhoto = true;
  }
  // INCERTAINE
  else if (origin === 'Inconnue' || origin === 'INCERTAINE' || origin === 'Probablement Bizz\'Art') {
    classification.classification = 'PHOTO_INCERTAINE';
    classification.reason = 'Origine de la photo incertaine';
    classification.needsNewPhoto = true;
  }
  // Fallback
  else {
    classification.classification = 'PHOTO_MANQUANTE';
    classification.reason = 'Photo non classifiée';
    classification.needsNewPhoto = true;
  }
  
  return classification;
}

async function generateFinalReports() {
  try {
    console.log('\n🔍 === GÉNÉRATION DES RAPPORTS FINAUX D\'AUDIT BIZZ\'ART ===\n');
    
    await connectDatabase();
    
    const validationData = await loadValidationData();
    const auditData = await loadAuditData();
    
    console.log(`✅ Données chargées:`);
    console.log(`   - ${Object.keys(validationData).length} photos validées`);
    console.log(`   - ${auditData.menuItems.length} plats`);
    console.log(`   - ${auditData.totalUniquePhotos} photos uniques\n`);
    
    // Vérifier que toutes les photos sont validées
    const totalValidated = Object.values(validationData).filter((v: any) => v.validated).length;
    
    if (totalValidated < 35) {
      console.warn(`⚠️  ATTENTION : Seulement ${totalValidated}/35 photos validées`);
      console.warn(`⚠️  Il est recommandé de valider toutes les photos avant de générer les rapports finaux.\n`);
    }
    
    // 1. RAPPORT PHOTOS
    console.log('📸 Génération du rapport photos...');
    
    const photoGroups: { [url: string]: any[] } = {};
    auditData.menuItems.forEach((item: any) => {
      if (!photoGroups[item.image]) photoGroups[item.image] = [];
      photoGroups[item.image].push(item);
    });

    const photosReport: PhotoInfo[] = [];
    let photoIndex = 1;
    
    for (const [url, plats] of Object.entries(photoGroups)) {
      const photoId = `photo_${photoIndex}`;
      const validation = validationData[photoId] || {};
      
      photosReport.push({
        photoId,
        url,
        filename: url.split('/').pop() || '',
        origin: validation.origin || 'NON_VALIDEE',
        dishType: validation.photoType || 'NON_VALIDEE',
        matchedMenuItems: validation.matchingPlats || [],
        currentMenuItems: plats.map((p: any) => p._id),
        comment: validation.comment || '',
        validated: validation.validated || false,
      });
      
      photoIndex++;
    }
    
    // 2. CLASSIFICATION DES PLATS
    console.log('🍽️  Génération de la classification des plats...');
    
    const platsClassification: PlatClassification[] = [];
    
    for (const plat of auditData.menuItems) {
      const photoId = findPhotoIdForPlat(plat._id, auditData);
      const validation = photoId ? validationData[photoId] : null;
      const classification = classifyPlat(plat, photoId, validation, auditData);
      platsClassification.push(classification);
    }
    
    // 3. INVENTAIRE DES PHOTOS MANQUANTES
    console.log('📋 Génération de l\'inventaire des photos manquantes...');
    
    const photosManquantes = platsClassification.filter(p => p.needsNewPhoto);
    
    // 4. ANALYSE DES DOUBLONS
    console.log('🔁 Analyse des doublons...');
    
    const doublonsReport = Object.entries(photoGroups)
      .filter(([url, plats]) => plats.length > 1)
      .map(([url, plats]) => {
        const photoIndex = Object.keys(photoGroups).indexOf(url) + 1;
        const photoId = `photo_${photoIndex}`;
        const validation = validationData[photoId] || {};
        
        const platIds = plats.map((p: any) => p._id);
        const matchedIds = validation.matchingPlats || [];
        const incorrectAssignments = platIds.filter((id: string) => !matchedIds.includes(id));
        
        let criticality = 'LOW';
        if (plats.length > 5) criticality = 'HIGH';
        else if (plats.length > 3) criticality = 'MEDIUM';
        
        const categories = [...new Set(plats.map((p: any) => p.categoryName))];
        if (categories.length > 2) criticality = 'HIGH';
        
        return {
          photoId,
          url,
          usageCount: plats.length,
          currentAssignments: plats.map((p: any) => ({ id: p._id, name: p.nameFr, category: p.categoryName })),
          validatedMatches: matchedIds,
          incorrectAssignments,
          criticality,
          validated: validation.validated || false,
        };
      });
    
    // 5. STATISTIQUES GLOBALES
    console.log('📊 Calcul des statistiques...');
    
    const stats = {
      totalPlats: auditData.menuItems.length,
      totalPhotosUniques: auditData.totalUniquePhotos,
      photosValidees: totalValidated,
      
      photosVraiesBizzart: photosReport.filter(p => p.origin === 'Vraie photo Bizz\'Art' || p.origin === 'VRAIE_PHOTO_BIZZART').length,
      photosStock: photosReport.filter(p => p.origin === 'Stock/générique' || p.origin === 'STOCK_GENERIQUE').length,
      photosIncertaines: photosReport.filter(p => p.origin === 'Inconnue' || p.origin === 'INCERTAINE' || p.origin === 'Probablement Bizz\'Art').length,
      photosNonValidees: photosReport.filter(p => !p.validated).length,
      
      platsPhotoCorrect: platsClassification.filter(p => p.classification === 'PHOTO_REELLE_BIZZART_CORRECTE').length,
      platsPhotoMauvaisPlat: platsClassification.filter(p => p.classification === 'PHOTO_REELLE_BIZZART_MAUVAIS_PLAT').length,
      platsPhotoStock: platsClassification.filter(p => p.classification === 'PHOTO_STOCK_GENERIQUE').length,
      platsPhotoIncertaine: platsClassification.filter(p => p.classification === 'PHOTO_INCERTAINE').length,
      platsPhotoManquante: platsClassification.filter(p => p.classification === 'PHOTO_MANQUANTE').length,
      
      platsNeedNewPhoto: photosManquantes.length,
      doublonsTotal: doublonsReport.length,
      doublonsCritiques: doublonsReport.filter(d => d.criticality === 'HIGH').length,
    };
    
    // 6. SAUVEGARDER LES RAPPORTS
    console.log('\n💾 Sauvegarde des rapports...\n');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(__dirname, '../..');
    
    // 6.1 AUDIT-VISUEL-FINAL-BIZZART.json
    const finalAuditPath = path.join(outputDir, `AUDIT-VISUEL-FINAL-BIZZART-${timestamp}.json`);
    fs.writeFileSync(finalAuditPath, JSON.stringify({
      version: 2,
      generatedAt: new Date().toISOString(),
      statistics: stats,
      photos: photosReport,
      platsClassification,
      doublons: doublonsReport,
    }, null, 2));
    console.log(`✅ ${path.basename(finalAuditPath)}`);
    
    // 6.2 INVENTAIRE-PHOTOS-MANQUANTES-BIZZART.csv
    const inventairePath = path.join(outputDir, `INVENTAIRE-PHOTOS-MANQUANTES-BIZZART-${timestamp}.csv`);
    let csv = 'MenuItemId,Nom,Catégorie,Photo Actuelle,Statut Photo,Raison,Action Recommandée\n';
    photosManquantes.forEach(plat => {
      csv += `"${plat.menuItemId}","${plat.nameFr}","${plat.category}","${plat.currentImage}","${plat.classification}","${plat.reason}","Photographier le plat"\n`;
    });
    fs.writeFileSync(inventairePath, csv);
    console.log(`✅ ${path.basename(inventairePath)}`);
    
    // 6.3 RAPPORT-DOUBLONS-BIZZART.json
    const doublonsPath = path.join(outputDir, `RAPPORT-DOUBLONS-BIZZART-${timestamp}.json`);
    fs.writeFileSync(doublonsPath, JSON.stringify(doublonsReport, null, 2));
    console.log(`✅ ${path.basename(doublonsPath)}`);
    
    // 6.4 RAPPORT-AUDIT-BIZZART.md
    const markdownPath = path.join(outputDir, `RAPPORT-AUDIT-BIZZART-${timestamp}.md`);
    let markdown = `# 🔍 RAPPORT D'AUDIT VISUEL BIZZ'ART

**Date:** ${new Date().toISOString().split('T')[0]}  
**Version:** 2.0  
**Mode:** Lecture seule (aucune modification de production)

---

## 📊 STATISTIQUES GLOBALES

| Métrique | Valeur |
|----------|--------|
| **Plats analysés** | ${stats.totalPlats} |
| **Photos uniques** | ${stats.totalPhotosUniques} |
| **Photos validées** | ${stats.photosValidees} / ${stats.totalPhotosUniques} |

---

## 📸 ANALYSE DES PHOTOS

| Catégorie | Nombre |
|-----------|--------|
| ✅ Vraies photos Bizz'Art | ${stats.photosVraiesBizzart} |
| 📦 Photos stock/génériques | ${stats.photosStock} |
| ❓ Photos incertaines | ${stats.photosIncertaines} |
| ⏳ Photos non validées | ${stats.photosNonValidees} |

---

## 🍽️  CLASSIFICATION DES PLATS

| Statut | Nombre | % |
|--------|--------|---|
| ✅ **Photo réelle Bizz'Art correcte** | ${stats.platsPhotoCorrect} | ${((stats.platsPhotoCorrect / stats.totalPlats) * 100).toFixed(1)}% |
| ⚠️  **Photo réelle mais mauvais plat** | ${stats.platsPhotoMauvaisPlat} | ${((stats.platsPhotoMauvaisPlat / stats.totalPlats) * 100).toFixed(1)}% |
| 📦 **Photo stock/générique** | ${stats.platsPhotoStock} | ${((stats.platsPhotoStock / stats.totalPlats) * 100).toFixed(1)}% |
| ❓ **Photo incertaine** | ${stats.platsPhotoIncertaine} | ${((stats.platsPhotoIncertaine / stats.totalPlats) * 100).toFixed(1)}% |
| ❌ **Photo manquante** | ${stats.platsPhotoManquante} | ${((stats.platsPhotoManquante / stats.totalPlats) * 100).toFixed(1)}% |

---

## 📋 INVENTAIRE DES NOUVELLES PHOTOS NÉCESSAIRES

**Total : ${stats.platsNeedNewPhoto} plats nécessitent une nouvelle photo**

Ces plats doivent être photographiés car ils n'ont pas de vraie photo Bizz'Art correctement associée.

**Détails dans :** \`INVENTAIRE-PHOTOS-MANQUANTES-BIZZART-${timestamp}.csv\`

---

## 🔁 ANALYSE DES DOUBLONS

| Métrique | Valeur |
|----------|--------|
| Photos utilisées plusieurs fois | ${stats.doublonsTotal} |
| Doublons critiques (haute priorité) | ${stats.doublonsCritiques} |

**Détails dans :** \`RAPPORT-DOUBLONS-BIZZART-${timestamp}.json\`

---

## ⚠️  ACTIONS RECOMMANDÉES

`;
    
    if (stats.platsNeedNewPhoto > 0) {
      markdown += `\n### 1. Photographier les plats sans vraie photo (${stats.platsNeedNewPhoto} plats)\n\n`;
      markdown += `Consultez le fichier CSV \`INVENTAIRE-PHOTOS-MANQUANTES-BIZZART-${timestamp}.csv\` pour la liste complète.\n\n`;
    }
    
    if (stats.doublonsCritiques > 0) {
      markdown += `\n### 2. Résoudre les doublons critiques (${stats.doublonsCritiques} photos)\n\n`;
      markdown += `Certaines photos sont utilisées par trop de plats incompatibles. Vérifiez le fichier \`RAPPORT-DOUBLONS-BIZZART-${timestamp}.json\`.\n\n`;
    }
    
    if (stats.photosNonValidees > 0) {
      markdown += `\n### 3. Terminer la validation (${stats.photosNonValidees} photos restantes)\n\n`;
      markdown += `Complétez la validation des photos restantes dans l'interface HTML.\n\n`;
    }
    
    markdown += `\n---\n\n## ✅ VALIDATION FINALE\n\n`;
    markdown += `**IMPORTANT :** Ce rapport est basé sur une analyse en lecture seule.\n\n`;
    markdown += `**AUCUNE MODIFICATION N'A ÉTÉ APPORTÉE À :**\n`;
    markdown += `- MongoDB\n`;
    markdown += `- Cloudinary\n`;
    markdown += `- Les MenuItems\n`;
    markdown += `- Les Media\n\n`;
    markdown += `**PROCHAINE ÉTAPE :**\n\n`;
    markdown += `Une fois que vous aurez validé ce rapport et pris les nouvelles photos nécessaires,\n`;
    markdown += `une migration pourra être planifiée pour mettre à jour les associations photo ↔ plat.\n\n`;
    markdown += `**⚠️  NE PAS LANCER LA MIGRATION SANS VALIDATION EXPLICITE**\n`;
    
    fs.writeFileSync(markdownPath, markdown);
    console.log(`✅ ${path.basename(markdownPath)}`);
    
    // 7. AFFICHER LE RÉSUMÉ
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ DE L\'AUDIT');
    console.log('='.repeat(80));
    console.log(`\n98 plats analysés`);
    console.log(`35 photos uniques`);
    console.log(`${stats.photosValidees} photos validées\n`);
    console.log(`✅ Photos réelles Bizz'Art : ${stats.photosVraiesBizzart}`);
    console.log(`📦 Photos stock/génériques : ${stats.photosStock}`);
    console.log(`❓ Photos incertaines : ${stats.photosIncertaines}\n`);
    console.log(`✅ Plats avec photo correcte : ${stats.platsPhotoCorrect}`);
    console.log(`⚠️  Plats avec mauvaise photo : ${stats.platsPhotoMauvaisPlat}`);
    console.log(`❌ Plats sans vraie photo : ${stats.platsPhotoManquante}\n`);
    console.log(`📸 NOUVELLES PHOTOS NÉCESSAIRES : ${stats.platsNeedNewPhoto} plats\n`);
    console.log(`🔁 Doublons détectés : ${stats.doublonsTotal} (dont ${stats.doublonsCritiques} critiques)\n`);
    console.log('='.repeat(80));
    console.log('\n✅ VALIDATION VISUELLE TERMINÉE — AUCUNE MODIFICATION DE PRODUCTION EFFECTUÉE\n');
    console.log('⚠️  NE PAS MODIFIER LA BASE DE DONNÉES');
    console.log('⚠️  NE PAS MODIFIER CLOUDINARY');
    console.log('⚠️  NE PAS LANCER LA MIGRATION\n');
    console.log('📁 Les rapports ont été sauvegardés dans le dossier backend/\n');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des rapports:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Déconnecté de MongoDB');
  }
}

// Exécution
generateFinalReports()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
