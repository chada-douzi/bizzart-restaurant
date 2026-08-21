/**
 * AUDIT COMPLET DU MENU BIZZ'ART
 * 
 * Inspection des données réelles MongoDB pour identifier :
 * - Toutes les catégories
 * - Tous les plats avec leurs détails
 * - Images actuelles et manquantes
 * - Doublons d'images
 * - Images incompatibles
 * 
 * MODE LECTURE SEULE - AUCUNE MODIFICATION
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Schémas simplifiés pour lecture
const MenuCategorySchema = new mongoose.Schema({
  name: Object,
  slug: String,
  description: Object,
  image: String,
  order: Number,
  isActive: Boolean,
}, { collection: 'menucategories' });

const MenuItemSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory' },
  name: Object,
  slug: String,
  description: Object,
  price: Number,
  image: String,
  video: String,
  allergens: [String],
  tags: [String],
  isAvailable: Boolean,
  isFeatured: Boolean,
  order: Number,
  nutritionInfo: Object,
  preparationTime: Number,
}, { collection: 'menuitems' });

const MenuCategory = mongoose.model('MenuCategory', MenuCategorySchema);
const MenuItem = mongoose.model('MenuItem', MenuItemSchema);

interface AuditEntry {
  category: string;
  dish: string;
  price: number;
  currentImage: string;
  imageStatus: 'OK' | 'MISSING' | 'PLACEHOLDER' | 'DUPLICATE' | 'INVALID';
  action: 'KEEP' | 'GENERATE_ILLUSTRATION' | 'REVIEW' | 'UPDATE';
  notes: string;
}

async function generateMenuAudit() {
  console.log('\n📋 AUDIT COMPLET DU MENU BIZZ\'ART\n');
  console.log('Mode : LECTURE SEULE - Aucune modification\n');

  try {
    // Connexion MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart');
    console.log('✅ Connecté à MongoDB\n');

    // Récupération des catégories
    console.log('📂 Récupération des catégories...');
    const categories = await MenuCategory.find().sort({ order: 1 }).lean();
    console.log(`✅ ${categories.length} catégories trouvées\n`);

    // Récupération des plats
    console.log('🍽️  Récupération des plats...');
    const menuItems = await MenuItem.find().populate('category', 'name').lean();
    console.log(`✅ ${menuItems.length} plats trouvés\n`);

    // Analyse des images
    console.log('🔍 Analyse des images...\n');
    
    const auditEntries: AuditEntry[] = [];
    const imageUsage = new Map<string, string[]>();
    let missingImages = 0;
    let placeholderImages = 0;
    let validImages = 0;

    for (const item of menuItems) {
      const categoryName = (item.category as any)?.name?.fr || 'Sans catégorie';
      const dishName = item.name?.fr || 'Nom inconnu';
      const price = item.price || 0;
      const currentImage = item.image || '';

      let imageStatus: AuditEntry['imageStatus'] = 'OK';
      let action: AuditEntry['action'] = 'KEEP';
      let notes = '';

      // Analyse du statut de l'image
      if (!currentImage || currentImage.trim() === '') {
        imageStatus = 'MISSING';
        action = 'GENERATE_ILLUSTRATION';
        notes = 'Aucune image associée';
        missingImages++;
      } else if (currentImage.includes('/images/gallery/') || currentImage.includes('placeholder')) {
        imageStatus = 'PLACEHOLDER';
        action = 'GENERATE_ILLUSTRATION';
        notes = 'Image placeholder locale, remplacer par illustration';
        placeholderImages++;
      } else if (currentImage.includes('cloudinary')) {
        imageStatus = 'OK';
        action = 'KEEP';
        notes = 'Image Cloudinary existante';
        validImages++;
        
        // Tracker les doublons
        if (!imageUsage.has(currentImage)) {
          imageUsage.set(currentImage, []);
        }
        imageUsage.get(currentImage)!.push(dishName);
      } else {
        imageStatus = 'INVALID';
        action = 'REVIEW';
        notes = 'URL d\'image non reconnue';
      }

      auditEntries.push({
        category: categoryName,
        dish: dishName,
        price,
        currentImage: currentImage.substring(0, 80),
        imageStatus,
        action,
        notes
      });
    }

    // Identifier les doublons
    const duplicates = Array.from(imageUsage.entries())
      .filter(([url, dishes]) => dishes.length > 1)
      .map(([url, dishes]) => ({ url: url.substring(0, 60), dishes, count: dishes.length }));

    // Statistiques
    console.log('📊 STATISTIQUES\n');
    console.log(`Total catégories : ${categories.length}`);
    console.log(`Total plats : ${menuItems.length}`);
    console.log(`Images valides : ${validImages}`);
    console.log(`Images manquantes : ${missingImages}`);
    console.log(`Images placeholder : ${placeholderImages}`);
    console.log(`Images dupliquées : ${duplicates.length}\n`);

    // Génération du rapport
    const outputDir = path.join(__dirname, 'audit-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Rapport CSV
    const timestamp = new Date().toISOString().split('T')[0];
    const csvPath = path.join(outputDir, `MENU-AUDIT-${timestamp}.csv`);
    let csv = 'CATEGORY,DISH,PRICE,CURRENT_IMAGE,IMAGE_STATUS,ACTION,NOTES\n';
    auditEntries.forEach(e => {
      csv += `"${e.category}","${e.dish}",${e.price},"${e.currentImage}","${e.imageStatus}","${e.action}","${e.notes}"\n`;
    });
    fs.writeFileSync(csvPath, csv);
    console.log(`✅ Rapport CSV : ${path.basename(csvPath)}`);

    // 2. Rapport JSON
    const jsonPath = path.join(outputDir, `MENU-AUDIT-${timestamp}.json`);
    const reportData = {
      metadata: {
        date: new Date().toISOString(),
        totalCategories: categories.length,
        totalItems: menuItems.length,
        imagesValid: validImages,
        imagesMissing: missingImages,
        imagesPlaceholder: placeholderImages,
        imagesDuplicated: duplicates.length
      },
      categories: categories.map(c => ({
        name: c.name?.fr,
        slug: c.slug,
        itemCount: auditEntries.filter(e => e.category === c.name?.fr).length
      })),
      duplicates,
      audit: auditEntries
    };
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));
    console.log(`✅ Rapport JSON : ${path.basename(jsonPath)}`);

    // 3. Rapport Markdown détaillé
    const mdPath = path.join(outputDir, `MENU-AUDIT-${timestamp}.md`);
    let md = `# 📋 Audit Complet du Menu BIZZ'ART\n\n`;
    md += `**Date :** ${new Date().toISOString().split('T')[0]}\n`;
    md += `**Restaurant :** BIZZ'ART Monastir\n\n`;
    
    md += `## 📊 Résumé Exécutif\n\n`;
    md += `| Métrique | Valeur |\n`;
    md += `|----------|--------|\n`;
    md += `| **Total Catégories** | ${categories.length} |\n`;
    md += `| **Total Plats** | ${menuItems.length} |\n`;
    md += `| **Images Valides** | ${validImages} |\n`;
    md += `| **Images Manquantes** | ${missingImages} |\n`;
    md += `| **Images Placeholder** | ${placeholderImages} |\n`;
    md += `| **Images Dupliquées** | ${duplicates.length} |\n\n`;
    
    md += `## 🎯 Actions Requises\n\n`;
    md += `- **${missingImages + placeholderImages} illustrations** à générer\n`;
    md += `- **${duplicates.length} doublons** à résoudre\n`;
    md += `- **0 suppressions** (conservation de toutes les données)\n\n`;
    
    md += `## 📂 Catégories et Plats\n\n`;
    for (const cat of categories) {
      const catName = cat.name?.fr || 'Sans nom';
      const items = auditEntries.filter(e => e.category === catName);
      md += `### ${catName} (${items.length} plats)\n\n`;
      md += `| Plat | Prix | Image | Status | Action |\n`;
      md += `|------|------|-------|--------|--------|\n`;
      items.forEach(item => {
        md += `| ${item.dish} | ${item.price} DT | ${item.currentImage.substring(0, 30)}... | ${item.imageStatus} | ${item.action} |\n`;
      });
      md += `\n`;
    }
    
    if (duplicates.length > 0) {
      md += `## 🔁 Images Dupliquées\n\n`;
      duplicates.forEach((dup, index) => {
        md += `### Doublon ${index + 1} (${dup.count} plats)\n`;
        md += `**Image :** \`${dup.url}...\`\n\n`;
        md += `**Utilisée par :**\n`;
        dup.dishes.forEach(dish => md += `- ${dish}\n`);
        md += `\n`;
      });
    }
    
    md += `## ⚠️ Règles de Génération\n\n`;
    md += `1. **Ne jamais modifier** les noms, prix ou catégories existants\n`;
    md += `2. **Ne jamais supprimer** de plats ou d'images réelles\n`;
    md += `3. **Générer des illustrations** uniquement pour les plats sans image valide\n`;
    md += `4. **Style unifié** : photographie culinaire professionnelle, réaliste\n`;
    md += `5. **Nommage cohérent** : \`category-dish-name.webp\`\n`;
    md += `6. **Attendre validation** avant toute modification MongoDB\n\n`;
    
    fs.writeFileSync(mdPath, md);
    console.log(`✅ Rapport Markdown : ${path.basename(mdPath)}`);

    console.log(`\n📂 Rapports générés dans : ${outputDir}\n`);
    console.log('⚠️  AUCUNE MODIFICATION EFFECTUÉE - DONNÉES INTACTES\n');

    await mongoose.disconnect();
    console.log('✅ Déconnecté de MongoDB\n');

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'audit:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

generateMenuAudit();
