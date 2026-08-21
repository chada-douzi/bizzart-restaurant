import * as fs from 'fs';
import * as path from 'path';

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

interface ManifestItem {
  menuItemId: string;
  name: string;
  category: string;
  slug: string;
  expectedFile: string;
  currentImage: string | null;
  description: string;
  price: number;
}

function generateSlugFilename(slug: string): string {
  // Utiliser le slug MongoDB qui est déjà normalisé
  return `${slug}.jpg`;
}

function generateManifest() {
  console.log('📋 GÉNÉRATION DU MANIFEST PHOTOS MENU — BIZZ\'ART\n');

  // Lire l'audit complet
  const auditPath = path.join(__dirname, '../../menu-audit-complete.json');
  
  if (!fs.existsSync(auditPath)) {
    console.error('❌ Fichier d\'audit introuvable. Exécutez d\'abord audit-menu.ts');
    process.exit(1);
  }

  const auditData: MenuItemAudit[] = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
  
  console.log(`✅ ${auditData.length} plats chargés depuis l'audit\n`);

  // Générer le manifest
  const manifest: ManifestItem[] = auditData.map(item => ({
    menuItemId: item._id,
    name: item.name,
    category: item.categoryName,
    slug: item.slug,
    expectedFile: generateSlugFilename(item.slug),
    currentImage: item.image,
    description: item.description,
    price: item.price
  }));

  // Créer le dossier menu-images/
  const menuImagesDir = path.join(__dirname, '../../../menu-images');
  if (!fs.existsSync(menuImagesDir)) {
    fs.mkdirSync(menuImagesDir, { recursive: true });
    console.log(`✅ Dossier créé : ${menuImagesDir}\n`);
  } else {
    console.log(`✅ Dossier existant : ${menuImagesDir}\n`);
  }

  // Sauvegarder le manifest
  const manifestPath = path.join(menuImagesDir, 'menu-images-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✅ Manifest sauvegardé : ${manifestPath}\n`);

  // Créer un fichier README pour l'utilisateur
  const readmePath = path.join(menuImagesDir, 'README.md');
  const readmeContent = `# 📸 PHOTOS MENU BIZZ'ART

## Instructions

Ce dossier est conçu pour recevoir les **vraies photos** correspondant à chaque plat du menu.

### Comment ajouter les photos

1. **Nommez chaque photo selon le fichier attendu** dans le manifest \`menu-images-manifest.json\`
2. **Format accepté** : JPG, JPEG, PNG, WEBP
3. **Placez les photos directement dans ce dossier**

### Exemple

Pour le plat **"Pizza Margherita"**, ajoutez une photo nommée :
\`\`\`
pizza-margherita.jpg
\`\`\`

Pour le plat **"Spaghetti Bolognaise"**, ajoutez :
\`\`\`
spaghetti-bolognaise.jpg
\`\`\`

### Liste des ${manifest.length} photos attendues

${manifest.map((item, index) => `${(index + 1).toString().padStart(3, ' ')}. **${item.expectedFile}** → ${item.name} (${item.category})`).join('\n')}

---

## ⚠️ IMPORTANT

- **NE PAS MODIFIER** le nom des fichiers attendus
- **NE PAS CRÉER** de sous-dossiers
- **UNE PHOTO = UN PLAT** (pas de réutilisation)
- Les extensions acceptées : .jpg, .jpeg, .png, .webp

Une fois les photos ajoutées, exécutez le script d'upload :

\`\`\`bash
npm run upload-menu-photos
\`\`\`

## État actuel

📂 Photos présentes : **0 / ${manifest.length}**
`;

  fs.writeFileSync(readmePath, readmeContent, 'utf-8');
  console.log(`✅ README créé : ${readmePath}\n`);

  // Afficher un résumé par catégorie
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📂 PHOTOS ATTENDUES PAR CATÉGORIE\n');

  const byCategory = new Map<string, ManifestItem[]>();
  manifest.forEach(item => {
    const items = byCategory.get(item.category) || [];
    items.push(item);
    byCategory.set(item.category, items);
  });

  for (const [category, items] of byCategory) {
    console.log(`\n${category} (${items.length} photo(s))`);
    console.log('─'.repeat(60));
    items.forEach((item, index) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${item.expectedFile.padEnd(35)} → ${item.name}`);
    });
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');
  console.log('✅ MANIFEST GÉNÉRÉ AVEC SUCCÈS\n');
  console.log(`📁 Placez vos ${manifest.length} photos dans :\n`);
  console.log(`   ${menuImagesDir}\n`);
  console.log('Nommez chaque photo selon le fichier attendu dans le manifest.\n');
  console.log('════════════════════════════════════════════════════════════════\n');
}

generateManifest();
