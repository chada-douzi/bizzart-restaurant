// ─── Types ────────────────────────────────────────────────────────────────────

export type GalleryCategory = 'interior' | 'cuisine' | 'events' | 'atmosphere';

// NOTE: MenuItem, MenuCategory, SignatureDish and Review types have been removed.
// Menu data is now served by GET /api/menu/categories and /api/menu/items (MenuService).
// Reviews are served by GET /api/reviews (ReviewService).

export interface Experience {
  id: string;
  title: string;
  description: string;
  icon: 'cuisine' | 'art' | 'atmosphere' | 'experience';
}

export interface EventItem {
  id: string;
  date: string;
  title: string;
  description: string;
  time?: string;
  imageUrl?: string;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: GalleryCategory;
}

// ─── Static content (editorial — not served by API) ──────────────────────────

export const EXPERIENCES: Experience[] = [
  {
    id: 'cuisine',
    title: 'Cuisine',
    description:
      'Une table où la tradition méditerranéenne se réinvente avec précision, générosité et respect des produits.',
    icon: 'cuisine',
  },
  {
    id: 'art',
    title: 'Art',
    description:
      'Chaque assiette devient une composition visuelle, pensée comme une œuvre à partager autour de la table.',
    icon: 'art',
  },
  {
    id: 'atmosphere',
    title: 'Atmosphere',
    description:
      'Un cadre chaleureux et raffiné, où lumière, matières et musique composent une ambiance singulière.',
    icon: 'atmosphere',
  },
  {
    id: 'experience',
    title: 'Experience',
    description:
      "Plus qu'un repas, une invitation à ralentir, savourer et vivre un moment mémorable à BIZZ'ART.",
    icon: 'experience',
  },
];

// Events — editorial content (dates to be updated manually when real events are scheduled)
export const EVENTS: EventItem[] = [
  {
    id: '1',
    date: 'À venir',
    title: 'Live Music',
    description: "Une soirée musicale pour accompagner votre dîner dans une ambiance intimiste.",
  },
  {
    id: '2',
    date: 'À venir',
    title: 'Art Night',
    description: "Une rencontre entre gastronomie et expression artistique, au cœur du restaurant.",
  },
  {
    id: '3',
    date: 'À venir',
    title: 'Special Dinner',
    description: "Un menu dédié, pensé comme une expérience limitée et soigneusement orchestrée.",
  },
  {
    id: '4',
    date: 'Sur demande',
    title: 'Private Events',
    description: "Privatisez l'espace BIZZ'ART pour vos célébrations et moments privés.",
  },
];

// Gallery — real BIZZ'ART photography (local assets in public/images/gallery/)
export const GALLERY_IMAGES: GalleryImage[] = [
  {
    id: '1',
    src: '/images/gallery/plat-signature-gastro.jpg',
    alt: "Plat signature gastronimique BIZZ'ART — ravioli vert, crevette, assiette rose",
    category: 'cuisine',
  },
  {
    id: '2',
    src: '/images/gallery/pizza-oeuf-merguez.jpg',
    alt: "Pizza napolitaine BIZZ'ART — oeuf, merguez, poivrons verts",
    category: 'cuisine',
  },
  {
    id: '3',
    src: '/images/gallery/grillades-mixtes.jpg',
    alt: "Plateaux de grillades mixtes BIZZ'ART — agneau, poulet, merguez",
    category: 'cuisine',
  },
  {
    id: '4',
    src: '/images/gallery/paella-fruits-mer.jpg',
    alt: "Paella fruits de mer BIZZ'ART — crevettes, moules, calamars",
    category: 'cuisine',
  },
  {
    id: '5',
    src: '/images/gallery/spaghetti-fruits-mer.jpg',
    alt: "Spaghetti fruits de mer sauce arrabiata BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '6',
    src: '/images/gallery/tagliatelles-burrata.jpg',
    alt: "Tagliatelles burrata amandes BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '7',
    src: '/images/gallery/steak-gratiné.jpg',
    alt: "Steak gratiné fromage fondu BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '8',
    src: '/images/gallery/emince-champignons.jpg',
    alt: "Émincé sauce champignons avec accompagnements BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '9',
    src: '/images/gallery/crevettes-poisson.jpg',
    alt: "Assiette crevettes grillées et filet de poisson BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '10',
    src: '/images/gallery/pizza-champignons.jpg',
    alt: "Pizza champignons poulet poivrons BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '11',
    src: '/images/gallery/plateau-grillades.jpg',
    alt: "Grand plateau grillades merguez agneau poulet BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '12',
    src: '/images/gallery/paella-noire.jpg',
    alt: "Paella royale dans poêle noire BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '13',
    src: '/images/gallery/pizza-thon.jpg',
    alt: "Pizza thon olives noires basilic BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '14',
    src: '/images/gallery/poulet-grille-herbes.jpg',
    alt: "Poulet grillé aux herbes avec accompagnements BIZZ'ART",
    category: 'cuisine',
  },
  {
    id: '15',
    src: '/images/gallery/grillade-mixte-salle.jpg',
    alt: "Grillade mixte servie en salle BIZZ'ART",
    category: 'atmosphere',
  },
];

export const GALLERY_FILTERS: { id: 'all' | GalleryCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'interior', label: 'Interior' },
  { id: 'cuisine', label: 'Cuisine' },
  { id: 'events', label: 'Events' },
  { id: 'atmosphere', label: 'Atmosphere' },
];

// ─── Image constants — real BIZZ'ART photography ─────────────────────────────

/** Fallback image for the hero (used when video is unavailable). */
export const HERO_IMAGE = '/images/hero/hero-fallback.jpg';

/** Poster frame shown while hero video loads. */
export const HERO_VIDEO_POSTER = '/images/hero/hero-poster.jpg';

/** Path to the hero background video (VID2 — gastronomic showcase). */
export const HERO_VIDEO_SRC = '/videos/hero-bg.mp4';

/** Path to the "Notre cuisine" video (VID1 — diversity showcase). */
export const KITCHEN_VIDEO_SRC = '/videos/kitchen.mp4';

/** Poster/fallback for the kitchen video section. */
export const KITCHEN_VIDEO_POSTER = '/images/hero/kitchen-poster.jpg';

export const ABOUT_IMAGE = '/images/gallery/grillades-mixtes.jpg';

export const PHILOSOPHY_IMAGE = '/images/gallery/plat-signature-gastro.jpg';

export const ATMOSPHERE_IMAGE = '/images/hero/symphonie-terre-mer.jpg';
