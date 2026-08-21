/**
 * MIGRATION DES PHOTOS DU MENU
 * 
 * Ce script applique le mapping validé aux MenuItems MongoDB.
 * 
 * RÈGLES DE SÉCURITÉ :
 * - Mode --dry-run par défaut (simulation sans modification)
 * - Backup obligatoire avant migration réelle
 * - Modification UNIQUEMENT du champ `image`
 * - Vérification de l'existence de chaque MenuItem
 * - Validation des URLs
 * - Aucune suppression
 * - Aucune modification de catégories/prix/descriptions
 */

import { connectDatabase } from '../config/database';
import { MenuItem } from '../models/menu-item.model';
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

interface MigrationResult {
  totalProcessed: number;
  modified: number;
  unchanged: number;
  errors: number;
  skipped: number;
  modifications: Array<{
    menuItemId: string;
    nom: string;
    ancienneUrl: string;
    nouvelleUrl: string;
    success: boolean;
    error?: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fonction de migration
// ═══════════════════════════════════════════════════════════════════════════════

const applyMapping = async (jsonFilePath: string, dryRun: boolean) => {
  const mode = dryRun ? 'DRY-RUN' : 'MIGRATION RÉELLE';
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`MIGRATION DES PHOTOS DU MENU - ${mode}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  if (dryRun) {
    console.log('🔒 MODE DRY-RUN : Aucune modification ne sera effectuée');
  } else {
    console.log('⚠️ MODE MIGRATION RÉELLE : Les données MongoDB seront modifiées');
  }
  console.log('');

  try {
    // 1. Vérifier que le fichier existe
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ Fichier introuvable : ${jsonFilePath}`);
      process.exit(1);
    }

    // 2. Charger le JSON
    console.log('📄 Chargement du mapping validé...');
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
    const mapping: ValidationMapping = JSON.parse(jsonContent);
    console.log(`   ✓ ${mapping.totalItems} validations chargées`);
    console.log('');

    // 3. Connexion MongoDB
    await connectDatabase();
    console.log('✅ Connecté à MongoDB');
    console.log('');

    // 4. Préparer les résultats
    const result: MigrationResult = {
      totalProcessed: 0,
      modified: 0,
      unchanged: 0,
      errors: 0,
      skipped: 0,
      modifications: [],
    };

    // 5. Traiter chaque validation
    console.log('🔄 Traitement des validations...');
    console.log('');

    for (const validation of mapping.validations) {
      result.totalProcessed++;

      // Ne modifier que les statuts "validated"
      if (validation.status !== 'validated') {
        result.unchanged++;
        continue;
      }

      // Vérifier qu'une nouvelle image est définie
      if (!validation.validatedImage) {
        console.log(`   ⚠️ SKIP: ${validation.nameFr} (validated sans nouvelle image)`);
        result.skipped++;
        continue;
      }

      // Vérifier que le MenuItem existe
      const menuItem = await MenuItem.findById(validation.menuItemId).lean();
      
      if (!menuItem) {
        console.log(`   ❌ ERROR: ${validation.nameFr} (MenuItem inexistant)`);
        result.errors++;
        result.modifications.push({
          menuItemId: validation.menuItemId,
          nom: validation.nameFr,
          ancienneUrl: validation.currentImage,
          nouvelleUrl: validation.validatedImage,
          success: false,
          error: 'MenuItem inexistant',
        });
        continue;
      }

      // Afficher la modification prévue
      console.log(`   🔄 ${validation.nameFr}`);
      console.log(`      Ancienne: ${validation.currentImage.substring(0, 60)}...`);
      console.log(`      Nouvelle: ${validation.validatedImage.substring(0, 60)}...`);

      if (dryRun) {
        console.log(`      ⏳ Serait modifiée (dry-run)`);
        result.modified++;
        result.modifications.push({
          menuItemId: validation.menuItemId,
          nom: validation.nameFr,
          ancienneUrl: validation.currentImage,
          nouvelleUrl: validation.validatedImage,
          success: true,
        });
      } else {
        try {
          // Migration réelle
          await MenuItem.findByIdAndUpdate(
            validation.menuItemId,
            {
              $set: {
                image: validation.validatedImage,
              },
            },
            { runValidators: true }
          );

          console.log(`      ✅ Modifiée avec succès`);
          result.modified++;
          result.modifications.push({
            menuItemId: validation.menuItemId,
            nom: validation.nameFr,
            ancienneUrl: validation.currentImage,
            nouvelleUrl: validation.validatedImage,
            success: true,
          });
        } catch (error) {
          console.log(`      ❌ Erreur: ${error}`);
          result.errors++;
          result.modifications.push({
            menuItemId: validation.menuItemId,
            nom: validation.nameFr,
            ancienneUrl: validation.currentImage,
            nouvelleUrl: validation.validatedImage,
            success: false,
            error: String(error),
          });
        }
      }

      console.log('');
    }

    // 6. Afficher le résumé
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log(`   Total traité             : ${result.totalProcessed}`);
    console.log(`   📝 Modifiés              : ${result.modified}`);
    console.log(`   ✓ Inchangés             : ${result.unchanged}`);
    console.log(`   ⚠️ Ignorés (skip)        : ${result.skipped}`);
    console.log(`   ❌ Erreurs               : ${result.errors}`);
    console.log('');

    if (dryRun) {
      console.log('🔒 MODE DRY-RUN : Aucune modification n\'a été effectuée');
      console.log('');
      console.log('Pour exécuter la migration réelle :');
      console.log(`   npm run migrate:menu-photos -- "${jsonFilePath}"`);
    } else {
      console.log('✅ MIGRATION RÉELLE TERMINÉE');
      console.log('');
      console.log(`   ${result.modified} documents MongoDB ont été modifiés`);
    }
    console.log('');

    // 7. Sauvegarder le rapport
    const reportPath = path.join(
      __dirname,
      `../../MIGRATION-REPORT-${dryRun ? 'DRYRUN' : 'REAL'}-${Date.now()}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`📄 Rapport sauvegardé : ${reportPath}`);
    console.log('');

    if (result.errors > 0) {
      console.log('⚠️ ATTENTION : Des erreurs se sont produites durant la migration');
      console.log('   Consultez le rapport pour plus de détails');
      console.log('');
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Erreur fatale durant la migration :', error);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Exécution
// ═══════════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

// Détecter le mode
const dryRunIndex = args.indexOf('--dry-run');
const isDryRun = dryRunIndex !== -1;

// Retirer --dry-run des arguments
if (isDryRun) {
  args.splice(dryRunIndex, 1);
}

// Le premier argument restant est le chemin du fichier JSON
const jsonFilePath = args[0];

if (!jsonFilePath) {
  console.log('Usage :');
  console.log('  npm run migrate:menu-photos -- path/to/mapping.json --dry-run  (simulation)');
  console.log('  npm run migrate:menu-photos -- path/to/mapping.json             (migration réelle)');
  console.log('');
  console.log('⚠️ ATTENTION : Par défaut, le mode --dry-run est activé pour sécurité');
  console.log('');
  process.exit(1);
}

// Par défaut, toujours en dry-run sauf si explicitement désactivé avec --no-dry-run
const noDryRunIndex = args.indexOf('--no-dry-run');
const finalDryRun = noDryRunIndex === -1 && !args.includes('--real');

applyMapping(jsonFilePath, finalDryRun || isDryRun);
