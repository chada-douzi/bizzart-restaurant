/**
 * Update Menu Items with Real Cloudinary Images
 * 
 * Remplace les URLs d'images placeholder par les vraies URLs Cloudinary
 * 
 * Usage: npx ts-node src/seed/update-menu-images.ts
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { MenuItem } from '../models/menu-item.model';

dotenv.config();

const MAPPING_FILE = path.join(__dirname, 'menu-images-urls.json');

interface ImageMapping {
  originalName: string;
  cloudinaryUrl: string;
  publicId: string;
}

// Sélectionner une image aléatoire pour chaque plat parmi les 40 disponibles
function getRandomImage(mappings: ImageMapping[]): string {
  const randomIndex = Math.floor(Math.random() * mappings.length);
  return mappings[randomIndex].cloudinaryUrl;
}

async function updateMenuImages(): Promise<void> {
  console.log('\n🖼️  ============================================');
  console.log('📸 Update Menu Images with Cloudinary URLs');
  console.log('🖼️  ============================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI manquant');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connecté — DB: ${mongoose.connection.name}\n`);

  // Charger le mapping des URLs Cloudinary
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error(`❌ Fichier de mapping introuvable : ${MAPPING_FILE}`);
    process.exit(1);
  }

  const mappings: ImageMapping[] = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
  console.log(`📊 ${mappings.length} photos Cloudinary disponibles\n`);

  // Récupérer tous les plats
  const items = await MenuItem.find();
  console.log(`📋 ${items.length} plats trouvés dans MongoDB\n`);

  console.log('🔄 Mise à jour des URLs d\'images...\n');

  let updatedCount = 0;

  // Pour chaque plat, assigner une image Cloudinary aléatoire
  for (const item of items) {
    const newImageUrl = getRandomImage(mappings);
    
    await MenuItem.findByIdAndUpdate(item._id, {
      image: newImageUrl,
    });

    updatedCount++;
    console.log(`  ✅ [${updatedCount}/${items.length}] ${item.name.fr} → ${newImageUrl.split('/').pop()}`);
  }

  console.log(`\n🎉 Mise à jour terminée : ${updatedCount} plats mis à jour\n`);
  console.log('✅ Toutes les images pointent maintenant vers Cloudinary\n');
}

// ─── Run ──────────────────────────────────────────────────────────────────────

updateMenuImages()
  .then(async () => {
    await mongoose.disconnect();
    console.log('🔌 MongoDB déconnecté');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Mise à jour échouée:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
