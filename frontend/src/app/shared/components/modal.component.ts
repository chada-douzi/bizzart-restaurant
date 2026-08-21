import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 overflow-y-auto"
      (click)="onBackdropClick($event)"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

      <!-- Modal Container -->
      <div class="flex min-h-screen items-center justify-center p-4">
        <!-- Modal Content -->
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-lg w-full animate-fade-in"
          [class]="sizeClasses"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-dark-200">
            <h3 class="text-xl font-display font-semibold text-dark-900">
              {{ title }}
            </h3>
            <button
              *ngIf="showCloseButton"
              type="button"
              class="text-dark-400 hover:text-dark-900 transition-colors"
              (click)="close()"
              aria-label="Close"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6">
            <ng-content></ng-content>
          </div>

          <!-- Footer (optional) -->
          <div *ngIf="showFooter" class="flex items-center justify-end gap-3 p-6 border-t border-dark-200">
            <ng-content select="[footer]"></ng-content>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .size-sm {
      @apply max-w-sm;
    }

    .size-md {
      @apply max-w-lg;
    }

    .size-lg {
      @apply max-w-2xl;
    }

    .size-xl {
      @apply max-w-4xl;
    }

    .size-full {
      @apply max-w-full mx-4;
    }
  `]
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  @Input() showCloseButton = true;
  @Input() showFooter = false;
  @Input() closeOnBackdrop = true;
  @Output() closed = new EventEmitter<void>();

  get sizeClasses(): string {
    return `size-${this.size}`;
  }

  ngOnInit(): void {
    if (this.isOpen) {
      this.disableBodyScroll();
    }
  }

  ngOnDestroy(): void {
    this.enableBodyScroll();
  }

  close(): void {
    this.isOpen = false;
    this.enableBodyScroll();
    this.closed.emit();
  }

  onBackdropClick(event: Event): void {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
      this.close();
    }
  }

  private disableBodyScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private enableBodyScroll(): void {
    document.body.style.overflow = '';
  }
}
