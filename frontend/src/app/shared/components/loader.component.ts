import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getContainerClasses()">
      <div [class]="getSpinnerClasses()"></div>
      <p *ngIf="message" class="mt-4 text-dark-600">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loader-container {
      @apply flex flex-col items-center justify-center;
    }

    .loader-fullscreen {
      @apply min-h-screen;
    }

    .loader-inline {
      @apply py-8;
    }

    .spinner {
      @apply border-4 border-dark-200 border-t-primary-600 rounded-full animate-spin;
    }

    .spinner-sm {
      @apply w-8 h-8;
    }

    .spinner-md {
      @apply w-12 h-12;
    }

    .spinner-lg {
      @apply w-16 h-16;
    }
  `]
})
export class LoaderComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() fullscreen = false;
  @Input() message = '';

  getContainerClasses(): string {
    return `loader-container ${this.fullscreen ? 'loader-fullscreen' : 'loader-inline'}`;
  }

  getSpinnerClasses(): string {
    return `spinner spinner-${this.size}`;
  }
}
