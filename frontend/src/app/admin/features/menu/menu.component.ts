import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService, CreateCategoryDto, UpdateCategoryDto } from '../../../core/services/menu.service';
import { MenuCategory, MenuItem, CreateMenuItemDto, MultiLanguageText } from '../../../core/models/menu.model';

// ─── Local form types ─────────────────────────────────────────────────────────

interface CategoryForm {
  nameFr: string; nameEn: string; nameAr: string;
  image: string;
  order: number;
  isActive: boolean;
}

interface ItemForm {
  categoryId: string;
  nameFr: string; nameEn: string; nameAr: string;
  descFr: string; descEn: string; descAr: string;
  price: number;
  image: string;
  allergens: string;
  tags: string;
  isAvailable: boolean;
  isFeatured: boolean;
  order: number;
}

type ActiveTab = 'categories' | 'items';
type Modal = 'none' | 'category-create' | 'category-edit' | 'item-create' | 'item-edit' | 'delete-category' | 'delete-item';

const EMPTY_CAT_FORM = (): CategoryForm => ({ nameFr: '', nameEn: '', nameAr: '', image: '', order: 0, isActive: true });
const EMPTY_ITEM_FORM = (): ItemForm => ({
  categoryId: '', nameFr: '', nameEn: '', nameAr: '',
  descFr: '', descEn: '', descAr: '', price: 0, image: '',
  allergens: '', tags: '', isAvailable: true, isFeatured: false, order: 0,
});

