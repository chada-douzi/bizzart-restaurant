import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';

dotenv.config();

// Placeholder image (transparent 1x1 pixel)
const PLACEHOLDER_IMAGE = 'https://res.cloudinary.com/gmpztbom/image/upload/v1/placeholder.png';

interface SupplementData {
  name: string;
  price: number;
  description?: string;
  tags: string[];
  order: number;
}

const SUPPLEMENTS_PIZZA: SupplementData[] = [
  { name: 'Frite', price: 3.5, tags: ['Supplement Pizza'], order: 1 },
  { name: 'Gruyère', price: 3.5, tags: ['Supplement Pizza'], order: 2 },
  { name: 'Emmental', price: 3.5, tags: ['Supplement Pizza'], order: 3 },
  { name: 'Edam', price: 3.4, tags: ['Supplement Pizza'], order: 4 },
  { name: 'Champignon', price: 3.5, tags: ['Supplement Pizza'], order: 5 },
  { name: 'Thon', price: 4.0, tags: ['Supplement Pizza'], order: 6 },
  { name: 'Jambon', price: 3.0, tags: ['Supplement Pizza'], order: 7 },
  { name: 'Poulet', price: 5.0, tags: ['Supplement Pizza'], order: 8 },
  { name: 'Chawarma', price: 4.0, tags: ['Supplement Pizza'], order: 9 },
  { name: 'Pepperoni', price: 4.0, tags: ['Supplement Pizza'], order: 10 },
];

const SUPPLEMENTS_SANDWICH: SupplementData[] = [
  { 
    name: 'Gruyère', 
    price: 3.0, 
    description: 'Prix variable selon le sandwich (3.0 - 4.0 DT)',
    tags: ['Supplement Sandwich'], 
    order: 11 
  },
  { 
    name: 'Emmental', 
    price: 3.0, 
    description: 'Prix variable selon le sandwich (3.0 - 4.0 DT)',
    tags: ['Supplement Sandwich'], 
    order: 12 
  },
  { 
    name: 'Edam', 
    price: 3.0, 
    description: 'Prix variable selon le sandwich (3.0 - 4.0 DT)',
    tags: ['Supplement Sandwich'], 
    order: 13 
  },
  { 
    name: 'Champignon', 
    price: 3.0, 
    description: 'Prix variable selon le sandwich (3.0 - 4.0 DT)',
    tags: ['Supplement Sandwich'], 
    order: 14 
  },
  { name: 'Oeuf', price: 1.0, tags: ['Supplement Sandwich'], order: 15 },
  { name: 'Slice', price: 1.0, tags: ['Supplement Sandwich'], order: 16 },
];

async function seedSupplements() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzart');
    console.log('✅ Connecté à MongoDB\n');

    // Trouver catégorie Supplement
    const supplementCategory = await MenuCategory.findOne({ slug: 'supplement' });
    if (!supplementCategory) {
      throw new Error('❌ Catégorie "Supplement" introuvable!');
    }
    console.log(`✅ Catégorie trouvée: ${supplementCategory.name.fr} (${supplementCategory._id})\n`);

    // Vérifier items existants
    const existingCount = await MenuItem.countDocuments({ category: supplementCategory._id });
    console.log(`📊 Suppléments existants: ${existingCount}`);
    
    if (existingCount > 0) {
      console.log('⚠️  Des suppléments existent déjà. Liste:');
      const existing = await MenuItem.find({ category: supplementCategory._id }).select('name.fr price');
      existing.forEach(item => console.log(`   - ${item.name.fr}: ${item.price} DT`));
      console.log('\n⚠️  ARRÊT: Supprimez d\'abord les suppléments existants si nécessaire.\n');
      return;
    }

    console.log('\n🔄 Création des suppléments...\n');

    let created = 0;
    let skipped = 0;

    // Fonction helper pour créer un slug unique
    const createSlug = (name: string, tag: string): string => {
      const baseSlug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const suffix = tag.includes('Pizza') ? '-pizza' : '-sandwich';
      return `${baseSlug}${suffix}`;
    };

    // Créer suppléments Pizza
    console.log('━━━ SUPPLÉMENTS PIZZA ━━━');
    for (const supp of SUPPLEMENTS_PIZZA) {
      const slug = createSlug(supp.name, supp.tags[0]);
      
      // Vérifier si existe déjà
      const exists = await MenuItem.findOne({ slug });
      if (exists) {
        console.log(`⏭️  ${supp.name}: Existe déjà (slug: ${slug})`);
        skipped++;
        continue;
      }

      const item = new MenuItem({
        category: supplementCategory._id,
        name: { fr: supp.name },
        slug,
        description: supp.description ? { fr: supp.description } : undefined,
        price: supp.price,
        image: PLACEHOLDER_IMAGE,
        tags: supp.tags,
        isAvailable: true,
        isFeatured: false,
        order: supp.order,
      });

      await item.save();
      console.log(`✅ ${supp.name}: ${supp.price} DT (slug: ${slug})`);
      created++;
    }

    // Créer suppléments Sandwich
    console.log('\n━━━ SUPPLÉMENTS SANDWICH ━━━');
    for (const supp of SUPPLEMENTS_SANDWICH) {
      const slug = createSlug(supp.name, supp.tags[0]);
      
      const exists = await MenuItem.findOne({ slug });
      if (exists) {
        console.log(`⏭️  ${supp.name}: Existe déjà (slug: ${slug})`);
        skipped++;
        continue;
      }

      const item = new MenuItem({
        category: supplementCategory._id,
        name: { fr: supp.name },
        slug,
        description: supp.description ? { fr: supp.description } : undefined,
        price: supp.price,
        image: PLACEHOLDER_IMAGE,
        tags: supp.tags,
        isAvailable: true,
        isFeatured: false,
        order: supp.order,
      });

      await item.save();
      const priceDisplay = supp.description ? `${supp.price} DT (variable)` : `${supp.price} DT`;
      console.log(`✅ ${supp.name}: ${priceDisplay} (slug: ${slug})`);
      created++;
    }

    console.log('\n━━━ RÉSUMÉ ━━━');
    console.log(`✅ Créés: ${created}`);
    console.log(`⏭️  Ignorés (existants): ${skipped}`);
    console.log(`📊 Total suppléments: ${await MenuItem.countDocuments({ category: supplementCategory._id })}`);

    // Vérification finale
    console.log('\n━━━ VÉRIFICATION FINALE ━━━');
    const allSupplements = await MenuItem.find({ category: supplementCategory._id }).sort({ order: 1 });
    
    console.log('\nSuppléments Pizza:');
    allSupplements
      .filter(s => s.tags.includes('Supplement Pizza'))
      .forEach((s, i) => console.log(`  ${i + 1}. ${s.name.fr} - ${s.price} DT`));
    
    console.log('\nSuppléments Sandwich:');
    allSupplements
      .filter(s => s.tags.includes('Supplement Sandwich'))
      .forEach((s, i) => {
        const desc = s.description?.fr ? ` (${s.description.fr})` : '';
        console.log(`  ${i + 1}. ${s.name.fr} - ${s.price} DT${desc}`);
      });

    console.log('\n🎉 Seed terminé avec succès!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Exécution
seedSupplements();
