import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryService } from '../../../core/services/gallery.service';
import { Media, MediaCategory, UpdateMediaDto, UploadMediaPayload } from '../../../core/models/media.model';

type Modal = 'none' | 'upload' | 'edit' | 'delete';

const CATEGORY_LABELS: Record<MediaCategory | string, string> = {
  food: 'Cuisine',
  restaurant: 'Restaurant',
  team: 'Équipe',
  events: 'Événements',
  gallery: 'Galerie',
};

const ALL_CATEGORIES: MediaCategory[] = ['food', 'restaurant', 'team', 'events', 'gallery'];

interface UploadForm {
  category: MediaCategory;
  title: string;
  altText: string;
  isVisible: boolean;
}

@Component({
  selector: 'app-admin-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-2xl font-display font-bold text-dark-900">Galerie</h2>
        <button (click)="openUpload()" class="btn-primary">
          + Ajouter un média
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-2 items-center">
        <button (click)="categoryFilter.set('all')"
          [class]="categoryFilter() === 'all' ? 'filter-chip-active' : 'filter-chip'">
          Tout ({{ totalCount() }})
        </button>
        @for (cat of allCategories; track cat) {
          <button (click)="categoryFilter.set(cat)"
            [class]="categoryFilter() === cat ? 'filter-chip-active' : 'filter-chip'">
            {{ categoryLabel(cat) }}
          </button>
        }
      </div>

      <!-- Type toggle -->
      <div class="flex gap-2">
        <button (click)="typeFilter.set('all')"
          [class]="typeFilter() === 'all' ? 'filter-chip-active' : 'filter-chip'">Tout</button>
        <button (click)="typeFilter.set('image')"
          [class]="typeFilter() === 'image' ? 'filter-chip-active' : 'filter-chip'">Images</button>
        <button (click)="typeFilter.set('video')"
          [class]="typeFilter() === 'video' ? 'filter-chip-active' : 'filter-chip'">Vidéos</button>
      </div>

      <!-- Error -->
      @if (loadError()) {
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {{ loadError() }}
        </div>
      }

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex justify-center py-16">
          <svg class="animate-spin w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      }

      <!-- Grid -->
      @if (!isLoading()) {
        @if (filteredMedia().length === 0) {
          <div class="text-center py-16 text-dark-400">
            Aucun média. Cliquez sur "Ajouter un média" pour commencer.
          </div>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            @for (item of filteredMedia(); track item._id) {
              <div class="bg-white border border-dark-100 rounded-xl overflow-hidden flex flex-col group">

                <!-- Thumbnail -->
                <div class="relative h-36 bg-dark-100 overflow-hidden">
                  <img
                    [src]="item.type === 'video' ? (item.thumbnailUrl || item.url) : item.url"
                    [alt]="item.altText || item.title || ''"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    (error)="onImgError($event)"
                  />
                  <!-- Video badge -->
                  @if (item.type === 'video') {
                    <div class="absolute top-2 left-2 bg-dark-900/70 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Vidéo
                    </div>
                  }
                  <!-- Visibility badge -->
                  @if (!item.isVisible) {
                    <div class="absolute top-2 right-2 bg-dark-900/70 text-white text-xs px-2 py-0.5 rounded-full">
                      Masqué
                    </div>
                  }
                </div>

                <!-- Info -->
                <div class="p-3 flex-1 flex flex-col gap-1">
                  <p class="text-xs font-medium text-dark-900 line-clamp-1">
                    {{ item.title || '(sans titre)' }}
                  </p>
                  <span class="text-xs text-dark-400">{{ categoryLabel(item.category) }}</span>
                </div>

                <!-- Actions -->
                <div class="px-3 pb-3 flex gap-2">
                  <button (click)="editItem(item)" class="btn-sm-outline flex-1 text-xs">Modifier</button>
                  <button (click)="confirmDelete(item)" class="btn-sm-danger text-xs">✕</button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- MODAL — Upload                                                     -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      @if (modal() === 'upload') {
        <div class="modal-overlay" (click)="closeModal()" role="dialog" aria-modal="true">
          <div class="modal-box max-w-lg" (click)="$event.stopPropagation()">
            <h3 class="modal-title">Ajouter un média</h3>

            <!-- Drop zone -->
            <div
              class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-4 transition-colors"
              [class.border-primary-400]="!!uploadPreview()"
              [class.bg-primary-50]="!!uploadPreview()"
              [class.border-dark-200]="!uploadPreview()"
              (click)="fileInput.click()"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event)"
            >
              @if (uploadPreview()) {
                @if (uploadForm.isVideoPreview) {
                  <video [src]="uploadPreview()!" class="max-h-40 mx-auto rounded-lg" controls muted></video>
                } @else {
                  <img [src]="uploadPreview()!" alt="aperçu" class="max-h-40 mx-auto rounded-lg object-contain" />
                }
                <p class="text-xs text-dark-500 mt-2">{{ selectedFile()?.name }}</p>
              } @else {
                <svg class="w-10 h-10 mx-auto text-dark-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <p class="text-sm text-dark-500">Cliquer ou déposer une image / vidéo</p>
                <p class="text-xs text-dark-400 mt-1">JPG, PNG, WebP (5MB) · MP4, WebM (50MB)</p>
              }
              <input #fileInput type="file" class="hidden"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                (change)="onFileSelected($event)" />
            </div>

            <!-- Category -->
            <div class="mb-3">
              <label class="form-label">Catégorie *</label>
              <select [(ngModel)]="uploadForm.category" name="upCat" class="form-input">
                @for (cat of allCategories; track cat) {
                  <option [value]="cat">{{ categoryLabel(cat) }}</option>
                }
              </select>
            </div>

            <!-- Title -->
            <div class="mb-3">
              <label class="form-label">Titre <span class="text-dark-400 font-normal text-xs">(optionnel)</span></label>
              <input type="text" [(ngModel)]="uploadForm.title" name="upTitle" class="form-input"
                placeholder="Salle principale, Plat signature..." maxlength="200" />
            </div>

            <!-- Alt text -->
            <div class="mb-4">
              <label class="form-label">Texte alternatif <span class="text-dark-400 font-normal text-xs">(accessibilité)</span></label>
              <input type="text" [(ngModel)]="uploadForm.altText" name="upAlt" class="form-input"
                placeholder="Description de l'image pour les lecteurs d'écran" maxlength="300" />
            </div>

            <!-- Visible -->
            <div class="mb-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="uploadForm.isVisible" name="upVisible" class="rounded" />
                <span class="text-sm font-medium text-dark-700">Visible sur le site</span>
              </label>
            </div>

            <!-- Progress -->
            @if (uploading()) {
              <div class="mb-3">
                <div class="h-2 bg-dark-100 rounded-full overflow-hidden">
                  <div class="h-full bg-primary-500 rounded-full animate-pulse w-3/4"></div>
                </div>
                <p class="text-xs text-dark-500 mt-1 text-center">Envoi en cours...</p>
              </div>
            }

            @if (modalError()) {
              <p class="text-red-500 text-sm mb-3">{{ modalError() }}</p>
            }

            <div class="flex justify-end gap-3 pt-2">
              <button (click)="closeModal()" class="btn-sm-outline">Annuler</button>
              <button
                (click)="doUpload()"
                [disabled]="uploading() || !selectedFile()"
                class="btn-primary"
              >
                {{ uploading() ? 'Envoi...' : 'Uploader' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- MODAL — Edit metadata                                              -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      @if (modal() === 'edit' && editTarget()) {
        <div class="modal-overlay" (click)="closeModal()" role="dialog" aria-modal="true">
          <div class="modal-box max-w-md" (click)="$event.stopPropagation()">
            <h3 class="modal-title">Modifier le média</h3>

            <!-- Preview -->
            <div class="h-32 bg-dark-50 rounded-xl overflow-hidden mb-4">
              <img
                [src]="editTarget()!.type === 'video' ? (editTarget()!.thumbnailUrl || editTarget()!.url) : editTarget()!.url"
                [alt]="editTarget()!.altText || ''"
                class="w-full h-full object-cover"
                (error)="onImgError($event)"
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Catégorie</label>
              <select [(ngModel)]="editForm.category" name="editCat" class="form-input">
                @for (cat of allCategories; track cat) {
                  <option [value]="cat">{{ categoryLabel(cat) }}</option>
                }
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Titre</label>
              <input type="text" [(ngModel)]="editForm.title" name="editTitle" class="form-input" maxlength="200" />
            </div>

            <div class="mb-4">
              <label class="form-label">Texte alternatif</label>
              <input type="text" [(ngModel)]="editForm.altText" name="editAlt" class="form-input" maxlength="300" />
            </div>

            <div class="mb-4 flex items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="editForm.isVisible" name="editVisible" class="rounded" />
                <span class="text-sm font-medium text-dark-700">Visible</span>
              </label>
              <div>
                <label class="form-label mb-0">Ordre</label>
                <input type="number" [(ngModel)]="editForm.order" name="editOrder" class="form-input w-24" min="0" />
              </div>
            </div>

            @if (modalError()) {
              <p class="text-red-500 text-sm mb-3">{{ modalError() }}</p>
            }

            <div class="flex justify-end gap-3 pt-2">
              <button (click)="closeModal()" class="btn-sm-outline">Annuler</button>
              <button (click)="saveEdit()" [disabled]="saving()" class="btn-primary">
                {{ saving() ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!-- MODAL — Delete                                                     -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      @if (modal() === 'delete' && deleteTarget()) {
        <div class="modal-overlay" (click)="closeModal()" role="dialog" aria-modal="true">
          <div class="modal-box max-w-sm" (click)="$event.stopPropagation()">
            <h3 class="modal-title text-red-700">Confirmer la suppression</h3>
            <p class="text-dark-600 text-sm mb-5">
              Supprimer <strong>{{ deleteTarget()!.title || 'ce média' }}</strong> ?
              L'image / vidéo sera supprimée de Cloudinary. Cette action est irréversible.
            </p>
            @if (modalError()) {
              <p class="text-red-500 text-sm mb-3">{{ modalError() }}</p>
            }
            <div class="flex justify-end gap-3">
              <button (click)="closeModal()" class="btn-sm-outline">Annuler</button>
              <button (click)="doDelete()" [disabled]="saving()"
                class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
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
    .form-label { @apply block text-sm font-medium text-dark-700 mb-1; }
    .form-input { @apply w-full px-3 py-2 border border-dark-200 rounded-xl text-sm text-dark-900 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white; }
    .filter-chip { @apply px-3 py-1 rounded-full text-xs font-medium bg-white border border-dark-200 text-dark-600 hover:border-primary-400 transition-colors cursor-pointer; }
    .filter-chip-active { @apply px-3 py-1 rounded-full text-xs font-medium bg-primary-600 text-white border border-primary-600 cursor-pointer; }
    .modal-overlay { @apply fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto; }
    .modal-box { @apply bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl; }
    .modal-title { @apply text-xl font-display font-bold text-dark-900 mb-5; }
  `],
})
export class AdminGalleryComponent implements OnInit {

  // ─── State ──────────────────────────────────────────────────────────────────
  allMediaItems = signal<Media[]>([]);
  categoryFilter = signal<MediaCategory | 'all'>('all');
  typeFilter = signal<'all' | 'image' | 'video'>('all');
  isLoading = signal(true);
  loadError = signal('');
  modal = signal<Modal>('none');
  saving = signal(false);
  uploading = signal(false);
  modalError = signal('');
  selectedFile = signal<File | null>(null);
  uploadPreview = signal<string | null>(null);
  editTarget = signal<Media | null>(null);
  deleteTarget = signal<Media | null>(null);

  readonly allCategories = ALL_CATEGORIES;

  totalCount = computed(() => this.allMediaItems().length);

  filteredMedia = computed<Media[]>(() => {
    let items = this.allMediaItems();
    const cat = this.categoryFilter();
    const type = this.typeFilter();
    if (cat !== 'all')  items = items.filter(m => m.category === cat);
    if (type !== 'all') items = items.filter(m => m.type === type);
    return items;
  });

  // ─── Forms ──────────────────────────────────────────────────────────────────
  uploadForm: UploadForm & { isVideoPreview: boolean } = {
    category: 'gallery',
    title: '',
    altText: '',
    isVisible: true,
    isVideoPreview: false,
  };

  editForm: UpdateMediaDto & { title: string; altText: string; order: number; isVisible: boolean } = {
    category: 'gallery',
    title: '',
    altText: '',
    order: 0,
    isVisible: true,
  };

  constructor(private galleryService: GalleryService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.galleryService.adminGetGallery({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data?.media) {
          this.allMediaItems.set(res.data.media);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger la galerie.');
        this.isLoading.set(false);
      },
    });
  }

  categoryLabel(cat: string): string {
    return CATEGORY_LABELS[cat] ?? cat;
  }

  // ─── Upload ──────────────────────────────────────────────────────────────────
  openUpload(): void {
    this.uploadForm = { category: 'gallery', title: '', altText: '', isVisible: true, isVideoPreview: false };
    this.selectedFile.set(null);
    this.uploadPreview.set(null);
    this.modalError.set('');
    this.modal.set('upload');
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.previewFile(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.previewFile(file);
  }

  private previewFile(file: File): void {
    this.selectedFile.set(file);
    this.uploadForm.isVideoPreview = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = (e) => this.uploadPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  doUpload(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.modalError.set('');

    const payload: UploadMediaPayload = {
      file,
      category: this.uploadForm.category,
      title: this.uploadForm.title || undefined,
      altText: this.uploadForm.altText || undefined,
      isVisible: this.uploadForm.isVisible,
    };

    this.galleryService.uploadMedia(payload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allMediaItems.update(items => [res.data!, ...items]);
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Échec de l\'upload');
        }
        this.uploading.set(false);
      },
      error: (err) => {
        this.modalError.set(err.error?.message || 'Erreur lors de l\'upload');
        this.uploading.set(false);
      },
    });
  }

  // ─── Edit ────────────────────────────────────────────────────────────────────
  editItem(item: Media): void {
    this.editTarget.set(item);
    this.editForm = {
      category: item.category,
      title: item.title ?? '',
      altText: item.altText ?? '',
      order: item.order,
      isVisible: item.isVisible,
    };
    this.modalError.set('');
    this.modal.set('edit');
  }

  saveEdit(): void {
    const target = this.editTarget();
    if (!target?._id) return;
    this.saving.set(true);
    this.modalError.set('');

    const dto: UpdateMediaDto = {
      category:  this.editForm.category,
      title:     this.editForm.title || undefined,
      altText:   this.editForm.altText || undefined,
      order:     this.editForm.order,
      isVisible: this.editForm.isVisible,
    };

    this.galleryService.updateMedia(target._id, dto).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.allMediaItems.update(items =>
            items.map(i => i._id === target._id ? res.data! : i)
          );
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Échec de la mise à jour');
        }
        this.saving.set(false);
      },
      error: (err) => {
        this.modalError.set(err.error?.message || 'Erreur lors de la mise à jour');
        this.saving.set(false);
      },
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────
  confirmDelete(item: Media): void {
    this.deleteTarget.set(item);
    this.modalError.set('');
    this.modal.set('delete');
  }

  doDelete(): void {
    const target = this.deleteTarget();
    if (!target?._id) return;
    this.saving.set(true);
    this.modalError.set('');

    this.galleryService.deleteMedia(target._id).subscribe({
      next: (res) => {
        if (res.success) {
          this.allMediaItems.update(items => items.filter(i => i._id !== target._id));
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Échec de la suppression');
        }
        this.saving.set(false);
      },
      error: (err) => {
        this.modalError.set(err.error?.message || 'Erreur lors de la suppression');
        this.saving.set(false);
      },
    });
  }

  closeModal(): void {
    this.modal.set('none');
    this.editTarget.set(null);
    this.deleteTarget.set(null);
    this.selectedFile.set(null);
    this.uploadPreview.set(null);
    this.modalError.set('');
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
