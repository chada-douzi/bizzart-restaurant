import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="getClasses()"
      (click)="handleClick($event)"
    >
      <span *ngIf="loading" class="loading-spinner"></span>
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    button {
      @apply font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
      @apply flex items-center justify-center gap-2;
    }

    .btn-primary {
      @apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-4 focus:ring-primary-300;
    }

    .btn-secondary {
      @apply bg-dark-800 text-white hover:bg-dark-900 focus:ring-4 focus:ring-dark-300;
    }

    .btn-outline {
      @apply border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-4 focus:ring-primary-300;
    }

    .btn-ghost {
      @apply text-dark-700 hover:bg-dark-100 focus:ring-4 focus:ring-dark-200;
    }

    .btn-danger {
      @apply bg-red-600 text-white hover:bg-red-700 focus:ring-4 focus:ring-red-300;
    }

    .btn-sm {
      @apply px-3 py-1.5 text-sm;
    }

    .btn-md {
      @apply px-5 py-2.5 text-base;
    }

    .btn-lg {
      @apply px-6 py-3 text-lg;
    }

    .btn-full {
      @apply w-full;
    }

    .loading-spinner {
      @apply inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin;
    }
  `]
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullWidth = false;
  @Input() disabled = false;
  @Input() loading = false;
  @Output() clicked = new EventEmitter<Event>();

  handleClick(event: Event): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }

  getClasses(): string {
    const classes = [
      `btn-${this.variant}`,
      `btn-${this.size}`,
    ];

    if (this.fullWidth) {
      classes.push('btn-full');
    }

    return classes.join(' ');
  }
}
