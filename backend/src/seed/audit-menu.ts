import mongoose from 'mongoose';
import { config } from 'dotenv';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(__dirname, '../../.env') });

interface MenuItemAudit {
  _id: string;
  name: string;
  nameFull: {
    fr: string;
    en?: string;
    ar?: string;
  };
  category: string;
  categoryName: string;
  description: string;
  price: number;
  image: string | null;
  available: boolean;
  featured: boolean;
  order: number;
  slug: string;
}

async function auditMenu() {
  try {
    console.log('🔍 AUDIT DU MENU MONGODB — BIZZ\'ART\n');
    console.log('Connexion à MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connecté à MongoDB\n');

    // Récupérer toutes les catégories
    const categories = await MenuCategory.find().sort({ order: 1 });
    console.log(`📂 Catégories trouvées : ${categories.length}\n`);

    const categoryMap = new Map(
      categories.map(cat => [cat._id.toString(), cat.name.fr])
    );

    // Récupérer tous les plats
    const menuItems = await MenuItem.find().sort({ category: 1, order: 1 });
    console.log(`🍽️  Plats trouvés : ${menuItems.length}\n`);

    const auditData: MenuItemAudit[] = [];

    console.log('════════════════════════════════════════════════════════════════\n');

    for (const item of menuItems) {
      const categoryName = categoryMap.get(item.category.toString()) || 'CATÉGORIE INCONNUE';
      
      const audit: MenuItemAudit = {
        _id: item._id.toString(),
        name: item.name.fr,
        nameFull: {
          fr: item.name.fr,
          en: item.name.en,
          ar: item.name.ar
        },
        category: item.category.toString(),
        categoryName: categoryName,
        description: item.description?.fr || '',
        price: item.price,
        image: item.image || null,
        available: item.isAvailable,
        featured: item.isFeatured || false,
        order: item.order,
        slug: item.slug
      };

      auditData.push(audit);

      console.log(`📌 ${audit.name}`);
      console.log(`   Catégorie    : ${audit.categoryName}`);
      console.log(`   Prix         : ${audit.price} TND`);
      console.log(`   Image actuelle: ${audit.image || '❌ AUCUNE'}`);
      console.log(`   Description  : ${audit.description.substring(0, 60)}${audit.description.length > 60 ? '...' : ''}`);
      console.log(`   Disponible   : ${audit.available ? '✅' : '❌'}`);
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════════\n');

    // Sauvegarder l'audit complet
    const outputPath = path.join(__dirname, '../../menu-audit-complete.json');
    fs.writeFileSync(outputPath, JSON.stringify(auditData, null, 2), 'utf-8');
    console.log(`✅ Audit sauvegardé : ${outputPath}\n`);

    // Statistiques
    const itemsWithImage = auditData.filter(item => item.image).length;
    const itemsWithoutImage = auditData.filter(item => !item.image).length;

    console.log('📊 STATISTIQUES\n');
    console.log(`Total plats              : ${auditData.length}`);
    console.log(`Plats avec image         : ${itemsWithImage}`);
    console.log(`Plats sans image         : ${itemsWithoutImage}`);
    console.log(`Catégories               : ${categories.length}`);
    console.log('');

    // Grouper par catégorie
    console.log('📂 RÉPARTITION PAR CATÉGORIE\n');
    const byCategory = new Map<string, number>();
    for (const item of auditData) {
      const count = byCategory.get(item.categoryName) || 0;
      byCategory.set(item.categoryName, count + 1);
    }

    for (const [categoryName, count] of byCategory) {
      console.log(`   ${categoryName.padEnd(25)} : ${count} plat(s)`);
    }

    console.log('\n════════════════════════════════════════════════════════════════\n');
    console.log('✅ AUDIT TERMINÉ\n');

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ ERREUR:', error);
    process.exit(1);
  }
}

auditMenu();
