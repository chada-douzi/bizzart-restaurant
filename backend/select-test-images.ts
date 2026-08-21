/**
 * PHASE 3 - SELECTION 10 IMAGES TEST
 * 
 * Selection intelligente de 10 plats representatifs
 * pour valider la qualite visuelle avant generation massive
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditData {
  audit: Array<{
    category: string;
    dish: string;
    price: number;
    currentImage: string;
  }>;
  duplicates: Array<{
    url: string;
    dishes: string[];
  }>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isAmbiguous(dish: string): boolean {
  return (
    (dish.includes('du Chef') && !dish.includes('Salade')) ||
    dish.includes('du jour') ||
    dish.includes('Symphonie Terre-Mer')
  );
}

function generatePrompt(dish: string, category: string): string {
  const baseStyle = 'Professional culinary food photography, photorealistic rendering, premium quality, natural soft lighting, premium restaurant lighting, 3/4 angle view slightly from above, elegant presentation, subtle blurred background, natural depth of field, realistic food textures, realistic portions, natural colors, centered composition, modern restaurant menu style, no text, no logo, no watermark, no people, no commercial packaging, no advertising, no artificial elements';
  
  const dishLower = dish.toLowerCase();
  let specificDesc = '';
  
  // Descriptions specifiques basees sur le nom exact
  if (dishLower.includes('pizza thon')) {
    specificDesc = 'Italian tuna pizza with tomato sauce, mozzarella cheese, tuna chunks, black olives, served on elegant plate';
  } else if (dishLower.includes('pizza margherita')) {
    specificDesc = 'Classic Margherita pizza with red tomato sauce, fresh mozzarella cheese, fresh basil leaves, served on elegant plate';
  } else if (dishLower.includes('pizza') && dishLower.includes('4 fromages') && dishLower.includes('blanche')) {
    specificDesc = 'Four cheese pizza with white cream sauce, mozzarella, gorgonzola, parmesan, goat cheese, served on elegant plate';
  } else if (dishLower.includes('pates bolognaise')) {
    specificDesc = 'Spaghetti Bolognaise with rich meat sauce, grated parmesan cheese, in elegant bowl';
  } else if (dishLower.includes('pates') && dishLower.includes('arrabiata')) {
    specificDesc = 'Penne Arrabiata with spicy red tomato sauce, garlic, red chili peppers, fresh parsley, in elegant bowl';
  } else if (dishLower.includes('ravioli') && dishLower.includes('saumon')) {
    specificDesc = 'Salmon ravioli with cream sauce, fresh dill, grated parmesan, in elegant bowl';
  } else if (dishLower.includes('salade') && dishLower.includes('cesar')) {
    specificDesc = 'Caesar salad with romaine lettuce, croutons, parmesan shavings, Caesar dressing, grilled chicken pieces, in elegant bowl';
  } else if (dishLower.includes('salade') && dishLower.includes('roquette')) {
    specificDesc = 'Arugula salad with fresh arugula leaves, cherry tomatoes, parmesan shavings, balsamic dressing, in elegant bowl';
  } else if (dishLower.includes('escalope') && dishLower.includes('panee')) {
    specificDesc = 'Breaded chicken escalope, golden crispy coating, served with french fries and lemon wedge on elegant plate';
  } else if (dishLower.includes('escalope') && dishLower.includes('champignon')) {
    specificDesc = 'Chicken escalope with mushroom cream sauce, fresh mushrooms, served with vegetables on elegant plate';
  } else if (dishLower.includes('escalope') && dishLower.includes('gorgonzola')) {
    specificDesc = 'Chicken escalope with gorgonzola blue cheese cream sauce, served with vegetables on elegant plate';
  } else if (dishLower.includes('steak grille')) {
    specificDesc = 'Grilled beef steak with visible grill marks, served with french fries and fresh vegetables on elegant plate';
  } else if (dishLower.includes('steak farci')) {
    specificDesc = 'Stuffed beef steak with cheese and herb filling, served with sauce, french fries and vegetables on elegant plate';
  } else if (dishLower.includes('cotelette') && dishLower.includes('agneau')) {
    specificDesc = 'Grilled lamb chops with herbs, served with grilled vegetables and roasted potatoes on elegant plate';
  } else if (dishLower.includes('filet de boeuf') && !dishLower.includes('sauce au choix')) {
    specificDesc = 'Premium beef fillet tenderloin, perfectly cooked, served with vegetables and sauce on elegant plate';
  } else if (dishLower.includes('crevettes sautees') || dishLower.includes('crevettes grillees')) {
    specificDesc = 'Sauteed or grilled shrimp with garlic and herbs, served with vegetables on elegant plate';
  } else if (dishLower.includes('plateau fruits de mer')) {
    specificDesc = 'Elegant seafood platter with oysters, shrimp, mussels, crab, presented on ice bed on elegant serving plate';
  } else if (dishLower.includes('paella') && dishLower.includes('royale')) {
    specificDesc = 'Royal Paella in traditional pan with saffron rice, seafood, chicken, mussels, shrimp, peas, red bell peppers';
  } else if (dishLower.includes('risotto') && dishLower.includes('poulet') && dishLower.includes('champignon')) {
    specificDesc = 'Chicken and mushroom risotto with creamy arborio rice, grilled chicken pieces, fresh mushrooms, grated parmesan, in elegant bowl';
  } else if (category === 'Tacos' || category === 'MAkIOUB') {
    if (dishLower.includes('poulet grille')) {
      specificDesc = 'Taco or Makloub wrap with grilled chicken, fresh vegetables, sauce, wrapped in tortilla, served on plate';
    } else if (dishLower.includes('viande hachee')) {
      specificDesc = 'Taco or Makloub wrap with seasoned ground beef, fresh vegetables, sauce, wrapped in tortilla, served on plate';
    } else if (dishLower === 'thon') {
      specificDesc = 'Makloub wrap with tuna, fresh vegetables, sauce, wrapped in tortilla, served on plate';
    }
  } else if (dishLower.includes('citronnade')) {
    specificDesc = 'Fresh lemonade in tall glass with ice cubes, lemon slices, fresh mint leaves, on clean background';
  } else if (dishLower.includes('orangina')) {
    specificDesc = 'Orangina bottle with glass filled with ice and orange beverage, on clean background';
  }
  
  // Fallback si pas de description specifique
  if (!specificDesc) {
    specificDesc = `${dish} dish elegantly presented`;
  }
  
  return `${specificDesc}. ${baseStyle}`;
}

async function selectTestImages() {
  console.log('\n=== PHASE 3 - SELECTION 10 IMAGES TEST ===\n');
  
  try {
    // Lecture audit
    const auditPath = path.join(__dirname, 'audit-reports', 'MENU-AUDIT-2026-08-19.json');
    const auditData: AuditData = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
    
    // Creer map des doublons
    const duplicateMap = new Map<string, string[]>();
    auditData.duplicates.forEach(dup => {
      dup.dishes.forEach(dish => {
        duplicateMap.set(dish, dup.dishes.filter(d => d !== dish));
      });
    });
    
    // Filtrer les plats eligibles (doublons, non ambigus)
    const eligibleDishes = auditData.audit.filter(item => {
      const isDuplicate = duplicateMap.has(item.dish);
      const ambiguous = isAmbiguous(item.dish);
      return isDuplicate && !ambiguous;
    });
    
    console.log(`Plats eligibles (doublons non ambigus): ${eligibleDishes.length}`);
    
    // Selection intelligente: 10 plats representatifs
    const selected: typeof eligibleDishes = [];
    
    // Categoriser les plats
    const byCategory = new Map<string, typeof eligibleDishes>();
    eligibleDishes.forEach(dish => {
      if (!byCategory.has(dish.category)) {
        byCategory.set(dish.category, []);
      }
      byCategory.get(dish.category)!.push(dish);
    });
    
    // Selection: 10 plats representatifs
    const priorities = [
      { category: 'Les Pizzas', count: 2 },
      { category: 'Pates', count: 2 },
      { category: 'Volailles', count: 2 },
      { category: 'Viandes', count: 1 },
      { category: 'Fruits de mer', count: 1 },
      { category: 'Salade', count: 1 },
      { category: 'Tacos', count: 1 }
    ];
    
    priorities.forEach(({ category, count }) => {
      const dishes = byCategory.get(category) || [];
      for (let i = 0; i < Math.min(count, dishes.length); i++) {
        selected.push(dishes[i]);
      }
    });
    
    // Si moins de 10, ajouter des plats supplementaires
    while (selected.length < 10 && eligibleDishes.length > selected.length) {
      for (const [cat, dishes] of byCategory.entries()) {
        if (selected.length >= 10) break;
        const alreadySelected = selected.filter(s => s.category === cat).length;
        if (alreadySelected < dishes.length) {
          const nextDish = dishes[alreadySelected];
          if (!selected.includes(nextDish)) {
            selected.push(nextDish);
          }
        }
      }
    }
    
    console.log(`\n=== 10 PLATS SELECTIONNES POUR TEST ===\n`);
    
    const testList: Array<{
      number: number;
      category: string;
      dish: string;
      price: number;
      filename: string;
      prompt: string;
      sharedWith: string[];
    }> = [];
    
    selected.forEach((item, index) => {
      const filename = `${slugify(item.category)}-${slugify(item.dish)}.webp`;
      const prompt = generatePrompt(item.dish, item.category);
      const sharedWith = duplicateMap.get(item.dish) || [];
      
      testList.push({
        number: index + 1,
        category: item.category,
        dish: item.dish,
        price: item.price,
        filename,
        prompt,
        sharedWith
      });
      
      console.log(`${index + 1}. ${item.category} — ${item.dish}`);
    });
    
    // Generer rapport MD
    const outputDir = path.join(__dirname, 'visual-generation-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const reportPath = path.join(outputDir, 'PHASE-3-TEST-SELECTION.md');
    
    let report = `# PHASE 3 — SELECTION 10 IMAGES TEST\n\n`;
    report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    report += `**Objectif:** Valider qualite visuelle et coherence style avant generation massive\n\n`;
    report += `---\n\n`;
    
    report += `## IMPORTANT\n\n`;
    report += `**CAS AMBIGUS EXCLUS:**\n`;
    report += `Les 5 plats suivants NE SONT PAS dans cette selection:\n`;
    report += `- Pates du Chef\n`;
    report += `- Salade du Chef\n`;
    report += `- Escalope du Chef\n`;
    report += `- Poisson du jour\n`;
    report += `- Symphonie Terre-Mer\n\n`;
    report += `Ces plats restent en statut **AMBIGUOUS / MANUAL_REVIEW**\n\n`;
    report += `---\n\n`;
    
    report += `## 10 PLATS SELECTIONNES\n\n`;
    report += `**Echantillon representatif de plusieurs categories:**\n\n`;
    
    testList.forEach(item => {
      report += `### ${item.number}. ${item.dish}\n\n`;
      report += `- **Categorie:** ${item.category}\n`;
      report += `- **Prix:** ${item.price} DT\n`;
      report += `- **Filename:** \`${item.filename}\`\n`;
      
      if (item.sharedWith.length > 0) {
        report += `- **Image actuellement partagee avec:** ${item.sharedWith.join(', ')}\n`;
      }
      
      report += `\n**Prompt de generation:**\n\n\`\`\`\n${item.prompt}\n\`\`\`\n\n`;
      report += `---\n\n`;
    });
    
    report += `## DIRECTION ARTISTIQUE\n\n`;
    report += `**Style unifie pour les 10 images test:**\n\n`;
    report += `- Photographie culinaire photorealiste\n`;
    report += `- Rendu premium haute qualite\n`;
    report += `- Lumiere naturelle douce\n`;
    report += `- Angle 3/4 legerement au-dessus\n`;
    report += `- Presentation elegante adaptee au plat\n`;
    report += `- Arriere-plan sobre legerement flou\n`;
    report += `- Profondeur de champ naturelle\n`;
    report += `- Textures alimentaires realistes\n`;
    report += `- Proportions realistes\n`;
    report += `- Couleurs naturelles\n`;
    report += `- Composition centree\n`;
    report += `- Aucun texte, logo, watermark, personne, publicite\n\n`;
    
    report += `**IMPORTANT:** La vaisselle et presentation sont adaptees naturellement au type de plat (assiette, bol, verre, etc.)\n\n`;
    
    report += `---\n\n`;
    report += `## PROCHAINES ETAPES\n\n`;
    report += `1. Generer les 10 images avec un generateur IA (DALL-E, Midjourney, etc.)\n`;
    report += `2. Evaluer la qualite visuelle de chaque image\n`;
    report += `3. Verifier la coherence du style entre les 10 images\n`;
    report += `4. Creer le rapport PHASE-3-TEST-RESULTS.md avec evaluation\n`;
    report += `5. **ARRETER** - Ne pas generer les 83 images restantes\n`;
    report += `6. Attendre validation utilisateur\n\n`;
    
    report += `**NE PAS:**\n`;
    report += `- Generer les 83 images restantes\n`;
    report += `- Generer les 5 cas ambigus\n`;
    report += `- Uploader sur Cloudinary\n`;
    report += `- Modifier MongoDB\n`;
    report += `- Modifier le frontend\n\n`;
    
    report += `---\n\n`;
    report += `**STATUT:** Selection terminee - Pret pour generation test\n`;
    
    fs.writeFileSync(reportPath, report);
    
    // Generer aussi le fichier JSON pour automatisation eventuelle
    const jsonPath = path.join(outputDir, 'test-selection.json');
    fs.writeFileSync(jsonPath, JSON.stringify(testList, null, 2));
    
    console.log(`\nRapport genere: ${path.basename(reportPath)}`);
    console.log(`Donnees JSON: ${path.basename(jsonPath)}`);
    console.log(`\n=== SELECTION TERMINEE ===\n`);
    console.log(`Plats selectionnes: ${testList.length}`);
    console.log(`Categories representees: ${new Set(testList.map(t => t.category)).size}`);
    console.log(`\nPret pour generation test\n`);
    
  } catch (error: any) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

selectTestImages();
