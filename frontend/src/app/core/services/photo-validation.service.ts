/**
 * PHOTO VALIDATION SERVICE
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * 
 * Gère les appels API GET uniquement
 * Gère la persistance locale via localStorage
 * Gère l'export JSON côté navigateur
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { MenuItem } from '../models/menu.model';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidationStatus = 'pending' | 'correct' | 'incorrect' | 'invalid' | 'missing' | 'validated';

export interface PhotoInfo {
  url: string;
  source: 'menuitem' | 'media' | 'both';
  usedBy: string[];
  usageCount: number;
  fileName: string;
  title?: string;
  category?: string;
}

export interface ItemForValidation {
  index: number;
  _id: string;
  name: {
    fr: string;
    en: string;
    ar?: string;
  };
  category: {
    name: {
      fr: string;
      en: string;
      ar?: string;
    };
    slug: string;
  };
  slug: string;
  image: string;
  price: number;
  isAvailable: boolean;
  isFeatured: boolean;
  order: number;
}

export interface ValidationState {
  menuItemId: string;
  currentImage: string;
  validatedImage: string | null;
  status: ValidationStatus;
  professionalFilename?: string; // Nom professionnel recommandé
}

export interface ValidationExport {
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
  validations: {
    menuItemId: string;
    nameFr: string;
    category: string;
    currentImage: string;
    validatedImage: string | null;
    status: ValidationStatus;
    professionalFilename: string;
    duplicate: boolean;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable({
  providedIn: 'root'
})
export class PhotoValidationService {
  private readonly apiUrl = `${environment.apiUrl}/photo-validation`;
  private readonly localStorageKey = 'bizzart-photo-validation';

  constructor(private http: HttpClient) {}

  // ─── API Calls (GET only) ────────────────────────────────────────────────────

  /**
   * GET /api/photo-validation/items
   * Récupère tous les MenuItems pour validation
   */
  getItemsForValidation(): Observable<ApiResponse<ItemForValidation[]>> {
    return this.http.get<ApiResponse<ItemForValidation[]>>(`${this.apiUrl}/items`);
  }

  /**
   * GET /api/photo-validation/available-photos
   * Récupère l'inventaire complet des photos disponibles
   */
  getAvailablePhotos(): Observable<ApiResponse<{ total: number; photos: PhotoInfo[] }>> {
    return this.http.get<ApiResponse<{ total: number; photos: PhotoInfo[] }>>(`${this.apiUrl}/available-photos`);
  }

  // ─── localStorage Management ─────────────────────────────────────────────────

  /**
   * Sauvegarde l'état de validation dans localStorage
   */
  saveValidationState(validations: ValidationState[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(validations));
    } catch (error) {
      console.error('❌ Erreur sauvegarde localStorage:', error);
    }
  }

  /**
   * Charge l'état de validation depuis localStorage
   */
  loadValidationState(): ValidationState[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Erreur chargement localStorage:', error);
      return [];
    }
  }

  /**
   * Réinitialise l'état de validation (supprime localStorage)
   */
  resetValidationState(): void {
    try {
      localStorage.removeItem(this.localStorageKey);
    } catch (error) {
      console.error('❌ Erreur suppression localStorage:', error);
    }
  }

  // ─── Export JSON ──────────────────────────────────────────────────────────────

  /**
   * Exporte le mapping de validation en JSON
   * Le fichier est téléchargé directement dans le navigateur
   * AUCUNE donnée n'est envoyée au backend
   * 
   * VERSION INSTRUMENTÉE AVEC DIAGNOSTIC COMPLET
   */
  exportValidationMapping(items: ItemForValidation[], validations: ValidationState[], photos: PhotoInfo[]): void {
    const logPrefix = '[PHOTO-VALIDATION EXPORT]';
    
    try {
      console.log(`${logPrefix} Début de l'export`);
      console.log(`${logPrefix} items.length:`, items?.length || 0);
      console.log(`${logPrefix} validations.length:`, validations?.length || 0);
      console.log(`${logPrefix} photos.length:`, photos?.length || 0);

      // ─── VALIDATION DES DONNÉES D'ENTRÉE ────────────────────────────────────────

      if (!items || items.length === 0) {
        const errorMsg = 'Aucun MenuItem disponible pour export';
        console.error(`${logPrefix} ERREUR:`, errorMsg);
        alert(`❌ EXPORT IMPOSSIBLE\n\n${errorMsg}\n\nLes 98 plats doivent être chargés avant l'export.`);
        throw new Error(errorMsg);
      }

      if (!validations) {
        console.warn(`${logPrefix} ATTENTION: validations est null/undefined, utilisation tableau vide`);
        validations = [];
      }

      if (!photos) {
        console.warn(`${logPrefix} ATTENTION: photos est null/undefined, utilisation tableau vide`);
        photos = [];
      }

      // ─── CRÉATION DU MAPPING ─────────────────────────────────────────────────────

      console.log(`${logPrefix} Création du mapping de validation...`);

      const validationMap = new Map<string, ValidationState>();
      validations.forEach(v => validationMap.set(v.menuItemId, v));

      const photoUsageMap = new Map<string, number>();
      photos.forEach(p => photoUsageMap.set(p.url, p.usageCount));

      // ─── COMPTAGE DES STATUTS ────────────────────────────────────────────────────

      let correct = 0, incorrect = 0, invalid = 0, missing = 0, validated = 0, pending = 0, duplicates = 0;

      const validationsData = items.map(item => {
        const validation = validationMap.get(item._id);
        const status = validation?.status || 'pending';
        const isDuplicate = (photoUsageMap.get(item.image) || 0) > 1;

        // Compter
        switch (status) {
          case 'correct': correct++; break;
          case 'incorrect': incorrect++; break;
          case 'invalid': invalid++; break;
          case 'missing': missing++; break;
          case 'validated': validated++; break;
          case 'pending': pending++; break;
        }
        if (isDuplicate) duplicates++;

        return {
          menuItemId: item._id,
          nameFr: item.name.fr,
          category: item.category.name.fr,
          currentImage: item.image,
          validatedImage: validation?.validatedImage || null,
          status,
          professionalFilename: validation?.professionalFilename || this.generateProfessionalFilename(item.name.fr),
          duplicate: isDuplicate,
        };
      });

      console.log(`${logPrefix} Statuts comptés:`, {
        correct,
        incorrect,
        invalid,
        missing,
        validated,
        pending,
        duplicates
      });

      console.log(`${logPrefix} Records transformés: ${validationsData.length}`);

      // ─── CONSTRUCTION DE L'EXPORT ────────────────────────────────────────────────

      const exportData: ValidationExport = {
        version: 1,
        readonly: true,
        validatedAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        totalItems: items.length,
        summary: {
          correct,
          incorrect,
          invalid,
          missing,
          validated,
          pending,
          duplicates,
        },
        validations: validationsData,
      };

      console.log(`${logPrefix} Objet exportData construit:`, {
        version: exportData.version,
        totalItems: exportData.totalItems,
        validationsCount: exportData.validations.length,
        summary: exportData.summary
      });

      // ─── GÉNÉRATION DU JSON ──────────────────────────────────────────────────────

      console.log(`${logPrefix} Génération du JSON...`);
      const json = JSON.stringify(exportData, null, 2);

      if (!json || json.length === 0) {
        const errorMsg = 'JSON généré vide';
        console.error(`${logPrefix} ERREUR:`, errorMsg);
        alert(`❌ EXPORT IMPOSSIBLE\n\n${errorMsg}\n\nJSON.stringify() a retourné une chaîne vide.`);
        throw new Error(errorMsg);
      }

      console.log(`${logPrefix} JSON généré: ${json.length} caractères`);

      // ─── VALIDATION DU JSON ──────────────────────────────────────────────────────

      console.log(`${logPrefix} Validation du JSON...`);
      const parsed = JSON.parse(json);
      console.log(`${logPrefix} JSON valide: OUI`);
      console.log(`${logPrefix} Validation parse: totalItems=${parsed.totalItems}, validations=${parsed.validations.length}`);

      // ─── CRÉATION DU BLOB ────────────────────────────────────────────────────────

      console.log(`${logPrefix} Création du Blob...`);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });

      if (blob.size === 0) {
        const errorMsg = 'Blob généré vide (size=0)';
        console.error(`${logPrefix} ERREUR:`, errorMsg);
        alert(`❌ EXPORT IMPOSSIBLE\n\n${errorMsg}\n\nLe Blob créé a une taille de 0 octet.`);
        throw new Error(errorMsg);
      }

      console.log(`${logPrefix} Blob créé: ${blob.size} octets`);
      console.log(`${logPrefix} Blob type: ${blob.type}`);

      // ─── TÉLÉCHARGEMENT ROBUSTE ──────────────────────────────────────────────────

      console.log(`${logPrefix} Création de l'URL Blob...`);
      const url = URL.createObjectURL(blob);
      console.log(`${logPrefix} URL Blob créée: ${url.substring(0, 50)}...`);

      const filename = `bizzart-photo-validation-${Date.now()}.json`;
      console.log(`${logPrefix} Nom du fichier: ${filename}`);

      console.log(`${logPrefix} Création du lien de téléchargement...`);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';

      console.log(`${logPrefix} Ajout du lien au DOM...`);
      document.body.appendChild(anchor);

      console.log(`${logPrefix} Déclenchement du clic...`);
      anchor.click();

      console.log(`${logPrefix} Retrait du lien du DOM...`);
      document.body.removeChild(anchor);

      console.log(`${logPrefix} Nettoyage de l'URL Blob dans 1 seconde...`);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        console.log(`${logPrefix} URL Blob nettoyée`);
      }, 1000);

      // ─── RAPPORT DE SUCCÈS ───────────────────────────────────────────────────────

      console.log(`${logPrefix} ✅ EXPORT TERMINÉ AVEC SUCCÈS`);
      console.log(`${logPrefix} Résumé:`);
      console.log(`${logPrefix}   - Items: ${items.length}`);
      console.log(`${logPrefix}   - Validations: ${validations.length}`);
      console.log(`${logPrefix}   - Photos: ${photos.length}`);
      console.log(`${logPrefix}   - Records exportés: ${validationsData.length}`);
      console.log(`${logPrefix}   - JSON length: ${json.length} caractères`);
      console.log(`${logPrefix}   - Blob size: ${blob.size} octets`);
      console.log(`${logPrefix}   - Fichier: ${filename}`);

      // Message de succès visuel
      alert(
        `✅ EXPORT RÉUSSI\n\n` +
        `Fichier: ${filename}\n\n` +
        `Données exportées:\n` +
        `  • Items: ${items.length}\n` +
        `  • Validations: ${validations.length}\n` +
        `  • Taille JSON: ${json.length} caractères\n` +
        `  • Taille fichier: ${blob.size} octets\n\n` +
        `Statuts:\n` +
        `  ✅ Correctes: ${correct}\n` +
        `  🔄 Corrigées: ${validated}\n` +
        `  ❌ Incorrectes: ${incorrect}\n` +
        `  ⚠️ Invalides: ${invalid}\n` +
        `  📷 Manquantes: ${missing}\n` +
        `  ⏳ À vérifier: ${pending}`
      );

    } catch (error) {
      // ─── GESTION DES ERREURS ─────────────────────────────────────────────────────

      console.error(`${logPrefix} ❌ ERREUR DURANT L'EXPORT:`, error);
      console.error(`${logPrefix} Stack trace:`, (error as Error).stack);

      alert(
        `❌ ERREUR DURANT L'EXPORT\n\n` +
        `${(error as Error).message}\n\n` +
        `Consultez la console (F12) pour plus de détails.\n\n` +
        `Vérifiez:\n` +
        `  • Les 98 plats sont-ils chargés ?\n` +
        `  • localStorage contient-il des validations ?\n` +
        `  • Les photos sont-elles chargées ?`
      );

      throw error; // Re-throw pour debugging
    }
  }

  /**
   * Génère un nom de fichier professionnel à partir du nom du plat
   * Exemple: "Pizza Margherita" → "pizza-margherita.jpg"
   */
  generateProfessionalFilename(platName: string): string {
    return platName
      .toLowerCase()
      .normalize('NFD') // Décomposer les caractères accentués
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/['']/g, '') // Supprimer les apostrophes
      .replace(/[^a-z0-9\s-]/g, '') // Supprimer les caractères spéciaux
      .trim()
      .replace(/\s+/g, '-') // Espaces → tirets
      .replace(/-+/g, '-') // Tirets multiples → un seul tiret
      + '.jpg';
  }
}
