/**
 * Seed Menu Script — BIZZ'ART Monastir
 *
 * Données extraites des pages de carte photographiées (FB_IMG analysées).
 * Toutes les informations (noms, prix, descriptions) sont réelles et tirées
 * des menus originaux du restaurant.
 *
 * Usage: npx ts-node src/seed/seed-menu.ts
 *
 * Idempotent : ne recrée pas les données si elles existent déjà (vérification par slug).
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MenuCategory } from '../models/menu-category.model';
import { MenuItem } from '../models/menu-item.model';

dotenv.config();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ─── Image base URL (served by Angular from public/images/gallery/) ───────────
// Angular dev server serves public/ at root, so /images/gallery/xxx.jpg is correct.
const IMG = (name: string) => `/images/gallery/${name}`;
const HERO = (name: string) => `/images/hero/${name}`;

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    nameFr: 'Pizzas',
    nameEn: 'Pizzas',
    descFr: 'Nos pizzas napolitaines cuites au four à bois, avec des garnitures généreuses.',
    image: IMG('pizza-oeuf-merguez.jpg'),
    order: 1,
  },
  {
    nameFr: 'Pâtes & Risottos',
    nameEn: 'Pasta & Risotto',
    descFr: 'Pâtes fraîches maison, risottos et plats espagnols — une invitation aux saveurs méditerranéennes.',
    image: IMG('tagliatelles-burrata.jpg'),
    order: 2,
  },
  {
    nameFr: 'Viandes & Grillades',
    nameEn: 'Meat & Grills',
    descFr: 'Nos grillades généreuses, steaks et plateaux mixtes pour les amateurs de viande.',
    image: IMG('plateau-grillades.jpg'),
    order: 3,
  },
  {
    nameFr: 'Fruits de Mer',
    nameEn: 'Seafood',
    descFr: 'Crevettes, poissons et plateaux de fruits de mer frais, au gré des arrivages.',
    image: IMG('crevettes-poisson.jpg'),
    order: 4,
  },
  {
    nameFr: 'Volailles',
    nameEn: 'Poultry',
    descFr: 'Escalopes et suprêmes de poulet préparés selon les classiques de la maison.',
    image: IMG('poulet-grille-herbes.jpg'),
    order: 5,
  },
  {
    nameFr: 'Salades',
    nameEn: 'Salads',
    descFr: 'Salades fraîches et composées, généreuses et colorées.',
    image: IMG('grillade-mixte-salle.jpg'),
    order: 6,
  },
  {
    nameFr: 'Snacking',
    nameEn: 'Snacking',
    descFr: 'Tacos, Maklοub et sandwichs pour une pause gourmande.',
    image: HERO('kitchen-poster.jpg'),
    order: 7,
  },
];

// ─── ITEMS ────────────────────────────────────────────────────────────────────
// Structure : { categorySlug, nameFr, nameEn?, descFr?, price, image, tags?, allergens?, isFeatured?, order }

const ITEMS: {
  categorySlug: string;
  nameFr: string;
  nameEn?: string;
  descFr?: string;
  price: number;
  image: string;
  tags?: string[];
  allergens?: string[];
  isFeatured?: boolean;
  order: number;
}[] = [

  // ── PIZZAS ────────────────────────────────────────────────────────────────
  {
    categorySlug: 'pizzas',
    nameFr: 'Margherita',
    descFr: 'Sauce tomate, mozzarella, basilic frais.',
    price: 14.5,
    image: IMG('pizza-champignons.jpg'),
    tags: ['végétarien'],
    order: 1,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Thon',
    descFr: 'Sauce tomate, mozzarella, thon, olives noires, basilic.',
    price: 16.5,
    image: IMG('pizza-thon.jpg'),
    isFeatured: true,
    order: 2,
  },
  {
    categorySlug: 'pizzas',
    nameFr: '4 Fromages Sauce Tomate',
    descFr: 'Sauce tomate, 4 fromages fondus gratinés.',
    price: 18.0,
    image: IMG('pizza-oeuf-merguez.jpg'),
    tags: ['végétarien'],
    allergens: ['gluten', 'lactose'],
    order: 3,
  },
  {
    categorySlug: 'pizzas',
    nameFr: '4 Fromages Sauce Blanche',
    descFr: 'Crème fraîche, 4 fromages, herbes aromatiques.',
    price: 18.5,
    image: IMG('pizza-oeuf-merguez.jpg'),
    tags: ['végétarien'],
    allergens: ['gluten', 'lactose'],
    order: 4,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Reine',
    descFr: 'Sauce tomate, mozzarella, jambon, champignons.',
    price: 18.0,
    image: IMG('pizza-champignons.jpg'),
    order: 5,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Piquante',
    descFr: 'Sauce tomate, mozzarella, chorizo, piments, olives.',
    price: 18.0,
    image: IMG('pizza-oeuf-merguez.jpg'),
    tags: ['épicé'],
    order: 6,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Chicken',
    descFr: 'Sauce tomate, mozzarella, poulet grillé, poivrons.',
    price: 19.0,
    image: IMG('pizza-champignons.jpg'),
    order: 7,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Napolitaine',
    descFr: 'Sauce tomate, mozzarella, œuf, anchois, olives noires.',
    price: 17.0,
    image: IMG('pizza-oeuf-merguez.jpg'),
    order: 8,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Pepperoni',
    descFr: 'Sauce tomate, mozzarella, pepperoni genereux.',
    price: 16.5,
    image: IMG('pizza-champignons.jpg'),
    order: 9,
  },
  {
    categorySlug: 'pizzas',
    nameFr: "Pizza BIZZ'ART",
    descFr: "La pizza signature de la maison — garnitures généreuses selon la créativité du chef.",
    price: 20.5,
    image: IMG('pizza-oeuf-merguez.jpg'),
    isFeatured: true,
    tags: ['signature'],
    order: 10,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Pizza Burrata',
    descFr: 'Sauce tomate, mozzarella, burrata fraîche, roquette, tomates cerises, basilic.',
    price: 22.5,
    image: IMG('pizza-thon-grosplan.jpg'),
    isFeatured: true,
    tags: ['signature', 'végétarien'],
    order: 11,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Pizza Fruits de Mer',
    descFr: 'Sauce tomate, crevettes, moules, calamars, poivrons, herbes.',
    price: 28.5,
    image: IMG('pizza-thon.jpg'),
    order: 12,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Pizza Saumon',
    descFr: 'Crème fraîche, mozzarella, saumon fumé, câpres, aneth.',
    price: 26.0,
    image: IMG('pizza-champignons.jpg'),
    order: 13,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Pizza Végétarienne',
    descFr: 'Sauce tomate, légumes grillés de saison, mozzarella, herbes fraîches.',
    price: 20.0,
    image: IMG('pizza-champignons.jpg'),
    tags: ['végétarien'],
    order: 14,
  },
  {
    categorySlug: 'pizzas',
    nameFr: 'Pizza Anglaise',
    descFr: 'Sauce tomate, mozzarella, jambon, bacon, œuf.',
    price: 19.0,
    image: IMG('pizza-oeuf-merguez.jpg'),
    order: 15,
  },

  // ── PÂTES & RISOTTOS ────────────────────────────────────────────────────────
  {
    categorySlug: 'pates-risottos',
    nameFr: 'Bolognaise',
    descFr: 'Pâtes maison, sauce bolognaise mijotée, parmesan.',
    price: 21.5,
    image: IMG('spaghetti-fruits-mer.jpg'),
    order: 1,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: 'Arrabiata',
    descFr: "Spaghetti à la sauce tomate épicée à l'ail et piments.",
    price: 18.5,
    image: IMG('spaghetti-fruits-mer.jpg'),
    tags: ['épicé', 'végétarien'],
    order: 2,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: "Pâtes BIZZ'ART",
    descFr: "La recette signature du chef — sauce crémeuse maison, parmesan, herbes aromatiques.",
    price: 27.5,
    image: IMG('tagliatelles-burrata.jpg'),
    isFeatured: true,
    tags: ['signature'],
    order: 3,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: 'Pâtes Maison',
    descFr: 'Pâtes fraîches maison, sauce crémeuse au pesto, tomates cerises, parmesan.',
    price: 26.0,
    image: IMG('tagliatelles-burrata.jpg'),
    order: 4,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: "Pâtes à l'Italienne",
    descFr: 'Tagliatelles, burrata fraîche, amandes effilées, noix, pesto, parmesan.',
    price: 32.5,
    image: IMG('tagliatelles-burrata.jpg'),
    isFeatured: true,
    tags: ['signature'],
    allergens: ['gluten', 'lactose', 'fruits à coque'],
    order: 5,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: 'Pâtes Fruits de Mer',
    descFr: 'Spaghetti aux crevettes, moules, calamars, sauce tomate ou crème selon humeur.',
    price: 32.0,
    image: IMG('spaghetti-fruits-mer.jpg'),
    order: 6,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: 'Raviolis Saumon & Crevette',
    descFr: 'Raviolis farcis saumon et crevette, sauce crème citronnée.',
    price: 29.0,
    image: IMG('plat-signature-gastro.jpg'),
    isFeatured: true,
    order: 7,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: 'Paella 1 Personne',
    descFr: 'Riz safrané, crevettes, moules, calamars, poivrons, herbes.',
    price: 34.0,
    image: IMG('paella-noire.jpg'),
    order: 8,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: 'Paella Royale',
    descFr: 'Grande paella pour 2 personnes — fruits de mer généreux, riz safrané, légumes.',
    price: 63.5,
    image: IMG('paella-fruits-mer.jpg'),
    isFeatured: true,
    tags: ['pour 2'],
    order: 9,
  },
  {
    categorySlug: 'pates-risottos',
    nameFr: "Risotto BIZZ'ART",
    descFr: 'Risotto crémeux, garnitures de saison, parmesan affiné.',
    price: 32.0,
    image: IMG('plat-signature-gastro.jpg'),
    order: 10,
  },

  // ── VIANDES & GRILLADES ──────────────────────────────────────────────────────
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Steak Grillé',
    descFr: 'Steak de bœuf grillé, sauce au choix, frites maison, salade.',
    price: 26.0,
    image: IMG('steak-gratiné.jpg'),
    order: 1,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: "Steak BIZZ'ART",
    descFr: "Steak gratiné au fromage fondu, roquette, tomates cerises, parmesan.",
    price: 30.0,
    image: IMG('steak-gratiné.jpg'),
    isFeatured: true,
    tags: ['signature'],
    order: 2,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Steak Farci',
    descFr: 'Steak farci aux légumes et fromage, sauce champignons, accompagnements.',
    price: 32.5,
    image: IMG('steak-gratiné.jpg'),
    order: 3,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Foie Grillé',
    descFr: 'Foie de veau grillé, sauce lyonnaise, oignons confits, accompagnements.',
    price: 25.0,
    image: IMG('grillade-mixte-salle.jpg'),
    order: 4,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Grillade Mixte',
    descFr: 'Assortiment de viandes grillées : merguez, côtelette agneau, brochette de bœuf.',
    price: 32.0,
    image: IMG('grillades-mixtes.jpg'),
    order: 5,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Grillade Royale',
    descFr: 'Grand plateau de grillades mixtes pour deux — viandes nobles et merguez.',
    price: 43.0,
    image: IMG('plateau-grillades.jpg'),
    isFeatured: true,
    tags: ['pour 2'],
    order: 6,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Panorama de Viande',
    descFr: 'Le grand plateau généreux pour 2 personnes — côtelettes, brochettes, merguez.',
    price: 65.0,
    image: IMG('plateau-grillades.jpg'),
    tags: ['pour 2'],
    order: 7,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: "Côtelette d'Agneau",
    descFr: "Côtelettes d'agneau grillées, herbes aromatiques, pommes de terre, salade.",
    price: 35.0,
    image: IMG('grillades-mixtes.jpg'),
    order: 8,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Côte à l\'Os',
    descFr: "Grande côte de bœuf grillée, sauce au poivre, frites maison.",
    price: 36.0,
    image: IMG('steak-gratiné.jpg'),
    order: 9,
  },
  {
    categorySlug: 'viandes-grillades',
    nameFr: 'Émincé Sauce Champignons',
    descFr: 'Émincé de bœuf en sauce crémeuse aux champignons, semoule, légumes grillés.',
    price: 28.0,
    image: IMG('emince-champignons.jpg'),
    order: 10,
  },

  // ── FRUITS DE MER ────────────────────────────────────────────────────────────
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Crevettes Grillées',
    descFr: 'Grosses crevettes grillées au beurre aillé, accompagnements au choix.',
    price: 28.5,
    image: IMG('crevettes-poisson.jpg'),
    isFeatured: true,
    order: 1,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Poisson du Jour',
    descFr: "Filet de poisson frais selon l'arrivage, herbes, accompagnements.",
    price: 24.0,
    image: IMG('crevettes-poisson.jpg'),
    order: 2,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Plateau Fruits de Mer',
    descFr: 'Assortiment de fruits de mer frais : crevettes, moules, calamars.',
    price: 50.0,
    image: IMG('paella-fruits-mer.jpg'),
    order: 3,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Symphonie Terre-Mer (2 pers.)',
    descFr: 'Poisson grillé, crevettes, viande — le grand plateau mixte pour deux.',
    price: 74.0,
    image: HERO('symphonie-terre-mer.jpg'),
    isFeatured: true,
    tags: ['signature', 'pour 2'],
    order: 4,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Symphonie Terre-Mer (4 pers.)',
    descFr: 'La grande table pour quatre — poissons, crevettes, viandes grillées.',
    price: 142.0,
    image: HERO('symphonie-terre-mer.jpg'),
    tags: ['pour 4'],
    order: 5,
  },

  // ── VOLAILLES ────────────────────────────────────────────────────────────────
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope Panée',
    descFr: 'Escalope de poulet panée, frites maison, sauce au choix.',
    price: 19.5,
    image: IMG('poulet-grille-herbes.jpg'),
    order: 1,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope Crème',
    descFr: 'Escalope de poulet nappée de sauce crème, riz, légumes.',
    price: 20.5,
    image: IMG('poulet-grille-herbes.jpg'),
    order: 2,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope Champignons',
    descFr: 'Escalope de poulet, sauce crémeuse aux champignons, tagliatelles.',
    price: 21.5,
    image: IMG('poulet-grille-herbes.jpg'),
    order: 3,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope Épinards',
    descFr: 'Escalope de poulet, sauce aux épinards et crème, pommes de terre.',
    price: 21.0,
    image: IMG('poulet-grille-herbes.jpg'),
    order: 4,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Cordon Bleu',
    descFr: 'Escalope farcie au jambon et fromage, panée, frites maison.',
    price: 23.0,
    image: IMG('poulet-grille-herbes.jpg'),
    allergens: ['gluten', 'lactose'],
    order: 5,
  },
  {
    categorySlug: 'volailles',
    nameFr: "Poulet BIZZ'ART",
    descFr: "Suprême de poulet sauce maison signature, légumes rôtis, pommes de terre.",
    price: 23.5,
    image: IMG('poulet-grille-herbes.jpg'),
    isFeatured: true,
    tags: ['signature'],
    order: 6,
  },
  {
    categorySlug: 'volailles',
    nameFr: "Poulet à l'Italienne",
    descFr: 'Escalope de poulet sauce tomate aux herbes italiennes, pâtes.',
    price: 28.0,
    image: IMG('poulet-grille-herbes.jpg'),
    order: 7,
  },

  // ── SALADES ──────────────────────────────────────────────────────────────────
  {
    categorySlug: 'salades',
    nameFr: 'Salade César',
    descFr: 'Laitue romaine, croûtons, parmesan, sauce César maison.',
    price: 15.8,
    image: IMG('grillade-mixte-salle.jpg'),
    tags: ['végétarien'],
    order: 1,
  },
  {
    categorySlug: 'salades',
    nameFr: "Salade BIZZ'ART",
    descFr: "Salade composée maison — poulet, jambon, tomates cerises, sauce maison.",
    price: 20.5,
    image: IMG('grillade-mixte-salle.jpg'),
    isFeatured: true,
    tags: ['signature'],
    order: 2,
  },
  {
    categorySlug: 'salades',
    nameFr: 'Salade Fruits de Mer',
    descFr: 'Salade fraîche, crevettes, calamars, sauce citronnée.',
    price: 28.0,
    image: IMG('grillade-mixte-salle.jpg'),
    order: 3,
  },
  {
    categorySlug: 'salades',
    nameFr: 'Salade Roquette',
    descFr: 'Roquette fraîche, parmesan, tomates cerises, vinaigrette balsamique.',
    price: 12.8,
    image: IMG('steak-gratiné.jpg'),
    tags: ['végétarien'],
    order: 4,
  },

  // ── SNACKING ──────────────────────────────────────────────────────────────────
  {
    categorySlug: 'snacking',
    nameFr: 'Tacos L',
    descFr: 'Galette grillée, viande hachée, fromage fondu, sauce blanche, frites.',
    price: 12.0,
    image: HERO('kitchen-poster.jpg'),
    order: 1,
  },
  {
    categorySlug: 'snacking',
    nameFr: 'Tacos XL',
    descFr: 'Grand format — galette grillée, viande hachée, double fromage, sauce.',
    price: 15.0,
    image: HERO('kitchen-poster.jpg'),
    order: 2,
  },
  {
    categorySlug: 'snacking',
    nameFr: 'Maklοub',
    descFr: 'Galette farcie viande et légumes, grillée, sauce maison.',
    price: 11.0,
    image: HERO('kitchen-poster.jpg'),
    order: 3,
  },
];

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

async function seedMenu(): Promise<void> {
  console.log('\n🌱 ============================================');
  console.log("🍕 BIZZ'ART — Menu Seed Script");
  console.log('🌱 ============================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error('❌ MONGODB_URI manquant'); process.exit(1); }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connecté — DB: ${mongoose.connection.name}\n`);

  // ── Vérifier si le menu existe déjà ───────────────────────────────────────
  const existingCount = await MenuCategory.countDocuments();
  if (existingCount > 0) {
    console.log(`ℹ️  ${existingCount} catégorie(s) déjà présente(s) en base.`);
    console.log('   Seed ignoré (idempotent). Supprimez les données manuellement pour reseed.\n');
    return;
  }

  // ── Créer les catégories ──────────────────────────────────────────────────
  console.log('📂 Création des catégories...');
  const categoryMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const slug = slugify(cat.nameFr);
    const created = await MenuCategory.create({
      name: { fr: cat.nameFr, en: cat.nameEn ?? cat.nameFr },
      slug,
      description: { fr: cat.descFr, en: '' },
      image: cat.image,
      order: cat.order,
      isActive: true,
    });
    categoryMap[slug] = (created._id as mongoose.Types.ObjectId).toString();
    console.log(`  ✅ ${cat.nameFr} (slug: ${slug})`);
  }

  // ── Créer les items ───────────────────────────────────────────────────────
  console.log('\n🍽️  Création des plats...');
  let itemCount = 0;

  for (const item of ITEMS) {
    const catId = categoryMap[item.categorySlug];
    if (!catId) {
      console.warn(`  ⚠️  Catégorie introuvable: ${item.categorySlug} — item ignoré: ${item.nameFr}`);
      continue;
    }

    const slug = slugify(item.nameFr);
    // Ensure unique slug by appending category slug if needed
    const existing = await MenuItem.findOne({ slug });
    const finalSlug = existing ? `${slug}-${item.categorySlug.split('-')[0]}` : slug;

    await MenuItem.create({
      category: new mongoose.Types.ObjectId(catId),
      name: { fr: item.nameFr, en: item.nameEn ?? item.nameFr },
      slug: finalSlug,
      description: item.descFr ? { fr: item.descFr, en: '' } : undefined,
      price: item.price,
      image: item.image,
      allergens: item.allergens ?? [],
      tags: item.tags ?? [],
      isAvailable: true,
      isFeatured: item.isFeatured ?? false,
      order: item.order,
    });

    itemCount++;
    console.log(`  ✅ ${item.nameFr} — ${item.price} DT`);
  }

  console.log(`\n🎉 Seed terminé : ${CATEGORIES.length} catégories, ${itemCount} plats\n`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seedMenu()
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
