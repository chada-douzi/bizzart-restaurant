/**
 * PHASE 2.5 - PLAN DE GENERATION DETAILLE
 * 
 * Analyse precise des 98 plats pour determiner exactement
 * quels visuels doivent etre generes
 * 
 * MODE LECTURE SEULE - AUCUNE MODIFICATION
 */

import * as fs from 'fs';
import * as path from 'path';

interface AuditData {
  metadata: any;
  categories: any[];
  duplicates: Array<{
    url: string;
    dishes: string[];
    count: number;
  }>;
  audit: Array<{
    category: string;
    dish: string;
    price: number;
    currentImage: string;
    imageStatus: string;
    action: string;
    notes: string;
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

function generatePromptForDish(dish: string, category: string): string {
  const baseStyle = 'Professional culinary food photography, photorealistic, high quality, natural soft lighting, premium restaurant lighting, 3/4 angle view slightly from above, elegant white plate, realistic gourmet presentation, subtle blurred background, natural depth of field, realistic textures, realistic portions, natural colors, centered composition, modern restaurant menu image, no text, no logo, no watermark, no people, no commercial packaging, no advertising, no artificial elements';
  
  const dishLower = dish.toLowerCase();
  let specificDesc = '';
  
  // Pizzas
  if (dishLower.includes('pizza margherita')) {
    specificDesc = 'Classic Margherita pizza with tomato sauce, fresh mozzarella cheese, fresh basil leaves';
  } else if (dishLower.includes('pizza thon')) {
    specificDesc = 'Italian pizza with tuna, tomato sauce, mozzarella cheese, black olives';
  } else if (dishLower.includes('pizza 4 fromages') && dishLower.includes('tomate')) {
    specificDesc = 'Four cheese pizza with red tomato sauce base, mozzarella, gorgonzola, parmesan, goat cheese';
  } else if (dishLower.includes('pizza 4 fromages') && dishLower.includes('blanche')) {
    specificDesc = 'Four cheese pizza with white cream sauce, mozzarella, gorgonzola, parmesan, goat cheese';
  } else if (dishLower === 'reine') {
    specificDesc = 'Queen pizza with tomato sauce, mozzarella, ham, mushrooms';
  } else if (dishLower === 'piquante') {
    specificDesc = 'Spicy pizza with tomato sauce, mozzarella, spicy salami, hot peppers';
  } else if (dishLower === 'chicken' && category === 'Les Pizzas') {
    specificDesc = 'Chicken pizza with grilled chicken pieces, tomato sauce, mozzarella, bell peppers';
  } else if (dishLower === 'napolitaine') {
    specificDesc = 'Napolitaine pizza with tomato sauce, mozzarella, anchovies, capers, black olives';
  } else if (dishLower === 'pepperoni') {
    specificDesc = 'Pepperoni pizza with tomato sauce, mozzarella, pepperoni slices';
  } else if (dishLower === '4 saisons') {
    specificDesc = 'Four seasons pizza divided in quarters with mushrooms, ham, artichokes, olives, tomato sauce, mozzarella';
  } else if (dishLower.includes('pizza') && (dishLower.includes("bizz'art") || dishLower.includes('bizzart'))) {
    specificDesc = 'Signature Bizz Art premium pizza with tomato sauce, mozzarella, fresh premium ingredients';
  } else if (dishLower.includes('pizza') && dishLower.includes('anglaise')) {
    specificDesc = 'English-style pizza with bacon, egg, tomato sauce, mozzarella';
  } else if (dishLower.includes('pizza') && dishLower.includes('burrata')) {
    specificDesc = 'Pizza with creamy burrata cheese in the center, tomato sauce, cherry tomatoes, fresh arugula';
  } else if (dishLower.includes('pizza') && dishLower.includes('fruit de mer')) {
    specificDesc = 'Seafood pizza with shrimp, mussels, calamari, tomato sauce, mozzarella';
  } else if (dishLower.includes('pizza') && dishLower.includes('saumon')) {
    specificDesc = 'Salmon pizza with smoked salmon slices, white cream sauce, mozzarella, fresh dill';
  } else if (dishLower.includes('pizza') && dishLower.includes('vegetarienne')) {
    specificDesc = 'Vegetarian pizza with grilled vegetables including zucchini, eggplant, bell peppers, tomato sauce, mozzarella';
  } else if (dishLower.includes('pizza') && dishLower.includes('chevrettes')) {
    specificDesc = 'Pizza topped with shrimp, tomato sauce, mozzarella, garlic';
  }
  
  // Pates
  else if (dishLower.includes('pates') && (dishLower.includes("bizz'art") || dishLower.includes('bizzart'))) {
    specificDesc = 'Signature Bizz Art pasta with white cream sauce, shrimp, mussels, spinach in elegant bowl';
  } else if (dishLower.includes('pates') && dishLower.includes('bolognaise')) {
    specificDesc = 'Spaghetti Bolognaise with rich meat sauce, grated parmesan cheese';
  } else if (dishLower.includes('pates') && dishLower.includes('arrabiata')) {
    specificDesc = 'Penne Arrabiata with spicy red tomato sauce, garlic, red chili peppers, fresh parsley';
  } else if (dishLower.includes('pates') && dishLower.includes('maison')) {
    specificDesc = 'Homemade pasta with tomato sauce, fresh herbs, grated parmesan';
  } else if (dishLower.includes('pates') && dishLower.includes('italienne')) {
    specificDesc = 'Italian-style pasta with tomato sauce, fresh basil, mozzarella, cherry tomatoes';
  } else if (dishLower.includes('pates') && dishLower.includes('fruits de mer')) {
    specificDesc = 'Seafood pasta with shrimp, mussels, calamari, white wine garlic sauce';
  } else if (dishLower.includes('ravioli') && dishLower.includes('saumon')) {
    specificDesc = 'Salmon ravioli with cream sauce, fresh dill, grated parmesan';
  } else if (dishLower.includes('ravioli') && dishLower.includes('crevette')) {
    specificDesc = 'Shrimp ravioli with cream sauce, fresh herbs, grated parmesan';
  } else if (dishLower.includes('ravioli') && dishLower.includes('viande')) {
    specificDesc = 'Meat ravioli with tomato sauce, grated parmesan, fresh basil';
  } else if (dishLower.includes('pates') && dishLower.includes('pesto')) {
    specificDesc = 'Pasta with fresh green basil pesto sauce, pine nuts, grated parmesan, cherry tomatoes';
  } else if (dishLower.includes('lasagne') && dishLower.includes('bolognaise')) {
    specificDesc = 'Classic Lasagne Bolognaise with layers of pasta, meat sauce, bechamel, grated parmesan';
  } else if (dishLower.includes('lasagne') && dishLower.includes('fruits de mer')) {
    specificDesc = 'Seafood lasagne with shrimp, fish, cream sauce, layers of pasta';
  }
  
  // Plats Espagnol
  else if (dishLower.includes('paella') && dishLower.includes('royale')) {
    specificDesc = 'Royal Paella in traditional pan with saffron rice, seafood, chicken, mussels, shrimp, peas, red bell peppers';
  } else if (dishLower.includes('paella') && dishLower.includes('1 personne')) {
    specificDesc = 'Individual Paella portion with saffron rice, mixed seafood, chicken, vegetables';
  } else if (dishLower.includes('risotto') && (dishLower.includes("bizz'art") || dishLower.includes('bizzart'))) {
    specificDesc = 'Signature Bizz Art risotto with creamy rice, premium ingredients, grated parmesan';
  } else if (dishLower.includes('risotto') && dishLower.includes('poulet') && dishLower.includes('champignon')) {
    specificDesc = 'Chicken and mushroom risotto with creamy arborio rice, grilled chicken pieces, fresh mushrooms, grated parmesan';
  } else if (dishLower.includes('gratin') && dishLower.includes('poulet')) {
    specificDesc = 'Chicken gratin with bechamel sauce, melted cheese, golden crust';
  } else if (dishLower.includes('gratin') && dishLower.includes('fruits de mer')) {
    specificDesc = 'Seafood gratin with shrimp, fish, cream sauce, melted cheese, golden crust';
  }
  
  // Salades
  else if (dishLower.includes('salade') && dishLower.includes('cesar')) {
    specificDesc = 'Caesar salad with romaine lettuce, croutons, parmesan shavings, Caesar dressing, grilled chicken';
  } else if (dishLower.includes('salade') && (dishLower.includes("bizz'art") || dishLower.includes('bizzart'))) {
    specificDesc = 'Signature Bizz Art salad with mixed fresh greens, premium ingredients, colorful vegetables, dressing';
  } else if (dishLower.includes('salade') && dishLower.includes('fruits de mer')) {
    specificDesc = 'Seafood salad with shrimp, calamari, mussels, mixed greens, lemon dressing';
  } else if (dishLower.includes('salade') && dishLower.includes('crevettes panees')) {
    specificDesc = 'Salad with crispy breaded fried shrimp, mixed greens, fresh vegetables, dressing';
  } else if (dishLower.includes('salade') && dishLower.includes('saumon')) {
    specificDesc = 'Salmon salad with grilled or smoked salmon pieces, mixed greens, vegetables, dressing';
  } else if (dishLower.includes('salade') && dishLower.includes('roquette')) {
    specificDesc = 'Arugula salad with fresh arugula leaves, cherry tomatoes, parmesan shavings, balsamic dressing';
  }
  
  // Volailles
  else if (dishLower.includes('escalope') && dishLower.includes('panee')) {
    specificDesc = 'Breaded chicken escalope, golden fried, served with french fries and lemon wedge';
  } else if (dishLower.includes('escalope') && dishLower.includes('creme')) {
    specificDesc = 'Chicken escalope with white creamy sauce, mushrooms, served with vegetables';
  } else if (dishLower.includes('escalope') && dishLower.includes('champignon')) {
    specificDesc = 'Chicken escalope with mushroom cream sauce, fresh mushrooms, served with vegetables';
  } else if (dishLower.includes('escalope') && dishLower.includes('epinard')) {
    specificDesc = 'Chicken escalope with spinach cream sauce, served with vegetables';
  } else if (dishLower.includes('escalope') && dishLower.includes('gorgonzola')) {
    specificDesc = 'Chicken escalope with gorgonzola blue cheese cream sauce, served with vegetables';
  } else if (dishLower.includes('cordon bleu') && category === 'Volailles') {
    specificDesc = 'Chicken Cordon Bleu stuffed with ham and cheese, breaded and fried, served with french fries';
  } else if (dishLower.includes('escalope') && (dishLower.includes("bizz'art") || dishLower.includes('bizzart'))) {
    specificDesc = 'Signature Bizz Art chicken escalope with special sauce, premium presentation, served with vegetables';
  } else if (dishLower.includes('involtini')) {
    specificDesc = 'Chicken involtini rolls stuffed with cheese and herbs, with sauce, served with vegetables';
  } else if (dishLower.includes('escalope') && dishLower.includes('orientale')) {
    specificDesc = 'Oriental-style chicken escalope with spices, served with vegetables and rice';
  } else if (dishLower.includes('supreme maison')) {
    specificDesc = 'Homemade chicken supreme with cream sauce, served with vegetables';
  } else if (dishLower.includes('supreme') && !dishLower.includes('maison')) {
    specificDesc = 'Chicken supreme breast with sauce, served with vegetables';
  } else if (dishLower.includes('poulet') && dishLower.includes('italienne')) {
    specificDesc = 'Italian-style chicken with tomato sauce, melted mozzarella, fresh basil, served with pasta';
  } else if (dishLower.includes('escalope') || dishLower.includes('cuisse de poulet')) {
    specificDesc = 'Grilled chicken escalope or thigh, served with french fries and fresh vegetables';
  } else if (dishLower.includes('poulet pane') && category === 'Volailles') {
    specificDesc = 'Breaded fried chicken, crispy golden coating, served with french fries';
  } else if (dishLower.includes('poulet grille') && category === 'Volailles') {
    specificDesc = 'Grilled chicken with grill marks, served with vegetables';
  }
  
  // Viandes
  else if (dishLower.includes('steak grille')) {
    specificDesc = 'Grilled beef steak with visible grill marks, served with french fries and fresh vegetables';
  } else if (dishLower.includes('steak farci')) {
    specificDesc = 'Stuffed beef steak with cheese and herb filling, served with sauce, french fries and vegetables';
  } else if (dishLower === 'steak') {
    specificDesc = 'Beef steak with sauce, served with french fries and vegetables';
  } else if (dishLower.includes('foie grille')) {
    specificDesc = 'Grilled liver with caramelized onions, served with french fries';
  } else if (dishLower.includes('foie') && dishLower.includes('lyonnaise')) {
    specificDesc = 'Liver a la Lyonnaise with golden caramelized onions, served with french fries';
  } else if (dishLower.includes('grillade mixte')) {
    specificDesc = 'Mixed grill platter with beef, lamb, chicken, sausage, served with french fries and vegetables';
  } else if (dishLower.includes('grillade royale')) {
    specificDesc = 'Royal grill platter with premium cuts of beef and lamb, served with grilled vegetables and french fries';
  } else if (dishLower.includes('panorama de viande')) {
    specificDesc = 'Large meat panorama platter for 2 persons with various grilled meats including beef, lamb, chicken, sausages, served with vegetables and french fries';
  } else if (dishLower.includes('cotelette') && dishLower.includes('agneau')) {
    specificDesc = 'Grilled lamb chops with herbs, served with grilled vegetables and roasted potatoes';
  } else if (dishLower.includes('cote') && dishLower.includes('os grillee')) {
    specificDesc = 'Grilled T-bone steak with visible grill marks, served with french fries and vegetables';
  } else if (dishLower.includes('cote') && dishLower.includes('os') && (dishLower.includes("bizz'art") || dishLower.includes('bizzart'))) {
    specificDesc = 'Signature Bizz Art T-bone steak with special sauce, premium presentation, served with vegetables';
  } else if (dishLower.includes('filet de boeuf') && dishLower.includes('sauce au choix')) {
    specificDesc = 'Premium beef fillet tenderloin with choice of sauce, elegant presentation, served with vegetables';
  } else if (dishLower.includes('filet de boeuf')) {
    specificDesc = 'Beef fillet tenderloin, perfectly cooked, served with vegetables and sauce';
  }
  
  // Fruits de mer
  else if (dishLower.includes('plateau fruits de mer')) {
    specificDesc = 'Elegant seafood platter with oysters, shrimp, mussels, crab, presented on ice bed';
  } else if (dishLower.includes('crevettes sautees') || dishLower.includes('crevettes grillees')) {
    specificDesc = 'Sauteed or grilled shrimp with garlic and herbs, served with vegetables';
  } else if (dishLower.includes('fruits de mer sautes')) {
    specificDesc = 'Sauteed mixed seafood with shrimp, calamari, mussels, garlic sauce, served with vegetables';
  } else if (dishLower.includes('seiche gratinee')) {
    specificDesc = 'Baked cuttlefish gratinated with shrimp and honey sauce, golden crust';
  } else if (dishLower.includes('symphonie fruits de mer')) {
    specificDesc = 'Seafood symphony platter for 4 persons with variety of premium seafood including shrimp, fish, mussels, elegant presentation';
  } else if (dishLower.includes('symphonie terre-mer') && category === 'Fruits de mer') {
    specificDesc = 'Surf and Turf symphony platter combining premium seafood and grilled meat, elegant presentation';
  } else if (dishLower.includes('poisson du jour')) {
    specificDesc = 'Fresh fish of the day, grilled, served with lemon wedge and vegetables';
  }
  
  // Tacos et Makloub
  else if (category === 'Tacos' || category === 'MAkIOUB') {
    if (dishLower.includes('poulet grille')) {
      specificDesc = 'Taco or Makloub wrap with grilled chicken, fresh vegetables, sauce, wrapped in tortilla';
    } else if (dishLower.includes('poulet mexicain')) {
      specificDesc = 'Taco or Makloub wrap with Mexican-style spiced chicken, vegetables, spicy sauce, wrapped in tortilla';
    } else if (dishLower.includes('poulet pane')) {
      specificDesc = 'Taco or Makloub wrap with crispy breaded chicken, vegetables, sauce, wrapped in tortilla';
    } else if (dishLower.includes('cordon bleu')) {
      specificDesc = 'Taco or Makloub wrap with cordon bleu chicken, cheese, ham, sauce, wrapped in tortilla';
    } else if (dishLower.includes('viande hachee')) {
      specificDesc = 'Taco or Makloub wrap with seasoned ground beef, vegetables, sauce, wrapped in tortilla';
    } else if (dishLower === 'thon') {
      specificDesc = 'Makloub wrap with tuna, fresh vegetables, sauce, wrapped in tortilla';
    } else if (dishLower === 'special') {
      specificDesc = 'Special Makloub wrap with premium mixed ingredients, vegetables, sauce, wrapped in tortilla';
    }
  }
  
  // Boissons
  else if (dishLower.includes('eau minerale')) {
    if (dishLower.includes('1/2')) {
      specificDesc = 'Bottled mineral water 500ml bottle on clean white background';
    } else if (dishLower.includes('1l')) {
      specificDesc = 'Bottled mineral water 1 liter bottle on clean white background';
    }
  } else if (dishLower.includes('eau gazeuse')) {
    specificDesc = 'Sparkling water bottle on clean white background';
  } else if (dishLower === 'soda') {
    specificDesc = 'Soda can or bottle on clean white background';
  } else if (dishLower.includes('petillante')) {
    specificDesc = 'Sparkling beverage bottle on clean white background';
  } else if (dishLower.includes('citronnade')) {
    specificDesc = 'Fresh lemonade in tall glass with ice cubes, lemon slices, mint leaves, on white background';
  } else if (dishLower.includes('delio')) {
    specificDesc = 'Delio juice bottle on clean white background';
  } else if (dishLower.includes('orangina')) {
    specificDesc = 'Orangina bottle on clean white background';
  } else if (dishLower.includes('sprite')) {
    specificDesc = 'Sprite can or bottle on clean white background';
  }
  
  // Fallback generique
  if (!specificDesc) {
    specificDesc = `${dish} dish elegantly presented`;
  }
  
  return `${specificDesc}. ${baseStyle}`;
}

async function generateDetailedPlan() {
  console.log('\n=== PHASE 2.5 - PLAN DE GENERATION DETAILLE ===\n');
  console.log('Mode: LECTURE SEULE - Aucune modification\n');

  try {
    // Lecture des donnees audit
    const auditPath = path.join(__dirname, 'audit-reports', 'MENU-AUDIT-2026-08-19.json');
    const auditData: AuditData = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));

    console.log(`Total plats: ${auditData.audit.length}`);
    console.log(`Images dupliquees: ${auditData.duplicates.length}\n`);

    // Creer un map des images dupliquees
    const duplicateMap = new Map<string, string[]>();
    auditData.duplicates.forEach(dup => {
      dup.dishes.forEach(dish => {
        duplicateMap.set(dish, dup.dishes.filter(d => d !== dish));
      });
    });

    // Generer la liste des visuels
    const visualsList: any[] = [];
    const ambiguousCases: any[] = [];
    let keepCount = 0;

    auditData.audit.forEach((item, index) => {
      const isDuplicate = duplicateMap.has(item.dish);
      const sharedWith = duplicateMap.get(item.dish) || [];
      
      // Cas ambigus specifiques
      const isAmbiguous = 
        (item.dish.includes('du Chef') && !item.dish.includes('Salade')) ||
        item.dish.includes('du jour') ||
        (item.dish.includes('Symphonie Terre-Mer'));

      if (isAmbiguous) {
        ambiguousCases.push({
          number: visualsList.length + 1,
          category: item.category,
          dish: item.dish,
          price: item.price,
          currentImage: item.currentImage.substring(item.currentImage.lastIndexOf('/') + 1),
          status: 'AMBIGUOUS - MANUAL REVIEW',
          reason: 'Nom generique ou composition variable - validation manuelle requise'
        });
      }

      // Si ambigu, toujours GENERATE (apres validation)
      const action = (isDuplicate || isAmbiguous) ? 'GENERATE' : 'KEEP';
      
      if (action === 'KEEP') {
        keepCount++;
      }

      const filename = `${slugify(item.category)}-${slugify(item.dish)}.webp`;
      const prompt = action === 'GENERATE' ? generatePromptForDish(item.dish, item.category) : 'N/A - Image actuelle conservee';
      
      let reason = '';
      if (action === 'GENERATE') {
        if (sharedWith.length > 0) {
          reason = `Image actuellement partagee avec: ${sharedWith.join(', ')}`;
        } else {
          reason = 'Image dupliquee dans un groupe';
        }
      } else {
        reason = 'Image unique - aucun doublon detecte';
      }

      visualsList.push({
        number: index + 1,
        category: item.category,
        dish: item.dish,
        price: item.price,
        currentImage: item.currentImage.substring(item.currentImage.lastIndexOf('/') + 1),
        filename,
        action,
        prompt,
        reason,
        sharedWith: sharedWith.length > 0 ? sharedWith : null
      });
    });

    const generateCount = visualsList.filter(v => v.action === 'GENERATE').length;

    // Controles de coherence
    const totalPlats = visualsList.length;
    const totalGenerate = generateCount;
    const totalKeep = keepCount;
    const totalAmbiguous = ambiguousCases.length;

    console.log('=== CONTROLES DE COHERENCE ===');
    console.log(`Total plats: ${totalPlats}`);
    console.log(`Visuels a generer: ${totalGenerate}`);
    console.log(`Images a conserver: ${totalKeep}`);
    console.log(`Cas ambigus: ${totalAmbiguous}`);
    console.log(`Verification: ${totalGenerate} + ${totalKeep} = ${totalGenerate + totalKeep} (doit etre ${totalPlats})`);
    
    if (totalGenerate + totalKeep !== totalPlats) {
      console.error('\nERREUR: Incoherence mathematique detectee!');
      process.exit(1);
    }

    console.log('\nCoherence verifiee ✓\n');

    // Generation du rapport Markdown
    const outputDir = path.join(__dirname, 'visual-preparation-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = path.join(outputDir, 'PHASE-2.5-GENERATION-PLAN.md');
    
    let report = `# PHASE 2.5 — PLAN DE GENERATION DETAILLE\n\n`;
    report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    report += `**Mode:** LECTURE SEULE - Aucune modification effectuee\n\n`;
    report += `---\n\n`;
    
    report += `## RESUME EXECUTIF\n\n`;
    report += `| Metrique | Valeur |\n`;
    report += `|----------|--------|\n`;
    report += `| **Total plats** | ${totalPlats} |\n`;
    report += `| **Visuels a generer** | ${totalGenerate} |\n`;
    report += `| **Images a conserver** | ${totalKeep} |\n`;
    report += `| **Cas ambigus** | ${totalAmbiguous} |\n\n`;
    
    report += `**Verification mathematique:** ${totalGenerate} + ${totalKeep} = ${totalGenerate + totalKeep} ✓\n\n`;
    report += `---\n\n`;

    // Cas ambigus en premier
    if (ambiguousCases.length > 0) {
      report += `## CAS AMBIGUS - VALIDATION MANUELLE REQUISE\n\n`;
      report += `**${ambiguousCases.length} plat(s) necessitent une validation manuelle avant generation:**\n\n`;
      
      ambiguousCases.forEach(cas => {
        report += `### ${cas.number}. ${cas.dish}\n\n`;
        report += `- **Categorie:** ${cas.category}\n`;
        report += `- **Prix:** ${cas.price} DT\n`;
        report += `- **Image actuelle:** ${cas.currentImage}\n`;
        report += `- **Statut:** ${cas.status}\n`;
        report += `- **Raison:** ${cas.reason}\n\n`;
        
        // Informations disponibles vs manquantes
        report += `**Informations disponibles:**\n`;
        report += `- Nom: ${cas.dish}\n`;
        report += `- Categorie: ${cas.category}\n`;
        report += `- Prix: ${cas.price} DT\n\n`;
        
        report += `**Informations manquantes:**\n`;
        if (cas.dish.includes('du Chef')) {
          report += `- Ingredients specifiques non precises dans le nom\n`;
          report += `- Sauce ou preparation specifique\n`;
          report += `- Accompagnements exacts\n\n`;
          report += `**Proposition:** Representation standard premium de la categorie\n`;
          report += `**Niveau de confiance:** MOYEN - Validation recommandee\n\n`;
        } else if (cas.dish.includes('du jour')) {
          report += `- Type de poisson variable selon disponibilite\n\n`;
          report += `**Proposition:** Poisson blanc generique (bar, dorade) grille avec legumes\n`;
          report += `**Niveau de confiance:** MOYEN - Representation generique\n\n`;
        } else if (cas.dish.includes('Symphonie Terre-Mer')) {
          report += `- Composition exacte du plateau\n`;
          report += `- Portions (2 personnes vs 4 personnes)\n\n`;
          report += `**Proposition:** Plateau mixte mer et terre elegant\n`;
          report += `**Niveau de confiance:** MOYEN - Verification portions necessaire\n\n`;
        }
        
        report += `---\n\n`;
      });
    }

    // Liste complete des visuels
    report += `## LISTE COMPLETE DES 98 PLATS\n\n`;
    report += `**Legende:**\n`;
    report += `- ✅ KEEP = Conserver l'image actuelle (unique, non dupliquee)\n`;
    report += `- 🎨 GENERATE = Generer nouveau visuel (image actuellement dupliquee)\n`;
    report += `- ⚠️ AMBIGUOUS = Validation manuelle requise avant generation\n\n`;
    report += `---\n\n`;

    visualsList.forEach(visual => {
      const icon = visual.action === 'KEEP' ? '✅' : 
                   ambiguousCases.some(a => a.dish === visual.dish) ? '⚠️' : '🎨';
      
      report += `### ${visual.number}. ${icon} ${visual.dish}\n\n`;
      report += `**Categorie:** ${visual.category}\n\n`;
      report += `**Prix:** ${visual.price} DT\n\n`;
      report += `**Image actuelle:** \`${visual.currentImage}\`\n\n`;
      report += `**Filename propose:** \`${visual.filename}\`\n\n`;
      report += `**Action:** ${visual.action}\n\n`;
      
      if (visual.sharedWith && visual.sharedWith.length > 0) {
        report += `**Image actuellement partagee avec:**\n`;
        visual.sharedWith.forEach((dish: string) => {
          report += `- ${dish}\n`;
        });
        report += `\n`;
      }
      
      report += `**Raison:** ${visual.reason}\n\n`;
      
      if (visual.action === 'GENERATE' && !ambiguousCases.some(a => a.dish === visual.dish)) {
        report += `**Prompt de generation:**\n\n\`\`\`\n${visual.prompt}\n\`\`\`\n\n`;
      } else if (ambiguousCases.some(a => a.dish === visual.dish)) {
        report += `**Prompt de generation:** EN ATTENTE DE VALIDATION MANUELLE\n\n`;
      }
      
      report += `---\n\n`;
    });

    // Garanties finales
    report += `## GARANTIES DE SECURITE\n\n`;
    report += `✅ **Aucune modification effectuee:**\n`;
    report += `- MongoDB intact\n`;
    report += `- Cloudinary intact\n`;
    report += `- Aucun prix modifie\n`;
    report += `- Aucun nom modifie\n`;
    report += `- Aucune categorie modifiee\n`;
    report += `- Aucun plat supprime\n`;
    report += `- Aucun plat ajoute\n\n`;
    
    report += `✅ **Verification de coherence:**\n`;
    report += `- ${totalPlats} plats analyses\n`;
    report += `- ${totalGenerate} visuels a generer\n`;
    report += `- ${totalKeep} images a conserver\n`;
    report += `- ${totalAmbiguous} cas ambigus identifies\n`;
    report += `- Somme coherente: ${totalGenerate} + ${totalKeep} = ${totalPlats} ✓\n\n`;
    
    report += `---\n\n`;
    report += `## PROCHAINES ETAPES\n\n`;
    report += `**EN ATTENTE D'AUTORISATION UTILISATEUR:**\n\n`;
    report += `1. ✋ Valider ce plan de generation complet\n`;
    report += `2. ✋ Valider les ${totalAmbiguous} cas ambigus\n`;
    report += `3. ✋ Choisir le generateur IA (DALL-E, Midjourney, Stable Diffusion)\n`;
    report += `4. ✋ Confirmer l'ordre de generation (CRITICAL → HIGH → MEDIUM → LOW)\n\n`;
    report += `**NE PAS passer aux phases suivantes sans autorisation:**\n\n`;
    report += `- ❌ Phase 3: Generation des ${totalGenerate} images\n`;
    report += `- ❌ Phase 4: Upload sur Cloudinary\n`;
    report += `- ❌ Phase 5: Modification MongoDB\n`;
    report += `- ❌ Phase 6: Verification frontend\n\n`;
    
    report += `---\n\n`;
    report += `**STATUT:** PHASE 2.5 TERMINEE - PLAN DE GENERATION PRET\n\n`;
    report += `**ATTENTE:** Validation utilisateur avant Phase 3\n`;

    fs.writeFileSync(reportPath, report);
    
    console.log(`Rapport genere: ${path.basename(reportPath)}`);
    console.log(`Taille: ${fs.statSync(reportPath).size} bytes`);
    console.log('\n=== PHASE 2.5 TERMINEE ===\n');
    console.log('EN ATTENTE DE VALIDATION UTILISATEUR\n');

  } catch (error: any) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

generateDetailedPlan();
