import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryService } from '../../../core/services/gallery.service';
import { Media, MediaCategory } from '../../../core/models/media.model';

type AuditDecision = 'KEEP' | 'REMOVE' | 'REVIEW' | null;

interface MediaAudit extends Media {
  decision: AuditDecision;
}

type FilterType = 'all' | 'unclassified' | 'KEEP' | 'REMOVE' | 'REVIEW';
type CategoryFilter = 'all' | MediaCategory;

const STORAGE_KEY = 'gallery-audit-decisions';

@Component({
  selector: 'app-gallery-audit',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div class="container mx-auto px-4 py-6">
          <h1 class="text-3xl font-bold text-gray-900 mb-4">
            📸 GALERIE — AUDIT VISUEL
          </h1>

          <!-- Stats -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div class="bg-gray-100 p-4 rounded-lg">
              <div class="text-2xl font-bold text-gray-900">{{ totalMedia() }}</div>
              <div class="text-sm text-gray-600">Total médias</div>
            </div>
            <div class="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <div class="text-2xl font-bold text-green-700">{{ stats().keep }}</div>
              <div class="text-sm text-green-600">✅ KEEP</div>
            </div>
            <div class="bg-red-50 p-4 rounded-lg border-2 border-red-200">
              <div class="text-2xl font-bold text-red-700">{{ stats().remove }}</div>
              <div class="text-sm text-red-600">❌ REMOVE</div>
            </div>
            <div class="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
              <div class="text-2xl font-bold text-yellow-700">{{ stats().review }}</div>
              <div class="text-sm text-yellow-600">⚠️ REVIEW</div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div class="text-2xl font-bold text-blue-700">{{ stats().unclassified }}</div>
              <div class="text-sm text-blue-600">⏳ NON CLASSÉS</div>
            </div>
          </div>

          <!-- Filters -->
          <div class="flex flex-wrap gap-3 mb-4">
            <div class="text-sm font-semibold text-gray-700 self-center">Décision:</div>
            @for (filter of decisionFilters; track filter.id) {
              <button
                (click)="activeFilter.set(filter.id)"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                [class.bg-gray-900]="activeFilter() === filter.id"
                [class.text-white]="activeFilter() === filter.id"
                [class.bg-gray-200]="activeFilter() !== filter.id"
                [class.text-gray-700]="activeFilter() !== filter.id"
              >
                {{ filter.label }}
              </button>
            }
          </div>

          <div class="flex flex-wrap gap-3 mb-4">
            <div class="text-sm font-semibold text-gray-700 self-center">Catégorie:</div>
            @for (catFilter of categoryFilters; track catFilter.id) {
              <button
                (click)="activeCategoryFilter.set(catFilter.id)"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                [class.bg-gray-900]="activeCategoryFilter() === catFilter.id"
                [class.text-white]="activeCategoryFilter() === catFilter.id"
                [class.bg-gray-200]="activeCategoryFilter() !== catFilter.id"
                [class.text-gray-700]="activeCategoryFilter() !== catFilter.id"
              >
                {{ catFilter.label }}
              </button>
            }
          </div>

          <!-- Actions -->
          <div class="flex flex-wrap gap-3">
            <button
              (click)="exportDecisions()"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              💾 Exporter les résultats
            </button>
            <button
              (click)="resetAudit()"
              class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              🔄 Réinitialiser l'audit
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex justify-center items-center py-20">
          <div class="text-center">
            <svg class="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p class="text-gray-600">Chargement des médias...</p>
          </div>
        </div>
      }

      <!-- Error -->
      @if (loadError()) {
        <div class="container mx-auto px-4 py-20">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p class="text-red-700 font-semibold mb-2">❌ Erreur de chargement</p>
            <p class="text-red-600">{{ loadError() }}</p>
            <button
              (click)="loadMedia()"
              class="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      }

      <!-- Grid -->
      @if (!isLoading() && !loadError()) {
        <div class="container mx-auto px-4 py-8">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (item of filteredMedia(); track item._id; let i = $index) {
              <div class="bg-white rounded-lg shadow-md overflow-hidden border-2"
                   [class.border-green-500]="item.decision === 'KEEP'"
                   [class.border-red-500]="item.decision === 'REMOVE'"
                   [class.border-yellow-500]="item.decision === 'REVIEW'"
                   [class.border-gray-200]="!item.decision"
              >
                <!-- Image -->
                <div class="relative aspect-square bg-gray-100">
                  @if (item.type === 'video' && item.thumbnailUrl) {
                    <img
                      [src]="item.thumbnailUrl"
                      [alt]="item.title || 'Vidéo'"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      (error)="onImgError($event)"
                    />
                  } @else {
                    <img
                      [src]="item.url"
                      [alt]="item.title || ''"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      (error)="onImgError($event)"
                    />
                  }

                  <!-- Number Badge -->
                  <div class="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">
                    #{{ getOriginalIndex(item._id) + 1 }} / {{ totalMedia() }}
                  </div>

                  <!-- Decision Badge -->
                  @if (item.decision) {
                    <div class="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold"
                         [class.bg-green-500]="item.decision === 'KEEP'"
                         [class.bg-red-500]="item.decision === 'REMOVE'"
                         [class.bg-yellow-500]="item.decision === 'REVIEW'"
                         [class.text-white]="true"
                    >
                      {{ item.decision === 'KEEP' ? '✅ KEEP' : item.decision === 'REMOVE' ? '❌ REMOVE' : '⚠️ REVIEW' }}
                    </div>
                  }
                </div>

                <!-- Info -->
                <div class="p-4 space-y-2 text-sm">
                  <div class="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                    <span class="font-semibold">ID:</span><br>
                    {{ item._id }}
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <span class="font-semibold text-gray-700">Category:</span><br>
                      <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{{ item.category }}</span>
                    </div>
                    <div>
                      <span class="font-semibold text-gray-700">Type:</span><br>
                      <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{{ item.type }}</span>
                    </div>
                  </div>

                  <div>
                    <span class="font-semibold text-gray-700">Title:</span><br>
                    <span class="text-gray-900">{{ item.title || '(sans titre)' }}</span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span class="font-semibold">Visible:</span> {{ item.isVisible ? '✅' : '❌' }}
                    </div>
                    <div>
                      <span class="font-semibold">Order:</span> {{ item.order }}
                    </div>
                  </div>

                  <div class="pt-2 border-t border-gray-200">
                    <span class="font-semibold text-gray-700 text-xs">URL:</span><br>
                    <span class="text-xs text-gray-600 break-all">{{ item.url.substring(0, 60) }}...</span>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="p-4 pt-0 grid grid-cols-3 gap-2">
                  <button
                    (click)="setDecision(item._id, 'KEEP')"
                    class="px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
                    [class.bg-green-600]="item.decision === 'KEEP'"
                    [class.text-white]="item.decision === 'KEEP'"
                    [class.bg-green-100]="item.decision !== 'KEEP'"
                    [class.text-green-700]="item.decision !== 'KEEP'"
                    [class.hover:bg-green-200]="item.decision !== 'KEEP'"
                  >
                    ✅ KEEP
                  </button>
                  <button
                    (click)="setDecision(item._id, 'REMOVE')"
                    class="px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
                    [class.bg-red-600]="item.decision === 'REMOVE'"
                    [class.text-white]="item.decision === 'REMOVE'"
                    [class.bg-red-100]="item.decision !== 'REMOVE'"
                    [class.text-red-700]="item.decision !== 'REMOVE'"
                    [class.hover:bg-red-200]="item.decision !== 'REMOVE'"
                  >
                    ❌ REMOVE
                  </button>
                  <button
                    (click)="setDecision(item._id, 'REVIEW')"
                    class="px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
                    [class.bg-yellow-600]="item.decision === 'REVIEW'"
                    [class.text-white]="item.decision === 'REVIEW'"
                    [class.bg-yellow-100]="item.decision !== 'REVIEW'"
                    [class.text-yellow-700]="item.decision !== 'REVIEW'"
                    [class.hover:bg-yellow-200]="item.decision !== 'REVIEW'"
                  >
                    ⚠️ REVIEW
                  </button>
                </div>
              </div>
            }
          </div>

          @if (filteredMedia().length === 0) {
            <div class="text-center py-20">
              <p class="text-gray-500 text-lg">Aucun média ne correspond aux filtres sélectionnés.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class GalleryAuditComponent implements OnInit {
  isLoading = signal(true);
  loadError = signal('');
  allMedia = signal<MediaAudit[]>([]);
  activeFilter = signal<FilterType>('all');
  activeCategoryFilter = signal<CategoryFilter>('all');

  readonly decisionFilters = [
    { id: 'all' as FilterType, label: 'Tous' },
    { id: 'unclassified' as FilterType, label: '⏳ Non classés' },
    { id: 'KEEP' as FilterType, label: '✅ KEEP' },
    { id: 'REMOVE' as FilterType, label: '❌ REMOVE' },
    { id: 'REVIEW' as FilterType, label: '⚠️ REVIEW' },
  ];

  readonly categoryFilters = [
    { id: 'all' as CategoryFilter, label: 'Toutes catégories' },
    { id: 'gallery' as CategoryFilter, label: 'Gallery' },
    { id: 'food' as CategoryFilter, label: 'Food' },
    { id: 'restaurant' as CategoryFilter, label: 'Restaurant' },
    { id: 'team' as CategoryFilter, label: 'Team' },
    { id: 'events' as CategoryFilter, label: 'Events' },
  ];

  totalMedia = computed(() => this.allMedia().length);

  stats = computed(() => {
    const media = this.allMedia();
    return {
      keep: media.filter(m => m.decision === 'KEEP').length,
      remove: media.filter(m => m.decision === 'REMOVE').length,
      review: media.filter(m => m.decision === 'REVIEW').length,
      unclassified: media.filter(m => !m.decision).length,
    };
  });

  filteredMedia = computed(() => {
    let media = this.allMedia();

    // Filter by decision
    const decisionFilter = this.activeFilter();
    if (decisionFilter === 'unclassified') {
      media = media.filter(m => !m.decision);
    } else if (decisionFilter !== 'all') {
      media = media.filter(m => m.decision === decisionFilter);
    }

    // Filter by category
    const catFilter = this.activeCategoryFilter();
    if (catFilter !== 'all') {
      media = media.filter(m => m.category === catFilter);
    }

    return media;
  });

  constructor(private galleryService: GalleryService) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  loadMedia(): void {
    this.isLoading.set(true);
    this.loadError.set('');

    this.galleryService.getGallery({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.success && res.data?.media) {
          // Load existing decisions from localStorage
          const decisions = this.loadDecisionsFromStorage();

          const mediaWithDecisions: MediaAudit[] = res.data.media.map(m => ({
            ...m,
            decision: decisions[m._id] || null,
          }));

          this.allMedia.set(mediaWithDecisions);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.loadError.set('Impossible de charger les médias. Vérifiez que l\'API est accessible.');
        console.error('Error loading gallery:', err);
        this.isLoading.set(false);
      },
    });
  }

  setDecision(id: string, decision: AuditDecision): void {
    // Update local state
    this.allMedia.update(media =>
      media.map(m => m._id === id ? { ...m, decision } : m)
    );

    // Save to localStorage
    this.saveDecisionsToStorage();
  }

  getOriginalIndex(id: string): number {
    return this.allMedia().findIndex(m => m._id === id);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="20"%3EImage indisponible%3C/text%3E%3C/svg%3E';
  }

  exportDecisions(): void {
    const decisions = this.allMedia()
      .filter(m => m.decision)
      .map(m => ({
        id: m._id,
        decision: m.decision,
        title: m.title,
        category: m.category,
      }));

    const json = JSON.stringify(decisions, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gallery-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  resetAudit(): void {
    if (confirm('⚠️ Êtes-vous sûr de vouloir réinitialiser toutes les décisions d\'audit?')) {
      localStorage.removeItem(STORAGE_KEY);
      this.allMedia.update(media =>
        media.map(m => ({ ...m, decision: null }))
      );
    }
  }

  private loadDecisionsFromStorage(): Record<string, AuditDecision> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private saveDecisionsToStorage(): void {
    const decisions: Record<string, AuditDecision> = {};
    this.allMedia().forEach(m => {
      if (m.decision) {
        decisions[m._id] = m.decision;
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  }
}
