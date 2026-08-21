/**
 * Seed Gallery Script — BIZZ'ART Monastir
 *
 * Insère en MongoDB les médias dont les fichiers image sont déjà servis
 * par Angular depuis public/images/gallery/ (accessibles via /images/gallery/xxx.jpg).
 *
 * Le champ `url` contient le chemin absolu local (/images/gallery/xxx.jpg).
 * Le champ `publicId` est un identifiant local unique (pas Cloudinary).
 *
 * Usage: npx ts-node src/seed/seed-gallery.ts
 * Idempotent : vérifie via publicId avant insertion.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Media } from '../models/media.model';

dotenv.config();

// ─── Média descriptors ────────────────────────────────────────────────────────

const GALLERY_MEDIAS = [
  // ── Plats signature (gastronomique) ─────────────────────────────────────
  {
    filename: 'plat-signature-gastro.jpg',
    title: "Plat signature BIZZ'ART",
    altText: "Ravioli vert, crevette grillée, assiette rose — plat signature gastronomique BIZZ'ART",
    category: 'food' as const,
    order: 1,
    isFeatured: true,
    width: 450, height: 800,
  },
  // ── Pizzas ───────────────────────────────────────────────────────────────
  {
    filename: 'pizza-oeuf-merguez.jpg',
    title: 'Pizza Napolitaine',
    altText: "Pizza napolitaine BIZZ'ART — oeuf, merguez, poivrons verts, mozzarella",
    category: 'food' as const,
    order: 2,
    width: 800, height: 1000,
  },
  {
    filename: 'pizza-thon.jpg',
    title: 'Pizza Thon',
    altText: "Pizza thon olives noires basilic BIZZ'ART",
    category: 'food' as const,
    order: 3,
    width: 640, height: 800,
  },
  {
    filename: 'pizza-thon-grosplan.jpg',
    title: 'Pizza Thon (détail)',
    altText: "Pizza thon en gros plan — garnitures généreuses BIZZ'ART",
    category: 'food' as const,
    order: 4,
    width: 640, height: 800,
  },
  {
    filename: 'pizza-champignons.jpg',
    title: 'Pizza Champignons',
    altText: "Pizza champignons poulet poivrons mozzarella BIZZ'ART",
    category: 'food' as const,
    order: 5,
    width: 600, height: 800,
  },
  // ── Grillades & viandes ─────────────────────────────────────────────────
  {
    filename: 'grillades-mixtes.jpg',
    title: 'Grillades Mixtes',
    altText: "Plateaux de grillades mixtes BIZZ'ART — agneau, poulet, merguez",
    category: 'food' as const,
    order: 6,
    isFeatured: true,
    width: 800, height: 600,
  },
  {
    filename: 'plateau-grillades.jpg',
    title: 'Grand Plateau Grillades',
    altText: "Grand plateau grillades merguez agneau poulet BIZZ'ART",
    category: 'food' as const,
    order: 7,
    width: 800, height: 1000,
  },
  {
    filename: 'steak-gratiné.jpg',
    title: 'Steak Gratiné',
    altText: "Steak gratiné fromage fondu, salade roquette, parmesan BIZZ'ART",
    category: 'food' as const,
    order: 8,
    width: 600, height: 800,
  },
  {
    filename: 'emince-champignons.jpg',
    title: 'Émincé Champignons',
    altText: "Émincé sauce champignons avec accompagnements BIZZ'ART",
    category: 'food' as const,
    order: 9,
    width: 600, height: 800,
  },
  // ── Fruits de mer ────────────────────────────────────────────────────────
  {
    filename: 'paella-fruits-mer.jpg',
    title: 'Paella Fruits de Mer',
    altText: "Paella fruits de mer BIZZ'ART — crevettes, moules, calamars, riz safrané",
    category: 'food' as const,
    order: 10,
    isFeatured: true,
    width: 600, height: 800,
  },
  {
    filename: 'paella-noire.jpg',
    title: 'Paella Royale',
    altText: "Paella royale dans poêle noire BIZZ'ART — version sombre et dramatique",
    category: 'food' as const,
    order: 11,
    width: 600, height: 800,
  },
  {
    filename: 'crevettes-poisson.jpg',
    title: 'Crevettes & Poisson',
    altText: "Assiette crevettes grillées et filet de poisson BIZZ'ART",
    category: 'food' as const,
    order: 12,
    width: 600, height: 800,
  },
  {
    filename: 'spaghetti-fruits-mer.jpg',
    title: 'Spaghetti Fruits de Mer',
    altText: "Spaghetti fruits de mer sauce arrabiata BIZZ'ART",
    category: 'food' as const,
    order: 13,
    width: 450, height: 800,
  },
  // ── Pâtes & signature ────────────────────────────────────────────────────
  {
    filename: 'tagliatelles-burrata.jpg',
    title: 'Tagliatelles Burrata',
    altText: "Tagliatelles burrata amandes effilées pesto BIZZ'ART",
    category: 'food' as const,
    order: 14,
    isFeatured: true,
    width: 450, height: 800,
  },
  // ── Ambiance salle ───────────────────────────────────────────────────────
  {
    filename: 'grillade-mixte-salle.jpg',
    title: 'Grillade en Salle',
    altText: "Grillade mixte servie en salle BIZZ'ART — ambiance restaurant",
    category: 'restaurant' as const,
    order: 15,
    width: 640, height: 800,
  },
  {
    filename: 'poulet-grille-herbes.jpg',
    title: 'Poulet Grillé aux Herbes',
    altText: "Poulet grillé aux herbes avec accompagnements BIZZ'ART",
    category: 'food' as const,
    order: 16,
    width: 640, height: 800,
  },
  // ── Fruits de mer complémentaire ─────────────────────────────────────────
  {
    filename: 'fruits-mer-creme.jpg',
    title: 'Fruits de Mer en Sauce Crème',
    altText: "Fruits de mer en sauce crème, crevettes, moules — BIZZ'ART",
    category: 'food' as const,
    order: 17,
    width: 450, height: 800,
  },
];

// ─── SEED ─────────────────────────────────────────────────────────────────────

async function seedGallery(): Promise<void> {
  console.log('\n🌱 ============================================');
  console.log("🖼️  BIZZ'ART — Gallery Seed Script");
  console.log('🌱 ============================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error('❌ MONGODB_URI manquant'); process.exit(1); }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connecté — DB: ${mongoose.connection.name}\n`);

  let created = 0;
  let skipped = 0;

  for (const m of GALLERY_MEDIAS) {
    const publicId = `local/gallery/${m.filename.replace('.jpg', '')}`;
    const url = `/images/gallery/${m.filename}`;

    // Idempotent : skip si publicId déjà présent
    const exists = await Media.findOne({ publicId });
    if (exists) {
      console.log(`  ⏭️  Déjà présent : ${m.title}`);
      skipped++;
      continue;
    }

    await Media.create({
      type:        'image',
      category:    m.category,
      url,
      publicId,
      title:       m.title,
      altText:     m.altText,
      width:       m.width,
      height:      m.height,
      format:      'jpg',
      isVisible:   true,
      order:       m.order,
    });

    console.log(`  ✅ ${m.title} → ${url}`);
    created++;
  }

  console.log(`\n🎉 Gallery seed terminé : ${created} créés, ${skipped} ignorés\n`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seedGallery()
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
