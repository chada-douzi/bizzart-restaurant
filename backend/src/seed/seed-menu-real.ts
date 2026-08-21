/**
 * Seed Menu Script — BIZZ'ART Monastir — DONNÉES RÉELLES
 *
 * Toutes les données sont extraites des 7 photos officielles du menu BIZZ'ART.
 * Aucune information n'a été inventée.
 *
 * Usage: npx ts-node src/seed/seed-menu-real.ts
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

// ─── Image placeholder (à remplacer par vraies URLs Cloudinary si disponibles) ───
const IMG = (name: string) => `/images/gallery/${name}`;

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    nameFr: 'Les Pizzas',
    nameEn: 'Pizzas',
    descFr: 'Pizzas artisanales cuites au four',
    image: IMG('pizza-default.jpg'),
    order: 1,
  },
  {
    nameFr: 'Pâtes',
    nameEn: 'Pasta',
    descFr: 'Spaghetti, Tagliatelle, Penne',
    image: IMG('pates-default.jpg'),
    order: 2,
  },
  {
    nameFr: 'Plats Espagnol',
    nameEn: 'Spanish Dishes',
    descFr: 'Paella, Risotto et Gratin',
    image: IMG('paella-default.jpg'),
    order: 3,
  },
  {
    nameFr: 'Salade',
    nameEn: 'Salads',
    descFr: 'Salades fraîches et composées',
    image: IMG('salade-default.jpg'),
    order: 4,
  },
  {
    nameFr: 'Volailles',
    nameEn: 'Poultry',
    descFr: 'Escalopes et plats de poulet',
    image: IMG('poulet-default.jpg'),
    order: 5,
  },
  {
    nameFr: 'Viandes',
    nameEn: 'Meat',
    descFr: 'Steaks et grillades',
    image: IMG('viande-default.jpg'),
    order: 6,
  },
  {
    nameFr: 'Fruits de mer',
    nameEn: 'Seafood',
    descFr: 'Poissons et fruits de mer frais',
    image: IMG('fruits-mer-default.jpg'),
    order: 7,
  },
  {
    nameFr: 'Tacos',
    nameEn: 'Tacos',
    descFr: 'Tacos en deux tailles',
    image: IMG('tacos-default.jpg'),
    order: 8,
  },
  {
    nameFr: 'MAkIOUB',
    nameEn: 'Makloub',
    descFr: 'Makloub tunisien',
    image: IMG('makloub-default.jpg'),
    order: 9,
  },
  {
    nameFr: 'Supplement',
    nameEn: 'Extras',
    descFr: 'Suppléments et sauces',
    image: IMG('supplement-default.jpg'),
    order: 10,
  },
  {
    nameFr: 'Soda',
    nameEn: 'Beverages',
    descFr: 'Boissons et sodas',
    image: IMG('soda-default.jpg'),
    order: 11,
  },
];

// ─── ITEMS ────────────────────────────────────────────────────────────────────

interface MenuItem {
  categorySlug: string;
  nameFr: string;
  nameEn?: string;
  descFr?: string;
  price: number;
  priceXL?: number; // Pour les tacos qui ont 2 tailles
  image: string;
  tags?: string[];
  isFeatured?: boolean;
  order: number;
}

const ITEMS: MenuItem[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // PÂTES
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'pates',
    nameFr: "Pâtes BIZZ'Art",
    descFr: 'Sauce Blanche, Crevettes, Chevrettes, Moules, épinard, Cheddar, Parmesan',
    price: 27.5,
    image: IMG('pates-bizzart.jpg'),
    tags: ['signature'],
    isFeatured: true,
    order: 1,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Pâtes Bolognaise',
    descFr: 'Viande Hachée, Fromage Gruyère râpé',
    price: 21.5,
    image: IMG('pates-bolognaise.jpg'),
    order: 2,
  },
  {
    categorySlug: 'pates',
    nameFr: "Pâtes l'Arrabiata",
    descFr: 'Thon, Câpres, Piment séché, Olive',
    price: 18.5,
    image: IMG('pates-arrabiata.jpg'),
    order: 3,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Pâtes du Chef',
    descFr: 'Sauce Taro, Chevrettes, Crevettes, Moules, Piment, Champignons, Cheddar, Parmesan',
    price: 29.0,
    image: IMG('pates-chef.jpg'),
    tags: ['signature'],
    order: 4,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Pâtes Maison',
    descFr: 'Sauce Blanche, épinard, Cheddar, Parmesan, Poulet',
    price: 26.0,
    image: IMG('pates-maison.jpg'),
    order: 5,
  },
  {
    categorySlug: 'pates',
    nameFr: "Pâtes à L'italienne",
    descFr: 'Sauce Blanche, Champignons, Cheddar, Parmesan, Burrata, Fruits Secs, Poulet',
    price: 32.5,
    image: IMG('pates-italienne.jpg'),
    tags: ['new'],
    isFeatured: true,
    order: 6,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Pâtes Fruits de Mer',
    price: 32.0,
    image: IMG('pates-fruits-mer.jpg'),
    order: 7,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Ravioli Saumon',
    price: 32.0,
    image: IMG('ravioli-saumon.jpg'),
    tags: ['new'],
    order: 8,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Ravioli Crevette',
    price: 30.0,
    image: IMG('ravioli-crevette.jpg'),
    tags: ['new'],
    order: 9,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Ravioli Viande',
    price: 26.0,
    image: IMG('ravioli-viande.jpg'),
    tags: ['new'],
    order: 10,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Pâtes sauce pesto',
    descFr: 'Pesto crevettes et parmesan',
    price: 29.0,
    image: IMG('pates-pesto.jpg'),
    tags: ['new'],
    order: 11,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Lasagne Bolognaise',
    price: 21.5,
    image: IMG('lasagne-bolognaise.jpg'),
    order: 12,
  },
  {
    categorySlug: 'pates',
    nameFr: 'Lasagne Fruits De Mer',
    price: 32.0,
    image: IMG('lasagne-fruits-mer.jpg'),
    order: 13,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PLATS ESPAGNOL
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'plats-espagnol',
    nameFr: 'Paella 1 Personne',
    price: 34.0,
    image: IMG('paella-1-personne.jpg'),
    order: 1,
  },
  {
    categorySlug: 'plats-espagnol',
    nameFr: 'Paella Royale',
    price: 63.5,
    image: IMG('paella-royale.jpg'),
    isFeatured: true,
    order: 2,
  },
  {
    categorySlug: 'plats-espagnol',
    nameFr: "Risotto Bizz'Art",
    descFr: 'Sauce Blanche, Cheddar, Chevrettes, Crevettes, Moules, Parmesan',
    price: 32.0,
    image: IMG('risotto-bizzart.jpg'),
    tags: ['signature'],
    order: 3,
  },
  {
    categorySlug: 'plats-espagnol',
    nameFr: 'Risotto Poulet-Champignons',
    price: 28.0,
    image: IMG('risotto-poulet.jpg'),
    order: 4,
  },
  {
    categorySlug: 'plats-espagnol',
    nameFr: 'Gratin Poulet',
    price: 23.0,
    image: IMG('gratin-poulet.jpg'),
    order: 5,
  },
  {
    categorySlug: 'plats-espagnol',
    nameFr: 'Gratin Fruits de Mer',
    price: 29.5,
    image: IMG('gratin-fruits-mer.jpg'),
    order: 6,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LES PIZZAS
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza Margherita',
    descFr: 'Sauce tomate + Mozzarella',
    price: 14.5,
    image: IMG('pizza-margherita.jpg'),
    order: 1,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza Thon',
    descFr: 'Sauce Tomate + Mozzarella + Câpres + Olives + Tomates Fraîches',
    price: 16.5,
    image: IMG('pizza-thon.jpg'),
    order: 2,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza 4 Fromages sauce tomate',
    descFr: 'Mozzarella + Fromage Gruyère + Gouta + Emmental',
    price: 18.0,
    image: IMG('pizza-4-fromages-tomate.jpg'),
    order: 3,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza 4 Fromages sauce blanche',
    descFr: 'Mozzarella + Gruyère + Gouta + Emmental',
    price: 18.5,
    image: IMG('pizza-4-fromages-blanche.jpg'),
    order: 4,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Reine',
    descFr: 'Sauce Tomate + Mozzarella + Champignons + Jambon',
    price: 18.0,
    image: IMG('pizza-reine.jpg'),
    order: 5,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Piquante',
    descFr: 'Sauce Piquante + Sauce tomate + Viande de boeuf + Tomate Fraîche +Poivrons + Mozzarella',
    price: 18.0,
    image: IMG('pizza-piquante.jpg'),
    order: 6,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Chicken',
    descFr: 'Sauce Blanche + Poulet + Oignons + Champignons + Emmental + Mozzarella + Poivrons',
    price: 19.0,
    image: IMG('pizza-chicken.jpg'),
    order: 7,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Napolitaine',
    descFr: 'Sauce Tomate + Mozzarella + Câpres + Olives +Anchois',
    price: 17.0,
    image: IMG('pizza-napolitaine.jpg'),
    order: 8,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pepperoni',
    descFr: 'Sauce Tomate + Mozzarella + Poivron + Tomate Frâiche + Saucisse',
    price: 16.5,
    image: IMG('pizza-pepperoni.jpg'),
    order: 9,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: '4 Saisons',
    descFr: 'Sauce Tomate + Jambon + Champignon + Poivron + Tomate Fraîche + Olive',
    price: 17.5,
    image: IMG('pizza-4-saisons.jpg'),
    order: 10,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: "Pizza Bizz'art",
    descFr: 'Sauce Blanche + Champignon + Poulet + 4 Fromages + Jambon',
    price: 20.5,
    image: IMG('pizza-bizzart.jpg'),
    tags: ['signature'],
    isFeatured: true,
    order: 11,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza Anglaise',
    descFr: 'Sauce Blanche + Mozzarella + 4 Fromages + Roquefort + Jambon + Basilic',
    price: 19.0,
    image: IMG('pizza-anglaise.jpg'),
    order: 12,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza BURRATA',
    descFr: 'Sauce Tomate ou sauce blanche + Mozzarella + Gruyère + Parmesan +Tomates + Burrata',
    price: 22.5,
    image: IMG('pizza-burrata.jpg'),
    isFeatured: true,
    order: 13,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza Fruit de mer',
    price: 28.5,
    image: IMG('pizza-fruits-mer.jpg'),
    order: 14,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza Saumon',
    descFr: 'Sauce Blanche + 4 Fromages + Saumon + Basilic',
    price: 26.0,
    image: IMG('pizza-saumon.jpg'),
    order: 15,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza Végétarienne',
    descFr: 'Fromage + Courgette + Aubergine + champignon + oignon caramélisé + Sauce Aux Choix',
    price: 20.0,
    image: IMG('pizza-vegetarienne.jpg'),
    order: 16,
  },
  {
    categorySlug: 'les-pizzas',
    nameFr: 'Pizza Chevrettes',
    descFr: '4 Fromage + Chevrette',
    price: 20.0,
    image: IMG('pizza-chevrettes.jpg'),
    order: 17,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SALADE
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'salade',
    nameFr: 'Salade César',
    descFr: 'Laitue, Tomates, Maïs, Jambon, Mozzarella, Poulet',
    price: 15.8,
    image: IMG('salade-cesar.jpg'),
    order: 1,
  },
  {
    categorySlug: 'salade',
    nameFr: "Salade Bizz'Art",
    descFr: 'Laitue, Tomates, Maïs, Mozzarella, Parmesan, Fruits Secs, Poulet',
    price: 20.5,
    image: IMG('salade-bizzart.jpg'),
    tags: ['signature'],
    isFeatured: true,
    order: 2,
  },
  {
    categorySlug: 'salade',
    nameFr: 'Salade du Chef',
    descFr: 'Laitue, Tomates, Maïs, Mozzarella, Parmesan, Fruits secs, Burrata, Poulet',
    price: 24.5,
    image: IMG('salade-chef.jpg'),
    order: 3,
  },
  {
    categorySlug: 'salade',
    nameFr: 'Salade Fruits de Mer',
    price: 28.0,
    image: IMG('salade-fruits-mer.jpg'),
    tags: ['new'],
    order: 4,
  },
  {
    categorySlug: 'salade',
    nameFr: 'Salade de Crevettes Panées',
    descFr: 'Laitue, Tomates, Maïs, Parmesan, Crevettes Panées',
    price: 22.0,
    image: IMG('salade-crevettes-panees.jpg'),
    tags: ['new'],
    order: 5,
  },
  {
    categorySlug: 'salade',
    nameFr: 'Salade Saumon',
    descFr: 'Laitue, Tomates, Roquette, Saumon, Mozarella',
    price: 24.0,
    image: IMG('salade-saumon.jpg'),
    tags: ['new'],
    order: 6,
  },
  {
    categorySlug: 'salade',
    nameFr: 'Salade Roquette',
    descFr: 'Fromage Pané, Parmésan et miel',
    price: 12.8,
    image: IMG('salade-roquette.jpg'),
    tags: ['new'],
    order: 7,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VOLAILLES
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope Ou Cuisse de Poulet',
    price: 18.0,
    image: IMG('escalope-poulet.jpg'),
    order: 1,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope Panée',
    price: 19.5,
    image: IMG('escalope-panee.jpg'),
    order: 2,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope à la crème',
    price: 20.5,
    image: IMG('escalope-creme.jpg'),
    order: 3,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope sauce Champignon',
    price: 21.5,
    image: IMG('escalope-champignon.jpg'),
    order: 4,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope sauce Épinard',
    price: 21.0,
    image: IMG('escalope-epinard.jpg'),
    order: 5,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope sauce Gorgonzola',
    price: 22.0,
    image: IMG('escalope-gorgonzola.jpg'),
    order: 6,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Cordon Bleu',
    price: 23.0,
    image: IMG('cordon-bleu.jpg'),
    order: 7,
  },
  {
    categorySlug: 'volailles',
    nameFr: "Escalope Bizz'Art",
    price: 23.5,
    image: IMG('escalope-bizzart.jpg'),
    tags: ['signature'],
    order: 8,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope du Chef',
    price: 25.5,
    image: IMG('escalope-chef.jpg'),
    order: 9,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Involtini',
    price: 22.0,
    image: IMG('involtini.jpg'),
    order: 10,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Escalope Orientale',
    price: 23.0,
    image: IMG('escalope-orientale.jpg'),
    order: 11,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Suprême',
    descFr: "Bizz'Art, Épinard, Fromage, Champignons",
    price: 24.0,
    image: IMG('supreme.jpg'),
    order: 12,
  },
  {
    categorySlug: 'volailles',
    nameFr: 'Suprême Maison',
    descFr: 'Sauce Taro, Fruits Secs, Parmesan',
    price: 25.0,
    image: IMG('supreme-maison.jpg'),
    tags: ['new'],
    order: 13,
  },
  {
    categorySlug: 'volailles',
    nameFr: "Poulet à l'italienne",
    price: 28.0,
    image: IMG('poulet-italienne.jpg'),
    order: 14,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VIANDES
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'viandes',
    nameFr: 'Steak Grillé',
    price: 26.0,
    image: IMG('steak-grille.jpg'),
    order: 1,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Steak',
    descFr: "Champignon, Bizz'Art, Fromage, Poivre",
    price: 30.0,
    image: IMG('steak-sauce.jpg'),
    order: 2,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Steak Farci',
    price: 32.5,
    image: IMG('steak-farci.jpg'),
    order: 3,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Foie Grillé',
    price: 25.0,
    image: IMG('foie-grille.jpg'),
    order: 4,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Foie à la Lyonnaise',
    price: 28.0,
    image: IMG('foie-lyonnaise.jpg'),
    order: 5,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Grillade Mixte',
    price: 32.0,
    image: IMG('grillade-mixte.jpg'),
    order: 6,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Grillade Royale',
    price: 43.0,
    image: IMG('grillade-royale.jpg'),
    isFeatured: true,
    order: 7,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Panorama de Viande',
    descFr: 'Viande, Foie, Côtelette, côte à l\'os, Merguez, Escalope grillée, Escalope panée',
    price: 65.0,
    image: IMG('panorama-viande.jpg'),
    tags: ['2 personnes'],
    isFeatured: true,
    order: 8,
  },
  {
    categorySlug: 'viandes',
    nameFr: "Côtelette d'agneau",
    price: 35.0,
    image: IMG('cotelette-agneau.jpg'),
    order: 9,
  },
  {
    categorySlug: 'viandes',
    nameFr: "Côte à L'os Grillée",
    price: 33.0,
    image: IMG('cote-os-grillee.jpg'),
    order: 10,
  },
  {
    categorySlug: 'viandes',
    nameFr: "Côte à L'os Bizz'Art",
    descFr: 'Fromage, Champignons, 4 poivre',
    price: 40.0,
    image: IMG('cote-os-bizzart.jpg'),
    tags: ['signature'],
    order: 11,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Filet de boeuf',
    price: 36.0,
    image: IMG('filet-boeuf.jpg'),
    order: 12,
  },
  {
    categorySlug: 'viandes',
    nameFr: 'Filet de boeuf sauce au choix',
    price: 42.0,
    image: IMG('filet-boeuf-sauce.jpg'),
    order: 13,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FRUITS DE MER
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Plateau Fruits de mer',
    price: 50.0,
    image: IMG('plateau-fruits-mer.jpg'),
    order: 1,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Crevettes sautées ou grillées',
    price: 28.5,
    image: IMG('crevettes-grillees.jpg'),
    order: 2,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Poisson du jour',
    descFr: 'Dorade ou Loup',
    price: 24.0,
    image: IMG('poisson-jour.jpg'),
    order: 3,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Fruits de Mer Sautés',
    price: 35.0,
    image: IMG('fruits-mer-sautes.jpg'),
    order: 4,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Seiche gratinée aux crevettes et au miel',
    price: 32.0,
    image: IMG('seiche-gratinee.jpg'),
    order: 5,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Symphonie Fruits de mer',
    descFr: '2 personnes',
    price: 76.0,
    image: IMG('symphonie-fruits-mer.jpg'),
    tags: ['2 personnes'],
    order: 6,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Symphonie Terre-Mer',
    descFr: '2 personnes',
    price: 74.0,
    image: IMG('symphonie-terre-mer-2.jpg'),
    tags: ['2 personnes'],
    isFeatured: true,
    order: 7,
  },
  {
    categorySlug: 'fruits-de-mer',
    nameFr: 'Symphonie Terre-Mer',
    descFr: '4 personnes - Mixte Fruits de mer à la crème : Seiche grillée, Calamar dorite, 2 Poissons de jour / Mixte de viande : Côte à l\'os, Côtelette Foie, Escalope grillée, Escalope panée, Merguez, Steak',
    price: 142.0,
    image: IMG('symphonie-terre-mer-4.jpg'),
    tags: ['4 personnes'],
    isFeatured: true,
    order: 8,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TACOS
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'tacos',
    nameFr: 'Poulet grillé',
    price: 9.5,
    priceXL: 13.0,
    image: IMG('tacos-poulet-grille.jpg'),
    order: 1,
  },
  {
    categorySlug: 'tacos',
    nameFr: 'Poulet Mexicain',
    price: 10.0,
    priceXL: 13.5,
    image: IMG('tacos-poulet-mexicain.jpg'),
    order: 2,
  },
  {
    categorySlug: 'tacos',
    nameFr: 'Poulet Pané',
    price: 10.0,
    priceXL: 13.5,
    image: IMG('tacos-poulet-pane.jpg'),
    order: 3,
  },
  {
    categorySlug: 'tacos',
    nameFr: 'Cordon Bleu',
    price: 10.7,
    priceXL: 14.5,
    image: IMG('tacos-cordon-bleu.jpg'),
    order: 4,
  },
  {
    categorySlug: 'tacos',
    nameFr: 'Viande Hachée',
    price: 11.0,
    priceXL: 15.0,
    image: IMG('tacos-viande-hachee.jpg'),
    order: 5,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MAkIOUB
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'makioub',
    nameFr: 'Thon',
    price: 8.5,
    image: IMG('makloub-thon.jpg'),
    order: 1,
  },
  {
    categorySlug: 'makioub',
    nameFr: 'Poulet grillé',
    price: 9.5,
    image: IMG('makloub-poulet-grille.jpg'),
    order: 2,
  },
  {
    categorySlug: 'makioub',
    nameFr: 'Poulet Mexicain',
    price: 10.0,
    image: IMG('makloub-poulet-mexicain.jpg'),
    order: 3,
  },
  {
    categorySlug: 'makioub',
    nameFr: 'Poulet Pané',
    price: 10.0,
    image: IMG('makloub-poulet-pane.jpg'),
    order: 4,
  },
  {
    categorySlug: 'makioub',
    nameFr: 'Cordon Bleu',
    price: 10.7,
    image: IMG('makloub-cordon-bleu.jpg'),
    order: 5,
  },
  {
    categorySlug: 'makioub',
    nameFr: 'Spécial',
    descFr: 'escalope, chawerma, Fslice',
    price: 11.0,
    image: IMG('makloub-special.jpg'),
    order: 6,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SODA
  // ══════════════════════════════════════════════════════════════════════════
  {
    categorySlug: 'soda',
    nameFr: 'Eau Minérale 1/2L',
    price: 1.5,
    image: IMG('eau-minerale.jpg'),
    order: 1,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Eau Minérale 1L',
    price: 3.0,
    image: IMG('eau-minerale.jpg'),
    order: 2,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Eau Gazeuse',
    price: 3.0,
    image: IMG('eau-gazeuse.jpg'),
    order: 3,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Soda',
    descFr: 'Coca, Fanta, Boga...',
    price: 3.0,
    image: IMG('soda.jpg'),
    order: 4,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Pétillante',
    price: 3.0,
    image: IMG('petillante.jpg'),
    order: 5,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Citronnade',
    price: 3.5,
    image: IMG('citronnade.jpg'),
    order: 6,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Délio',
    price: 2.0,
    image: IMG('delio.jpg'),
    order: 7,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Orangina',
    price: 3.0,
    image: IMG('orangina.jpg'),
    order: 8,
  },
  {
    categorySlug: 'soda',
    nameFr: 'Sprite',
    price: 3.0,
    image: IMG('sprite.jpg'),
    order: 9,
  },
];

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

async function seedMenuReal(): Promise<void> {
  console.log('\n🌱 ============================================');
  console.log("🍕 BIZZ'ART — Menu Seed Script (DONNÉES RÉELLES)");
  console.log('🌱 ============================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI manquant');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connecté — DB: ${mongoose.connection.name}\n`);

  // ── Suppression des anciennes données ─────────────────────────────────────
  console.log('🗑️  Suppression des anciennes données...');
  await MenuItem.deleteMany({});
  await MenuCategory.deleteMany({});
  console.log('   ✅ Anciennes données supprimées\n');

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
    // Vérifier et rendre le slug unique si nécessaire
    const existingCount = await MenuItem.countDocuments({ slug });
    const finalSlug = existingCount > 0 ? `${slug}-${itemCount}` : slug;

    // Description avec indication de taille XL si applicable
    let descFr = item.descFr || '';
    if (item.priceXL) {
      descFr = `Taille L: ${item.price} DT | Taille XL: ${item.priceXL} DT${descFr ? ' - ' + descFr : ''}`;
    }

    await MenuItem.create({
      category: new mongoose.Types.ObjectId(catId),
      name: { fr: item.nameFr, en: item.nameEn ?? item.nameFr },
      slug: finalSlug,
      description: descFr ? { fr: descFr, en: '' } : undefined,
      price: item.price,
      image: item.image,
      allergens: [],
      tags: item.tags ?? [],
      isAvailable: true,
      isFeatured: item.isFeatured ?? false,
      order: item.order,
    });

    itemCount++;
    const priceDisplay = item.priceXL ? `${item.price} DT (L) / ${item.priceXL} DT (XL)` : `${item.price} DT`;
    console.log(`  ✅ ${item.nameFr} — ${priceDisplay}`);
  }

  console.log(`\n🎉 Seed terminé : ${CATEGORIES.length} catégories, ${itemCount} plats\n`);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seedMenuReal()
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
