import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private router = inject(Router);

  private defaultTitle = 'BIZZ\'ART Monastir - Restaurant Italien & Fruits de Mer';
  private defaultDescription = 'Découvrez BIZZ\'ART Monastir, restaurant italien et fruits de mer à Monastir. Réservez votre table en ligne.';
  private defaultImage = '/images/og-image.svg';
  private baseUrl = 'https://bizzart-monastir.com';

  constructor() {
    // Update canonical URL on route change
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateCanonicalUrl();
      });
  }

  /**
   * Update page SEO meta tags
   */
  updateSeo(config: SeoConfig): void {
    const title = config.title || this.defaultTitle;
    const description = config.description || this.defaultDescription;
    const image = config.image || this.defaultImage;
    const url = config.url || this.baseUrl + this.router.url;
    const type = config.type || 'website';

    // Update title
    this.titleService.setTitle(title);

    // Update meta tags
    this.metaService.updateTag({ name: 'description', content: description });
    
    if (config.keywords) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords });
    }

    // Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:image', content: image });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: type });

    // Twitter Card tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: image });

    // Update canonical URL
    this.updateCanonicalUrl(url);
  }

  /**
   * Add JSON-LD structured data
   */
  addJsonLd(data: any): void {
    let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  /**
   * Update canonical URL
   */
  private updateCanonicalUrl(url?: string): void {
    const canonicalUrl = url || this.baseUrl + this.router.url;
    
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    
    link.setAttribute('href', canonicalUrl);
  }

  /**
   * Add restaurant structured data.
   * - Never emits geo if lat/lng are 0 (not configured).
   * - Never hardcodes social media URLs — uses Settings values only.
   */
  addRestaurantSchema(settings: any): void {
    const lat: number = settings.contact?.coordinates?.lat ?? 0;
    const lng: number = settings.contact?.coordinates?.lng ?? 0;
    const hasCoords   = lat !== 0 && lng !== 0;

    // Build sameAs array from Settings only — no hardcoded fallbacks
    const sameAs: string[] = [
      settings.socialMedia?.instagram,
      settings.socialMedia?.facebook,
      settings.socialMedia?.tiktok,
    ].filter((url): url is string => !!url && url.trim() !== '');

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type':    'Restaurant',
      name:       settings.restaurantName || "BIZZ'ART Monastir",
      image:      settings.branding?.heroImage || settings.branding?.logo || this.defaultImage,
      address: {
        '@type':           'PostalAddress',
        streetAddress:     settings.contact?.address?.street    || '',
        addressLocality:   settings.contact?.address?.city      || 'Monastir',
        addressRegion:     'Monastir',
        postalCode:        settings.contact?.address?.postalCode || '',
        addressCountry:    'TN',
      },
      url:       this.baseUrl,
      telephone: settings.contact?.phone || '',
      servesCuisine:        ['Italian', 'Mediterranean', 'Seafood'],
      priceRange:           '$$',
      openingHoursSpecification: this.formatOpeningHours(settings.openingHours || []),
      menu:                 this.baseUrl + '/menu',
      acceptsReservations:  true,
    };

    // Only include geo if real coordinates are configured
    if (hasCoords) {
      schema['geo'] = {
        '@type':    'GeoCoordinates',
        latitude:   lat,
        longitude:  lng,
      };
    }

    // Only include sameAs if at least one social URL is configured
    if (sameAs.length > 0) {
      schema['sameAs'] = sameAs;
    }

    this.addJsonLd(schema);
  }

  /**
   * Format opening hours for schema.org
   */
  private formatOpeningHours(openingHours: any[]): any[] {
    return openingHours
      .filter(day => day.isOpen && day.slots.length > 0)
      .map(day => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: this.capitalizeFirstLetter(day.day),
        opens: day.slots[0]?.open || '',
        closes: day.slots[0]?.close || ''
      }));
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
