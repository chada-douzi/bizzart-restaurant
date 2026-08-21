/**
 * Seed Gallery — BIZZ'ART Real Photos
 * 
 * Ajoute les 40 photos uploadées sur Cloudinary dans la galerie publique
 * 
 * Usage: npx ts-node src/seed/seed-gallery-real.ts
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Media } from '../models/media.model';

dotenv.config();

// Charger le fichier de mapping des URLs Cloudinary
const MAPPING_FILE = path.join(__dirname, 'menu-images-urls.json');

interface ImageMapping {
  originalName: string;
  cloudinaryUrl: string;
  publicId: string;
}

async function seedGalleryReal(): Promise<void> {
  console.log('\n🖼️  ============================================');
  console.log("🎨 BIZZ'ART — Gallery Seed (Photos Réelles)");
  console.log('🖼️  ============================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI manquant');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connecté — DB: ${mongoose.connection.name}\n`);

  // Charger le mapping des URLs
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error(`❌ Fichier de mapping introuvable : ${MAPPING_FILE}`);
    console.log('   Exécutez d\'abord : npx ts-node src/seed/upload-menu-images.ts');
    process.exit(1);
  }

  const mappings: ImageMapping[] = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
  console.log(`📊 ${mappings.length} photos trouvées dans le mapping\n`);

  // Supprimer les anciennes photos de galerie
  console.log('🗑️  Suppression des anciennes photos de galerie...');
  await Media.deleteMany({ category: 'gallery' });
  console.log('   ✅ Anciennes photos supprimées\n');

  // Créer les entrées Media pour chaque photo
  console.log('📸 Ajout des photos dans la galerie...');
  let count = 0;

  for (const mapping of mappings) {
    // Générer un titre basé sur le nom du fichier
    const title = mapping.originalName
      .replace(/\.(jpg|jpeg|png)$/i, '')
      .replace(/[@_-]/g, ' ')
      .trim();

    await Media.create({
      url: mapping.cloudinaryUrl,
      publicId: mapping.publicId,
      type: 'image',
      category: 'gallery',
      title: title,
      description: '',
      alt: `Photo BIZZ'ART Monastir - ${title}`,
      order: count,
      isActive: true,
    });

    count++;
    console.log(`  ✅ [${count}/${mappings.length}] ${mapping.originalName}`);
  }

  console.log(`\n🎉 Seed terminé : ${count} photos ajoutées à la galerie\n`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seedGalleryReal()
  .then(async () => {
    await mongoose.disconnect();
    console.log('🔌 MongoDB déconnecté');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Seed échoué:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
