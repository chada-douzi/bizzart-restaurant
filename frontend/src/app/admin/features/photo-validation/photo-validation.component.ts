/**
 * PHOTO VALIDATION COMPONENT
 * 
 * Outil de validation visuelle des photos des 98 plats
 * 
 * MODE STRICTEMENT LECTURE SEULE
 * - Aucune modification MongoDB
 * - Aucune modification Cloudinary
 * - localStorage uniquement pour la persistance
 * - Export JSON côté navigateur
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PhotoValidationService,
  ItemForValidation,
  PhotoInfo,
  ValidationState,
  ValidationStatus
} from '../../../core/services/photo-validation.service';

type FilterType = 'all' | 'pending' | 'correct' | 'incorrect' | 'invalid' | 'missing' | 'validated' | 'duplicates' | 'inaccessible';

@Component({
  selector: 'app-photo-validation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './photo-validation.component.html',
  styleUrls: ['./photo-validation.component.scss']
})
export class PhotoValidationComponent implements OnInit {
  
  // ─── Signals ──────────────────────────────────────────────────────────────────
  
  isLoadingItems = signal(false);
  isLoadingPhotos = signal(false);
  error = signal<string | null>(null);
  
  items = signal<ItemForValidation[]>([]);
  photos = signal<PhotoInfo[]>([]);
  validations = signal<ValidationState[]>([]);
  
  currentIndex = signal(0);
  currentFilter = signal<FilterType>('all');
  
  showCandidates = signal(false);
  selectedCandidateUrl = signal<string | null>(null);
  
  // Liste des URLs détectées comme inaccessibles lors des audits précédents
  private readonly knownInaccessibleUrls = new Set<string>([
    // Ces URLs seront signalées mais peuvent être retestées
  ]);
  
  // ─── Computed ─────────────────────────────────────────────────────────────────
  
  currentItem = computed(() => {
    const filtered = this.filteredItems();
    const index = this.currentIndex();
    return filtered[index] || null;
  });
  
  currentValidation = computed(() => {
    const item = this.currentItem();
    if (!item) return null;
    return this.validations().find(v => v.menuItemId === item._id) || null;
  });
  
  currentStatus = computed((): ValidationStatus => {
    return this.currentValidation()?.status || 'pending';
  });
  
  filteredItems = computed(() => {
    const allItems = this.items();
    const filter = this.currentFilter();
    const validationsMap = new Map(
      this.validations().map(v => [v.menuItemId, v])
    );
    
    switch (filter) {
      case 'all':
        return allItems;
      
      case 'pending':
        return allItems.filter(item => {
          const v = validationsMap.get(item._id);
          return !v || v.status === 'pending';
        });
      
      case 'correct':
        return allItems.filter(item => {
          const v = validationsMap.get(item._id);
          return v?.status === 'correct';
        });
      
      case 'incorrect':
        return allItems.filter(item => {
          const v = validationsMap.get(item._id);
          return v?.status === 'incorrect';
        });
      
      case 'invalid':
        return allItems.filter(item => {
          const v = validationsMap.get(item._id);
          return v?.status === 'invalid';
        });
      
      case 'missing':
        return allItems.filter(item => {
          const v = validationsMap.get(item._id);
          return v?.status === 'missing';
        });
      
      case 'validated':
        return allItems.filter(item => {
          const v = validationsMap.get(item._id);
          return v?.status === 'validated';
        });
      
      case 'duplicates':
        return allItems.filter(item => {
          const photo = this.photos().find(p => p.url === item.image);
          return photo && photo.usageCount > 1;
        });
      
      case 'inaccessible':
        return allItems.filter(item => 
          this.knownInaccessibleUrls.has(item.image)
        );
      
      default:
        return allItems;
    }
  });
  
  progressStats = computed(() => {
    const total = this.items().length;
    const validationsMap = new Map(
      this.validations().map(v => [v.menuItemId, v])
    );
    
    let correct = 0;
    let incorrect = 0;
    let invalid = 0;
    let missing = 0;
    let validated = 0;
    let pending = 0;
    
    this.items().forEach(item => {
      const v = validationsMap.get(item._id);
      const status = v?.status || 'pending';
      
      switch (status) {
        case 'correct': correct++; break;
        case 'incorrect': incorrect++; break;
        case 'invalid': invalid++; break;
        case 'missing': missing++; break;
        case 'validated': validated++; break;
        case 'pending': pending++; break;
      }
    });
    
    const completed = correct + validated;
    
    return {
      total,
      completed,
      correct,
      incorrect,
      invalid,
      missing,
      validated,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });
  
  candidatePhotos = computed(() => {
    return this.photos().filter(photo => {
      // Exclure la photo actuelle
      const currentItem = this.currentItem();
      if (currentItem && photo.url === currentItem.image) {
        return false;
      }
      return true;
    });
  });
  
  currentPhotoInfo = computed(() => {
    const item = this.currentItem();
    if (!item) return null;
    return this.photos().find(p => p.url === item.image) || null;
  });
  
  // ─── Constructor ──────────────────────────────────────────────────────────────
  
  constructor(private photoValidationService: PhotoValidationService) {}
  
  // ─── Lifecycle ────────────────────────────────────────────────────────────────
  
  ngOnInit(): void {
    this.loadData();
  }
  
  // ─── Data Loading ─────────────────────────────────────────────────────────────
  
  async loadData(): Promise<void> {
    this.error.set(null);
    
    // Charger localStorage
    const savedValidations = this.photoValidationService.loadValidationState();
    this.validations.set(savedValidations);
    
    // Charger items
    this.isLoadingItems.set(true);
    this.photoValidationService.getItemsForValidation().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.items.set(response.data);
        } else {
          this.error.set('Erreur lors du chargement des plats');
        }
        this.isLoadingItems.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur getItemsForValidation:', err);
        this.error.set('Impossible de charger les plats');
        this.isLoadingItems.set(false);
      }
    });
    
    // Charger photos
    this.isLoadingPhotos.set(true);
    this.photoValidationService.getAvailablePhotos().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.photos.set(response.data.photos);
        } else {
          this.error.set('Erreur lors du chargement des photos');
        }
        this.isLoadingPhotos.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur getAvailablePhotos:', err);
        this.error.set('Impossible de charger les photos');
        this.isLoadingPhotos.set(false);
      }
    });
  }
  
  // ─── Navigation ───────────────────────────────────────────────────────────────
  
  goToPrevious(): void {
    const filtered = this.filteredItems();
    const current = this.currentIndex();
    if (current > 0) {
      this.currentIndex.set(current - 1);
      this.showCandidates.set(false);
      this.selectedCandidateUrl.set(null);
    }
  }
  
  goToNext(): void {
    const filtered = this.filteredItems();
    const current = this.currentIndex();
    if (current < filtered.length - 1) {
      this.currentIndex.set(current + 1);
      this.showCandidates.set(false);
      this.selectedCandidateUrl.set(null);
    }
  }
  
  goToItem(index: number): void {
    const filtered = this.filteredItems();
    if (index >= 0 && index < filtered.length) {
      this.currentIndex.set(index);
      this.showCandidates.set(false);
      this.selectedCandidateUrl.set(null);
    }
  }
  
  // ─── Filters ──────────────────────────────────────────────────────────────────
  
  applyFilter(filter: FilterType): void {
    this.currentFilter.set(filter);
    this.currentIndex.set(0);
    this.showCandidates.set(false);
    this.selectedCandidateUrl.set(null);
  }
  
  // ─── Validation Actions ───────────────────────────────────────────────────────
  
  markAsCorrect(): void {
    const item = this.currentItem();
    if (!item) return;
    
    this.updateValidation(item._id, item.image, null, 'correct');
    this.showCandidates.set(false);
  }
  
  markAsIncorrect(): void {
    const item = this.currentItem();
    if (!item) return;
    
    this.updateValidation(item._id, item.image, null, 'incorrect');
    this.showCandidates.set(true);
  }
  
  markAsInvalid(): void {
    const item = this.currentItem();
    if (!item) return;
    
    this.updateValidation(item._id, item.image, null, 'invalid');
    this.showCandidates.set(true);
  }
  
  markAsMissing(): void {
    const item = this.currentItem();
    if (!item) return;
    
    this.updateValidation(item._id, item.image, null, 'missing');
    this.showCandidates.set(true);
  }
  
  selectCandidate(photoUrl: string): void {
    const item = this.currentItem();
    if (!item) return;
    
    this.selectedCandidateUrl.set(photoUrl);
    this.updateValidation(item._id, item.image, photoUrl, 'validated');
  }
  
  private updateValidation(
    menuItemId: string,
    currentImage: string,
    validatedImage: string | null,
    status: ValidationStatus
  ): void {
    const validations = this.validations();
    const index = validations.findIndex(v => v.menuItemId === menuItemId);
    
    // Générer le nom professionnel
    const item = this.items().find(i => i._id === menuItemId);
    const professionalFilename = item ? this.photoValidationService.generateProfessionalFilename(item.name.fr) : '';
    
    const newValidation: ValidationState = {
      menuItemId,
      currentImage,
      validatedImage,
      status,
      professionalFilename
    };
    
    if (index >= 0) {
      validations[index] = newValidation;
    } else {
      validations.push(newValidation);
    }
    
    this.validations.set([...validations]);
    this.photoValidationService.saveValidationState(this.validations());
  }
  
  // ─── Export ───────────────────────────────────────────────────────────────────
  
  exportMapping(): void {
    const logPrefix = '[PHOTO-VALIDATION COMPONENT]';
    
    console.log(`${logPrefix} Tentative d'export...`);
    console.log(`${logPrefix} Items chargés: ${this.items().length}`);
    console.log(`${logPrefix} Validations chargées: ${this.validations().length}`);
    console.log(`${logPrefix} Photos chargées: ${this.photos().length}`);
    
    if (this.items().length === 0) {
      const errorMsg = 'Aucune donnée à exporter. Les 98 plats doivent être chargés.';
      console.error(`${logPrefix} ERREUR:`, errorMsg);
      alert(`❌ EXPORT IMPOSSIBLE\n\n${errorMsg}\n\nVérifiez que:\n  • Vous êtes connecté en tant qu'admin\n  • Les plats sont chargés (rechargez la page si nécessaire)`);
      return;
    }
    
    console.log(`${logPrefix} Appel du service d'export...`);
    
    this.photoValidationService.exportValidationMapping(
      this.items(),
      this.validations(),
      this.photos()
    );
    
    console.log(`${logPrefix} Service d'export appelé`);
  }
  
  // ─── Reset ────────────────────────────────────────────────────────────────────
  
  resetValidation(): void {
    const confirmed = confirm(
      '⚠️ ATTENTION\n\n' +
      'Voulez-vous vraiment réinitialiser toutes les validations ?\n\n' +
      'Cette action supprimera toutes les validations enregistrées localement.\n\n' +
      'Les données MongoDB et Cloudinary ne seront PAS affectées.'
    );
    
    if (confirmed) {
      this.photoValidationService.resetValidationState();
      this.validations.set([]);
      this.currentIndex.set(0);
      this.showCandidates.set(false);
      this.selectedCandidateUrl.set(null);
    }
  }
  
  // ─── Diagnostic localStorage (READ ONLY) ──────────────────────────────────────
  
  /**
   * Affiche le diagnostic localStorage dans la console
   * MODE LECTURE SEULE - Ne modifie aucune donnée
   */
  diagnoseLocalStorage(): void {
    const logPrefix = '[PHOTO-VALIDATION DIAGNOSTIC]';
    
    console.log(`${logPrefix} ═══════════════════════════════════════════════`);
    console.log(`${logPrefix} DIAGNOSTIC LOCALSTORAGE (READ ONLY)`);
    console.log(`${logPrefix} ═══════════════════════════════════════════════`);
    
    try {
      const key = 'bizzart-photo-validation';
      const stored = localStorage.getItem(key);
      
      console.log(`${logPrefix} Clé: ${key}`);
      console.log(`${logPrefix} Existe: ${stored !== null}`);
      
      if (stored === null) {
        console.log(`${logPrefix} ⚠️ localStorage VIDE - Aucune validation sauvegardée`);
      } else {
        console.log(`${logPrefix} Longueur brute: ${stored.length} caractères`);
        
        try {
          const parsed = JSON.parse(stored);
          console.log(`${logPrefix} Parsing: SUCCÈS`);
          console.log(`${logPrefix} Type: ${Array.isArray(parsed) ? 'Array' : typeof parsed}`);
          
          if (Array.isArray(parsed)) {
            console.log(`${logPrefix} Nombre de validations: ${parsed.length}`);
            
            if (parsed.length > 0) {
              console.log(`${logPrefix} Première validation:`, parsed[0]);
              
              // Compter les statuts
              const statusCount: Record<string, number> = {};
              parsed.forEach((v: any) => {
                const status = v.status || 'unknown';
                statusCount[status] = (statusCount[status] || 0) + 1;
              });
              
              console.log(`${logPrefix} Statuts:`, statusCount);
            }
          } else {
            console.log(`${logPrefix} ⚠️ Structure inattendue (pas un Array)`);
          }
        } catch (parseError) {
          console.error(`${logPrefix} ❌ Erreur parsing JSON:`, parseError);
        }
      }
      
      console.log(`${logPrefix} ═══════════════════════════════════════════════`);
      console.log(`${logPrefix} Signals Angular actuels:`);
      console.log(`${logPrefix}   - items(): ${this.items().length}`);
      console.log(`${logPrefix}   - validations(): ${this.validations().length}`);
      console.log(`${logPrefix}   - photos(): ${this.photos().length}`);
      console.log(`${logPrefix} ═══════════════════════════════════════════════`);
      
    } catch (error) {
      console.error(`${logPrefix} ❌ Erreur durant le diagnostic:`, error);
    }
  }
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  
  isImageAccessible(url: string): boolean {
    return !this.knownInaccessibleUrls.has(url);
  }
  
  getFileName(url: string): string {
    return url.split('/').pop() || url;
  }
}
