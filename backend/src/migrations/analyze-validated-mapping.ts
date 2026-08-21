/**
 * ANALYSE DU MAPPING VALIDÉ
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Ce script analyse le JSON exporté depuis /admin/photo-validation
 * et produit un rapport détaillé sans modifier aucune donnée.
 */

import { connectDatabase } from '../config/database';
import { MenuItem } from '../models/menu-item.model';
import { MenuCategory } from '../models/menu-category.model';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type ValidationStatus = 'pending' | 'correct' | 'incorrect' | 'invalid' | 'missing' | 'validated';

interface ValidationItem {
  menuItemId: string;
  nameFr: string;
  category: string;
  currentImage: string;
  validatedImage: string | null;
  status: ValidationStatus;
  professionalFilename: string;
  duplicate: boolean;
}

interface ValidationMapping {
  version: number;
  readonly: boolean;
  validatedAt: string;
  generatedAt: string;
  totalItems: number;
  summary: {
    correct: number;
    incorrect: number;
    invalid: number;
    missing: number;
    validated: number;
    pending: number;
    duplicates: number;
  };
  validations: ValidationItem[];
}

interface AnalysisResult {
  totalPlats: number;
  statusCounts: {
    correct: number;
    validated: number;
    incorrect: number;
    invalid: number;
    missing: number;
    pending: number;
  };
  modificationsPrevisibles: number;
  duplicatesRestants: number;
  blockers: string[];
  warnings: string[];
  detailedItems: Array<{
    id: string;
    nom: string;
    categorie: string;
    ancienneUrl: string;
    nouvelleUrl: string | null;
    statut: ValidationStatus;
    nomProfessionnel: string;
    action: string;
    doublon: boolean;
    blocker: boolean;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fonctions utilitaires
// ═══════════════════════════════════════════════════════════════════════════════

const generateProfessionalFilename = (platName: string): string => {
  return platName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    + '.jpg';
};

const isValidUrl = (url: string): boolean => {
  try {
    if (!url || url.trim() === '') return false;
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Analyse principale
// ═══════════════════════════════════════════════════════════════════════════════

const analyzeMapping = async (jsonFilePath: string) => {
  console.log('🔍 ANALYSE DU MAPPING VALIDÉ');
  console.log('============================');
  console.log('');
  console.log('🔒 MODE : STRICTEMENT LECTURE SEULE');
  console.log('');

  try {
    // 1. Vérifier que le fichier existe
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ Fichier introuvable : ${jsonFilePath}`);
      console.log('');
      console.log('Usage :');
      console.log('  npm run analyze:mapping -- path/to/bizzart-photo-validation-XXXXX.json');
      console.log('');
      process.exit(1);
    }

    // 2. Charger le JSON
    console.log('📄 Chargement du fichier JSON...');
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const mapping: ValidationMapping = JSON.parse(jsonContent);
    console.log(`   ✓ ${mapping.totalItems} validations chargées`);
    console.log('');

    // 3. Connexion MongoDB
    await connectDatabase();
    console.log('✅ Connecté à MongoDB');
    console.log('');

    // 4. Charger tous les MenuItems existants
    console.log('🍽️  Chargement des MenuItems depuis MongoDB...');
    const menuItems = await MenuItem.find({}).populate('category', 'name').lean();
    console.log(`   ✓ ${menuItems.length} plats trouvés dans MongoDB`);
    console.log('');

    // Créer un map pour accès rapide
    const menuItemsMap = new Map(menuItems.map(item => [item._id.toString(), item]));

    // 5. Charger les catégories
    const categories = await MenuCategory.find({}).lean();
    const categoriesMap = new Map(categories.map(cat => [cat._id.toString(), cat.name.fr]));

    // 6. Analyser les validations
    console.log('📊 Analyse des validations...');
    console.log('');

    const result: AnalysisResult = {
      totalPlats: mapping.totalItems,
      statusCounts: {
        correct: 0,
        validated: 0,
        incorrect: 0,
        invalid: 0,
        missing: 0,
        pending: 0,
      },
      modificationsPrevisibles: 0,
      duplicatesRestants: 0,
      blockers: [],
      warnings: [],
      detailedItems: [],
    };

    // Tracker les URLs pour détecter les doublons restants
    const urlUsage = new Map<string, number>();

    mapping.validations.forEach((validation, index) => {
      // Vérifier si le MenuItem existe
      const menuItem = menuItemsMap.get(validation.menuItemId);
      
      if (!menuItem) {
        result.blockers.push(
          `BLOCKER #${result.blockers.length + 1}: MenuItem "${validation.menuItemId}" (${validation.nameFr}) n'existe plus dans MongoDB`
        );
      }

      // Compter les statuts
      result.statusCounts[validation.status]++;

      // Déterminer l'action
      let action = 'AUCUNE';
      let blocker = false;

      switch (validation.status) {
        case 'correct':
          action = 'CONSERVER (photo correcte)';
          // Compter l'usage de l'URL actuelle
          if (validation.currentImage) {
            urlUsage.set(validation.currentImage, (urlUsage.get(validation.currentImage) || 0) + 1);
          }
          break;

        case 'validated':
          if (!validation.validatedImage) {
            result.blockers.push(
              `BLOCKER #${result.blockers.length + 1}: Plat "${validation.nameFr}" (statut=validated) sans validatedImage`
            );
            blocker = true;
            action = 'ERREUR: validated sans nouvelle image';
          } else if (!isValidUrl(validation.validatedImage)) {
            result.blockers.push(
              `BLOCKER #${result.blockers.length + 1}: URL invalide pour "${validation.nameFr}": ${validation.validatedImage}`
            );
            blocker = true;
            action = 'ERREUR: URL invalide';
          } else {
            action = 'UPDATE IMAGE';
            result.modificationsPrevisibles++;
            // Compter l'usage de la nouvelle URL
            urlUsage.set(validation.validatedImage, (urlUsage.get(validation.validatedImage) || 0) + 1);
          }
          break;

        case 'incorrect':
          action = 'CONSERVER (en attente photo correcte)';
          result.warnings.push(
            `WARNING: Plat "${validation.nameFr}" marqué incorrect mais aucune photo de remplacement`
          );
          if (validation.currentImage) {
            urlUsage.set(validation.currentImage, (urlUsage.get(validation.currentImage) || 0) + 1);
          }
          break;

        case 'invalid':
          action = 'CONSERVER (photo invalide, en attente remplacement)';
          result.warnings.push(
            `WARNING: Plat "${validation.nameFr}" a une photo invalide sans remplacement`
          );
          if (validation.currentImage) {
            urlUsage.set(validation.currentImage, (urlUsage.get(validation.currentImage) || 0) + 1);
          }
          break;

        case 'missing':
          action = 'CONSERVER (photo manquante)';
          result.warnings.push(
            `WARNING: Plat "${validation.nameFr}" sans photo adaptée`
          );
          if (validation.currentImage) {
            urlUsage.set(validation.currentImage, (urlUsage.get(validation.currentImage) || 0) + 1);
          }
          break;

        case 'pending':
          action = 'CONSERVER (non validé)';
          result.warnings.push(
            `WARNING: Plat "${validation.nameFr}" non validé (statut=pending)`
          );
          if (validation.currentImage) {
            urlUsage.set(validation.currentImage, (urlUsage.get(validation.currentImage) || 0) + 1);
          }
          break;
      }

      // Vérifier le nom professionnel
      const expectedProfessionalFilename = generateProfessionalFilename(validation.nameFr);
      if (validation.professionalFilename !== expectedProfessionalFilename) {
        result.warnings.push(
          `WARNING: Nom professionnel incorrect pour "${validation.nameFr}". ` +
          `Attendu: ${expectedProfessionalFilename}, Reçu: ${validation.professionalFilename}`
        );
      }

      result.detailedItems.push({
        id: validation.menuItemId,
        nom: validation.nameFr,
        categorie: validation.category,
        ancienneUrl: validation.currentImage,
        nouvelleUrl: validation.validatedImage,
        statut: validation.status,
        nomProfessionnel: validation.professionalFilename,
        action,
        doublon: validation.duplicate,
        blocker,
      });
    });

    // Compter les doublons restants
    urlUsage.forEach((count, url) => {
      if (count > 1) {
        result.duplicatesRestants++;
      }
    });

    // 7. Afficher le rapport
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RAPPORT D\'ANALYSE DU MAPPING');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`📊 STATISTIQUES GLOBALES`);
    console.log('');
    console.log(`   Total plats dans JSON       : ${result.totalPlats}`);
    console.log(`   Total plats dans MongoDB    : ${menuItems.length}`);
    console.log('');
    console.log(`📈 STATUTS DES VALIDATIONS`);
    console.log('');
    console.log(`   ✅ Correctes (inchangées)   : ${result.statusCounts.correct}`);
    console.log(`   🔄 Validées (à modifier)    : ${result.statusCounts.validated}`);
    console.log(`   ❌ Incorrectes              : ${result.statusCounts.incorrect}`);
    console.log(`   ⚠️ Invalides                : ${result.statusCounts.invalid}`);
    console.log(`   📷 Manquantes               : ${result.statusCounts.missing}`);
    console.log(`   ⏳ Non validées (pending)   : ${result.statusCounts.pending}`);
    console.log('');
    console.log(`🔧 MODIFICATIONS PRÉVUES`);
    console.log('');
    console.log(`   Documents à modifier        : ${result.modificationsPrevisibles}`);
    console.log(`   Documents inchangés         : ${result.totalPlats - result.modificationsPrevisibles}`);
    console.log('');
    console.log(`🔁 DOUBLONS`);
    console.log('');
    console.log(`   URLs utilisées plusieurs fois : ${result.duplicatesRestants}`);
    console.log('');

    // Afficher les blockers
    if (result.blockers.length > 0) {
      console.log(`🚨 BLOCKERS (${result.blockers.length})`);
      console.log('');
      result.blockers.forEach(blocker => {
        console.log(`   ${blocker}`);
      });
      console.log('');
      console.log('⚠️ LA MIGRATION NE PEUT PAS CONTINUER TANT QUE LES BLOCKERS NE SONT PAS RÉSOLUS');
      console.log('');
    }

    // Afficher les warnings
    if (result.warnings.length > 0) {
      console.log(`⚠️ WARNINGS (${result.warnings.length})`);
      console.log('');
      result.warnings.slice(0, 10).forEach(warning => {
        console.log(`   ${warning}`);
      });
      if (result.warnings.length > 10) {
        console.log(`   ... et ${result.warnings.length - 10} autres warnings`);
      }
      console.log('');
    }

    // 8. Générer le rapport détaillé JSON
    const reportPath = path.join(__dirname, '../../MAPPING-ANALYSIS-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`✅ Rapport détaillé sauvegardé : ${reportPath}`);
    console.log('');

    // 9. Générer le rapport Markdown
    const mdLines: string[] = [];
    mdLines.push('# RAPPORT D\'ANALYSE DU MAPPING VALIDÉ');
    mdLines.push('');
    mdLines.push(`**Date** : ${new Date().toLocaleString('fr-FR')}`);
    mdLines.push(`**Fichier source** : ${path.basename(jsonFilePath)}`);
    mdLines.push('');
    mdLines.push('## 🔒 MODE : STRICTEMENT LECTURE SEULE');
    mdLines.push('');
    mdLines.push('Aucune donnée n\'a été modifiée durant cette analyse.');
    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');
    mdLines.push('## 📊 STATISTIQUES GLOBALES');
    mdLines.push('');
    mdLines.push(`- **Total plats dans JSON** : ${result.totalPlats}`);
    mdLines.push(`- **Total plats dans MongoDB** : ${menuItems.length}`);
    mdLines.push('');
    mdLines.push('## 📈 STATUTS DES VALIDATIONS');
    mdLines.push('');
    mdLines.push(`- ✅ **Correctes** (inchangées) : ${result.statusCounts.correct}`);
    mdLines.push(`- 🔄 **Validées** (à modifier) : ${result.statusCounts.validated}`);
    mdLines.push(`- ❌ **Incorrectes** : ${result.statusCounts.incorrect}`);
    mdLines.push(`- ⚠️ **Invalides** : ${result.statusCounts.invalid}`);
    mdLines.push(`- 📷 **Manquantes** : ${result.statusCounts.missing}`);
    mdLines.push(`- ⏳ **Non validées** (pending) : ${result.statusCounts.pending}`);
    mdLines.push('');
    mdLines.push('## 🔧 MODIFICATIONS PRÉVUES');
    mdLines.push('');
    mdLines.push(`- **Documents à modifier** : ${result.modificationsPrevisibles}`);
    mdLines.push(`- **Documents inchangés** : ${result.totalPlats - result.modificationsPrevisibles}`);
    mdLines.push('');
    mdLines.push('## 🔁 DOUBLONS RESTANTS');
    mdLines.push('');
    mdLines.push(`- **URLs utilisées plusieurs fois** : ${result.duplicatesRestants}`);
    mdLines.push('');

    if (result.blockers.length > 0) {
      mdLines.push('## 🚨 BLOCKERS');
      mdLines.push('');
      mdLines.push('**⚠️ LA MIGRATION NE PEUT PAS CONTINUER TANT QUE CES BLOCKERS NE SONT PAS RÉSOLUS**');
      mdLines.push('');
      result.blockers.forEach(blocker => {
        mdLines.push(`- ${blocker}`);
      });
      mdLines.push('');
    }

    if (result.warnings.length > 0) {
      mdLines.push('## ⚠️ WARNINGS');
      mdLines.push('');
      result.warnings.forEach(warning => {
        mdLines.push(`- ${warning}`);
      });
      mdLines.push('');
    }

    mdLines.push('## 📋 DÉTAILS DES MODIFICATIONS PRÉVUES');
    mdLines.push('');
    mdLines.push('| # | Plat | Catégorie | Statut | Action |');
    mdLines.push('|---|------|-----------|--------|--------|');

    result.detailedItems
      .filter(item => item.action === 'UPDATE IMAGE')
      .forEach((item, index) => {
        mdLines.push(`| ${index + 1} | ${item.nom} | ${item.categorie} | ${item.statut} | ${item.action} |`);
      });

    mdLines.push('');
    mdLines.push('## 🎯 PROCHAINES ÉTAPES');
    mdLines.push('');

    if (result.blockers.length > 0) {
      mdLines.push('1. ❌ **RÉSOUDRE LES BLOCKERS** avant de continuer');
      mdLines.push('2. ⏳ Créer le backup MongoDB');
      mdLines.push('3. ⏳ Exécuter le dry-run');
      mdLines.push('4. ⏳ Migration réelle après validation');
    } else {
      mdLines.push('1. ✅ Aucun blocker détecté');
      mdLines.push('2. ⏳ Créer le backup MongoDB');
      mdLines.push('3. ⏳ Exécuter le dry-run');
      mdLines.push('4. ⏳ Migration réelle après validation');
    }

    mdLines.push('');

    const mdPath = path.join(__dirname, '../../MAPPING-ANALYSIS-REPORT.md');
    fs.writeFileSync(mdPath, mdLines.join('\n'));
    console.log(`✅ Rapport Markdown sauvegardé : ${mdPath}`);
    console.log('');

    // 10. Conclusion
    if (result.blockers.length > 0) {
      console.log('❌ ANALYSE TERMINÉE AVEC BLOCKERS');
      console.log('');
      console.log(`   ${result.blockers.length} blocker(s) doivent être résolus avant la migration.`);
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ ANALYSE TERMINÉE AVEC SUCCÈS');
      console.log('');
      console.log('   Aucun blocker détecté.');
      console.log(`   ${result.modificationsPrevisibles} modifications prévues.`);
      console.log(`   ${result.warnings.length} warnings à examiner.`);
      console.log('');
      console.log('🔒 Aucune donnée n\'a été modifiée');
      console.log('');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur durant l\'analyse :', error);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Exécution
// ═══════════════════════════════════════════════════════════════════════════════

const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.log('Usage :');
  console.log('  npm run analyze:mapping -- path/to/bizzart-photo-validation-XXXXX.json');
  console.log('');
  process.exit(1);
}

analyzeMapping(jsonFilePath);