@Component({
  selector: 'app-admin-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-display font-bold text-dark-900">Gestion du menu</h2>
        <button
          (click)="openModal(activeTab() === 'categories' ? 'category-create' : 'item-create')"
          class="btn-primary"
        >
          + {{ activeTab() === 'categories' ? 'Nouvelle catégorie' : 'Nouveau plat' }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-dark-200">
        <button (click)="setTab('categories')"
          class="tab-btn" [class.tab-active]="activeTab() === 'categories'">
          Catégories ({{ categories().length }})
        </button>
        <button (click)="setTab('items')"
          class="tab-btn" [class.tab-active]="activeTab() === 'items'">
          Plats ({{ items().length }})
        </button>
      </div>

      <!-- Error -->
      @if (loadError()) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{{ loadError() }}</div>
      }

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex justify-center py-12">
          <svg class="animate-spin w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      }

      <!-- ── CATEGORIES tab ──────────────────────────────────────────────────── -->
      @if (!isLoading() && activeTab() === 'categories') {
        @if (categories().length === 0) {
          <div class="text-center py-16 text-dark-400">Aucune catégorie. Créez-en une pour commencer.</div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (cat of categories(); track cat._id) {
              <div class="bg-white rounded-xl border border-dark-100 p-4 flex flex-col gap-3">
                @if (cat.image) {
                  <img [src]="cat.image" [alt]="cat.name.fr"
                    class="w-full h-32 object-cover rounded-lg" loading="lazy"
                    (error)="onImgError($event)" />
                }
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-semibold text-dark-900">{{ cat.name.fr }}</p>
                    @if (cat.name.en) { <p class="text-dark-400 text-xs">{{ cat.name.en }}</p> }
                    <p class="text-dark-400 text-xs mt-0.5">Ordre : {{ cat.order }}</p>
                  </div>
                  <span [class]="cat.isActive ? 'badge-green' : 'badge-gray'">
                    {{ cat.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="flex gap-2 mt-auto">
                  <button (click)="editCategory(cat)" class="btn-sm-outline flex-1">Modifier</button>
                  <button (click)="confirmDeleteCat(cat)" class="btn-sm-danger">Supprimer</button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ── ITEMS tab ───────────────────────────────────────────────────────── -->
      @if (!isLoading() && activeTab() === 'items') {

        <!-- Filter by category -->
        <div class="flex flex-wrap gap-2 items-center">
          <button (click)="itemCategoryFilter.set('')"
            [class]="!itemCategoryFilter() ? 'filter-chip-active' : 'filter-chip'">Tous</button>
          @for (cat of categories(); track cat._id) {
            <button (click)="itemCategoryFilter.set(cat._id)"
              [class]="itemCategoryFilter() === cat._id ? 'filter-chip-active' : 'filter-chip'">
              {{ cat.name.fr }}
            </button>
          }
        </div>

        @if (filteredItems().length === 0) {
          <div class="text-center py-16 text-dark-400">Aucun plat trouvé.</div>
        } @else {
          <div class="bg-white rounded-xl border border-dark-100 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-dark-50 text-dark-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th class="px-4 py-3 text-left">Plat</th>
                    <th class="px-4 py-3 text-left">Catégorie</th>
                    <th class="px-4 py-3 text-left">Prix</th>
                    <th class="px-4 py-3 text-left">Statut</th>
                    <th class="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-100">
                  @for (item of filteredItems(); track item._id) {
                    <tr class="hover:bg-dark-50 transition-colors">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          @if (item.image) {
                            <img [src]="item.image" [alt]="item.name.fr"
                              class="w-10 h-10 object-cover rounded-lg shrink-0"
                              loading="lazy" (error)="onImgError($event)" />
                          } @else {
                            <div class="w-10 h-10 bg-dark-100 rounded-lg shrink-0 flex items-center justify-center text-dark-400 text-xs">?</div>
                          }
                          <div>
                            <p class="font-medium text-dark-900">{{ item.name.fr }}</p>
                            @if (item.isFeatured) {
                              <span class="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">★ Signature</span>
                            }
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-dark-600">{{ categoryName(item) }}</td>
                      <td class="px-4 py-3 font-semibold text-dark-900">{{ item.price | number:'1.0-2' }} DT</td>
                      <td class="px-4 py-3">
                        <span [class]="item.isAvailable ? 'badge-green' : 'badge-gray'">
                          {{ item.isAvailable ? 'Disponible' : 'Indisponible' }}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex gap-2">
                          <button (click)="editItem(item)" class="btn-sm-outline">Modifier</button>
                          <button (click)="confirmDeleteItem(item)" class="btn-sm-danger">Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- MODAL — Category Create / Edit                                        -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      @if (modal() === 'category-create' || modal() === 'category-edit') {
        <div class="modal-overlay" (click)="closeModal()" role="dialog" aria-modal="true">
          <div class="modal-box" (click)="$event.stopPropagation()">
            <h3 class="modal-title">{{ modal() === 'category-edit' ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}</h3>

            <!-- Upload image -->
            <div class="mb-4">
              <label class="form-label">Image de la catégorie</label>
              <div class="flex items-center gap-3">
                @if (catForm.image) {
                  <img [src]="catForm.image" alt="aperçu" class="w-16 h-16 object-cover rounded-lg" />
                }
                <label class="btn-sm-outline cursor-pointer">
                  {{ uploading() ? 'Envoi...' : 'Choisir une image' }}
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
                    [disabled]="uploading()"
                    (change)="onImageSelected($event, 'category')" />
                </label>
                @if (catForm.image) {
                  <button (click)="catForm.image = ''" class="text-xs text-red-500 hover:underline">Supprimer</button>
                }
              </div>
              @if (uploadError()) { <p class="text-red-500 text-xs mt-1">{{ uploadError() }}</p> }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label class="form-label">Nom (FR) *</label>
                <input type="text" [(ngModel)]="catForm.nameFr" name="catNameFr" class="form-input" placeholder="Entrées" />
              </div>
              <div>
                <label class="form-label">Nom (EN)</label>
                <input type="text" [(ngModel)]="catForm.nameEn" name="catNameEn" class="form-input" placeholder="Starters" />
              </div>
              <div>
                <label class="form-label">Nom (AR)</label>
                <input type="text" [(ngModel)]="catForm.nameAr" name="catNameAr" class="form-input" dir="rtl" placeholder="مقبلات" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="form-label">Ordre d'affichage</label>
                <input type="number" [(ngModel)]="catForm.order" name="catOrder" class="form-input" min="0" />
              </div>
              <div class="flex items-end pb-1">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="catForm.isActive" name="catActive" class="rounded" />
                  <span class="text-sm font-medium text-dark-700">Catégorie active</span>
                </label>
              </div>
            </div>

            @if (modalError()) { <p class="text-red-500 text-sm mb-3">{{ modalError() }}</p> }

            <div class="flex justify-end gap-3 pt-2">
              <button (click)="closeModal()" class="btn-sm-outline">Annuler</button>
              <button (click)="saveCategory()" [disabled]="saving() || !catForm.nameFr.trim()" class="btn-primary">
                {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- MODAL — Item Create / Edit                                            -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      @if (modal() === 'item-create' || modal() === 'item-edit') {
        <div class="modal-overlay" (click)="closeModal()" role="dialog" aria-modal="true">
          <div class="modal-box max-w-2xl" (click)="$event.stopPropagation()">
            <h3 class="modal-title">{{ modal() === 'item-edit' ? 'Modifier le plat' : 'Nouveau plat' }}</h3>

            <!-- Image upload -->
            <div class="mb-4">
              <label class="form-label">Image du plat *</label>
              <div class="flex items-center gap-3">
                @if (itemForm.image) {
                  <img [src]="itemForm.image" alt="aperçu" class="w-16 h-16 object-cover rounded-lg" />
                }
                <label class="btn-sm-outline cursor-pointer">
                  {{ uploading() ? 'Envoi...' : 'Choisir une image' }}
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
                    [disabled]="uploading()"
                    (change)="onImageSelected($event, 'item')" />
                </label>
              </div>
              @if (uploadError()) { <p class="text-red-500 text-xs mt-1">{{ uploadError() }}</p> }
            </div>

            <!-- Catégorie -->
            <div class="mb-4">
              <label class="form-label">Catégorie *</label>
              <select [(ngModel)]="itemForm.categoryId" name="itemCat" class="form-input">
                <option value="">-- Sélectionner --</option>
                @for (cat of categories(); track cat._id) {
                  <option [value]="cat._id">{{ cat.name.fr }}</option>
                }
              </select>
            </div>

            <!-- Noms -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label class="form-label">Nom (FR) *</label>
                <input type="text" [(ngModel)]="itemForm.nameFr" name="itemNameFr" class="form-input" placeholder="Poulet rôti" />
              </div>
              <div>
                <label class="form-label">Nom (EN)</label>
                <input type="text" [(ngModel)]="itemForm.nameEn" name="itemNameEn" class="form-input" />
              </div>
              <div>
                <label class="form-label">Nom (AR)</label>
                <input type="text" [(ngModel)]="itemForm.nameAr" name="itemNameAr" class="form-input" dir="rtl" />
              </div>
            </div>

            <!-- Descriptions -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label class="form-label">Description (FR)</label>
                <textarea [(ngModel)]="itemForm.descFr" name="itemDescFr" rows="2" class="form-input resize-none"></textarea>
              </div>
              <div>
                <label class="form-label">Description (EN)</label>
                <textarea [(ngModel)]="itemForm.descEn" name="itemDescEn" rows="2" class="form-input resize-none"></textarea>
              </div>
              <div>
                <label class="form-label">Description (AR)</label>
                <textarea [(ngModel)]="itemForm.descAr" name="itemDescAr" rows="2" class="form-input resize-none" dir="rtl"></textarea>
              </div>
            </div>

            <!-- Prix / Ordre -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label class="form-label">Prix (DT) *</label>
                <input type="number" [(ngModel)]="itemForm.price" name="itemPrice" class="form-input" min="0" step="0.5" />
              </div>
              <div>
                <label class="form-label">Ordre</label>
                <input type="number" [(ngModel)]="itemForm.order" name="itemOrder" class="form-input" min="0" />
              </div>
              <div class="flex items-end pb-1">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="itemForm.isAvailable" name="itemAvail" class="rounded" />
                  <span class="text-sm text-dark-700">Disponible</span>
                </label>
              </div>
              <div class="flex items-end pb-1">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="itemForm.isFeatured" name="itemFeat" class="rounded" />
                  <span class="text-sm text-dark-700">Signature ★</span>
                </label>
              </div>
            </div>

            <!-- Allergens / Tags -->
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="form-label">Allergènes <span class="text-dark-400 font-normal text-xs">(séparés par des virgules)</span></label>
                <input type="text" [(ngModel)]="itemForm.allergens" name="itemAllergens" class="form-input" placeholder="gluten, lactose" />
              </div>
              <div>
                <label class="form-label">Tags <span class="text-dark-400 font-normal text-xs">(séparés par des virgules)</span></label>
                <input type="text" [(ngModel)]="itemForm.tags" name="itemTags" class="form-input" placeholder="végétarien, épicé" />
              </div>
            </div>

            @if (modalError()) { <p class="text-red-500 text-sm mb-3">{{ modalError() }}</p> }

            <div class="flex justify-end gap-3 pt-2">
              <button (click)="closeModal()" class="btn-sm-outline">Annuler</button>
              <button (click)="saveItem()"
                [disabled]="saving() || !itemForm.nameFr.trim() || !itemForm.categoryId || !itemForm.image"
                class="btn-primary">
                {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- MODAL — Delete confirmations                                          -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      @if (modal() === 'delete-category' || modal() === 'delete-item') {
        <div class="modal-overlay" (click)="closeModal()" role="dialog" aria-modal="true">
          <div class="modal-box max-w-sm" (click)="$event.stopPropagation()">
            <h3 class="modal-title text-red-700">Confirmer la suppression</h3>
            <p class="text-dark-600 text-sm mb-5">
              @if (modal() === 'delete-category') {
                Supprimer la catégorie <strong>{{ selectedCat()!.name.fr }}</strong> ?
                Cette action est irréversible. Les plats associés seront orphelins.
              } @else {
                Supprimer le plat <strong>{{ selectedItem()!.name.fr }}</strong> ?
                Cette action est irréversible.
              }
            </p>
            @if (modalError()) { <p class="text-red-500 text-sm mb-3">{{ modalError() }}</p> }
            <div class="flex justify-end gap-3">
              <button (click)="closeModal()" class="btn-sm-outline">Annuler</button>
              <button (click)="modal() === 'delete-category' ? deleteCategory() : deleteItem()"
                [disabled]="saving()"
                class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {{ saving() ? 'Suppression...' : 'Supprimer' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .btn-primary { @apply bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm; }
    .btn-sm-outline { @apply px-3 py-1.5 border border-dark-200 rounded-lg text-sm font-medium text-dark-700 hover:bg-dark-50 transition-colors; }
    .btn-sm-danger { @apply px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors; }
    .tab-btn { @apply px-5 py-2.5 text-sm font-medium text-dark-500 border-b-2 border-transparent hover:text-dark-900 transition-colors; }
    .tab-active { @apply text-primary-600 border-primary-600; }
    .form-label { @apply block text-sm font-medium text-dark-700 mb-1; }
    .form-input { @apply w-full px-3 py-2 border border-dark-200 rounded-xl text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white; }
    .badge-green { @apply inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800; }
    .badge-gray  { @apply inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-dark-100 text-dark-600; }
    .filter-chip { @apply px-3 py-1 rounded-full text-xs font-medium bg-white border border-dark-200 text-dark-600 hover:border-primary-400 transition-colors cursor-pointer; }
    .filter-chip-active { @apply px-3 py-1 rounded-full text-xs font-medium bg-primary-600 text-white border border-primary-600 cursor-pointer; }
    .modal-overlay { @apply fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto; }
    .modal-box { @apply bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl; }
    .modal-title { @apply text-xl font-display font-bold text-dark-900 mb-5; }
  `]
})
export class AdminMenuComponent implements OnInit {

  // ─── State ──────────────────────────────────────────────────────────────────
  categories = signal<MenuCategory[]>([]);
  items = signal<MenuItem[]>([]);
  activeTab = signal<ActiveTab>('categories');
  modal = signal<Modal>('none');
  isLoading = signal(true);
  loadError = signal('');
  saving = signal(false);
  uploading = signal(false);
  uploadError = signal('');
  modalError = signal('');
  itemCategoryFilter = signal('');
  selectedCat = signal<MenuCategory | null>(null);
  selectedItem = signal<MenuItem | null>(null);

  catForm: CategoryForm = EMPTY_CAT_FORM();
  itemForm: ItemForm = EMPTY_ITEM_FORM();

  private editingCatId = '';
  private editingItemId = '';

  constructor(
    private menuService: MenuService,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.menuService.adminGetCategories().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.categories.set(res.data);
          // Sort categories by order
          this.categories.update(c => [...c].sort((a, b) => a.order - b.order));
        }
        // Load items after categories
        this.menuService.adminGetItems().subscribe({
          next: (res2) => {
            if (res2.success && res2.data) this.items.set(res2.data.items);
            this.isLoading.set(false);
          },
          error: () => { this.loadError.set('Erreur lors du chargement des plats.'); this.isLoading.set(false); },
        });
      },
      error: () => { this.loadError.set('Erreur lors du chargement des catégories.'); this.isLoading.set(false); },
    });
  }

  // ─── Computed ─────────────────────────────────────────────────────────────────
  filteredItems(): MenuItem[] {
    const filter = this.itemCategoryFilter();
    if (!filter) return this.items();
    return this.items().filter(i => {
      const catId = typeof i.category === 'string' ? i.category : (i.category as MenuCategory)._id;
      return catId === filter;
    });
  }

  categoryName(item: MenuItem): string {
    if (typeof item.category === 'object') return item.category.name.fr;
    const cat = this.categories().find(c => c._id === item.category);
    return cat?.name.fr ?? '—';
  }

  // ─── Tab ──────────────────────────────────────────────────────────────────────
  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    this.itemCategoryFilter.set('');
  }

  // ─── Modals ───────────────────────────────────────────────────────────────────
  openModal(m: Modal): void {
    this.modalError.set('');
    this.uploadError.set('');
    if (m === 'category-create') { this.catForm = EMPTY_CAT_FORM(); this.editingCatId = ''; }
    if (m === 'item-create') { this.itemForm = EMPTY_ITEM_FORM(); this.editingItemId = ''; }
    this.modal.set(m);
  }

  closeModal(): void {
    this.modal.set('none');
    this.saving.set(false);
    this.uploading.set(false);
    this.modalError.set('');
    this.uploadError.set('');
  }

  editCategory(cat: MenuCategory): void {
    this.editingCatId = cat._id;
    this.catForm = { nameFr: cat.name.fr, nameEn: cat.name.en ?? '', nameAr: cat.name.ar ?? '', image: cat.image ?? '', order: cat.order, isActive: cat.isActive };
    this.openModal('category-edit');
  }

  editItem(item: MenuItem): void {
    this.editingItemId = item._id;
    const catId = typeof item.category === 'string' ? item.category : (item.category as MenuCategory)._id;
    this.itemForm = {
      categoryId: catId,
      nameFr: item.name.fr, nameEn: item.name.en ?? '', nameAr: item.name.ar ?? '',
      descFr: item.description?.fr ?? '', descEn: item.description?.en ?? '', descAr: item.description?.ar ?? '',
      price: item.price, image: item.image,
      allergens: (item.allergens ?? []).join(', '),
      tags: (item.tags ?? []).join(', '),
      isAvailable: item.isAvailable, isFeatured: item.isFeatured, order: item.order,
    };
    this.openModal('item-edit');
  }

  confirmDeleteCat(cat: MenuCategory): void { this.selectedCat.set(cat); this.modal.set('delete-category'); }
  confirmDeleteItem(item: MenuItem): void { this.selectedItem.set(item); this.modal.set('delete-item'); }

  // ─── Image upload ─────────────────────────────────────────────────────────────
  onImageSelected(event: Event, target: 'category' | 'item'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError.set('');
    this.uploading.set(true);

    const folder = target === 'category' ? 'bizzart/categories' : 'bizzart/menu';

    this.menuService.uploadImage(file, folder).subscribe({
      next: (res) => {
        if (res.success && res.data?.url) {
          if (target === 'category') this.catForm.image = res.data.url;
          else this.itemForm.image = res.data.url;
        } else {
          this.uploadError.set('Upload échoué.');
        }
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploadError.set(err?.error?.message ?? 'Erreur lors de l\'upload.');
        this.uploading.set(false);
        input.value = '';
      },
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  // ─── CRUD — Categories ────────────────────────────────────────────────────────
  saveCategory(): void {
    if (!this.catForm.nameFr.trim()) return;
    this.saving.set(true);
    this.modalError.set('');

    const dto: CreateCategoryDto = {
      name: { fr: this.catForm.nameFr.trim(), en: this.catForm.nameEn.trim() || undefined, ar: this.catForm.nameAr.trim() || undefined },
      image: this.catForm.image || undefined,
      order: this.catForm.order,
      isActive: this.catForm.isActive,
    };

    const request$ = this.editingCatId
      ? this.menuService.updateCategory(this.editingCatId, dto as UpdateCategoryDto)
      : this.menuService.createCategory(dto);

    request$.subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (this.editingCatId) {
            this.categories.update(list => list.map(c => c._id === this.editingCatId ? res.data! : c));
          } else {
            this.categories.update(list => [...list, res.data!].sort((a, b) => a.order - b.order));
          }
          this.closeModal();
        } else {
          this.modalError.set(res.message ?? 'Erreur lors de l\'enregistrement.');
          this.saving.set(false);
        }
      },
      error: (err) => { this.modalError.set(err?.error?.message ?? 'Erreur.'); this.saving.set(false); },
    });
  }

  deleteCategory(): void {
    const cat = this.selectedCat();
    if (!cat) return;
    this.saving.set(true);
    this.menuService.deleteCategory(cat._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.categories.update(list => list.filter(c => c._id !== cat._id));
          this.closeModal();
        } else {
          this.modalError.set(res.message ?? 'Impossible de supprimer.');
          this.saving.set(false);
        }
      },
      error: (err) => { this.modalError.set(err?.error?.message ?? 'Erreur.'); this.saving.set(false); },
    });
  }

  // ─── CRUD — Items ─────────────────────────────────────────────────────────────
  private buildMultiLang(fr: string, en: string, ar: string): MultiLanguageText {
    return { fr: fr.trim(), en: en.trim() || undefined, ar: ar.trim() || undefined };
  }

  private splitTags(raw: string): string[] {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  saveItem(): void {
    if (!this.itemForm.nameFr.trim() || !this.itemForm.categoryId || !this.itemForm.image) return;
    this.saving.set(true);
    this.modalError.set('');

    const dto: CreateMenuItemDto = {
      category: this.itemForm.categoryId,
      name: this.buildMultiLang(this.itemForm.nameFr, this.itemForm.nameEn, this.itemForm.nameAr),
      description: (this.itemForm.descFr.trim() || this.itemForm.descEn.trim() || this.itemForm.descAr.trim())
        ? this.buildMultiLang(this.itemForm.descFr, this.itemForm.descEn, this.itemForm.descAr)
        : undefined,
      price: Number(this.itemForm.price),
      image: this.itemForm.image,
      allergens: this.splitTags(this.itemForm.allergens),
      tags: this.splitTags(this.itemForm.tags),
      isAvailable: this.itemForm.isAvailable,
      isFeatured: this.itemForm.isFeatured,
    };

    const request$ = this.editingItemId
      ? this.menuService.updateItem(this.editingItemId, dto)
      : this.menuService.createItem(dto);

    request$.subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (this.editingItemId) {
            this.items.update(list => list.map(i => i._id === this.editingItemId ? res.data! : i));
          } else {
            this.items.update(list => [...list, res.data!]);
          }
          this.closeModal();
        } else {
          this.modalError.set(res.message ?? 'Erreur lors de l\'enregistrement.');
          this.saving.set(false);
        }
      },
      error: (err) => { this.modalError.set(err?.error?.message ?? 'Erreur.'); this.saving.set(false); },
    });
  }

  deleteItem(): void {
    const item = this.selectedItem();
    if (!item) return;
    this.saving.set(true);
    this.menuService.deleteItem(item._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.items.update(list => list.filter(i => i._id !== item._id));
          this.closeModal();
        } else {
          this.modalError.set(res.message ?? 'Impossible de supprimer.');
          this.saving.set(false);
        }
      },
      error: (err) => { this.modalError.set(err?.error?.message ?? 'Erreur.'); this.saving.set(false); },
    });
  }
}
