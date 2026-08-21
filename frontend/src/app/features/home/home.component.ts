import { Component, OnInit, inject } from '@angular/core';
import { HeroSectionComponent } from './sections/hero-section.component';
import { AboutSectionComponent } from './sections/about-section.component';
import { ExperienceSectionComponent } from './sections/experience-section.component';
import { MenuPreviewSectionComponent } from './sections/menu-preview-section.component';
import { SignatureDishesSectionComponent } from './sections/signature-dishes-section.component';
import { PhilosophySectionComponent } from './sections/philosophy-section.component';
import { KitchenSectionComponent } from './sections/kitchen-section.component';
import { EventsSectionComponent } from './sections/events-section.component';
import { GallerySectionComponent } from './sections/gallery-section.component';
import { AtmosphereSectionComponent } from './sections/atmosphere-section.component';
import { TestimonialsSectionComponent } from './sections/testimonials-section.component';
import { ReservationCtaSectionComponent } from './sections/reservation-cta-section.component';
import { LocationSectionComponent } from './sections/location-section.component';
import { SocialSectionComponent } from './sections/social-section.component';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroSectionComponent,
    AboutSectionComponent,
    ExperienceSectionComponent,
    MenuPreviewSectionComponent,
    SignatureDishesSectionComponent,
    PhilosophySectionComponent,
    KitchenSectionComponent,
    EventsSectionComponent,
    GallerySectionComponent,
    AtmosphereSectionComponent,
    TestimonialsSectionComponent,
    ReservationCtaSectionComponent,
    LocationSectionComponent,
    SocialSectionComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private seoService = inject(SeoService);
  private settingsService = inject(SettingsService);

  // Static fallbacks — used when settings API hasn't responded yet
  private readonly SITE_URL = 'https://bizzart-monastir.com';
  private readonly OG_IMAGE = '/images/og-image.svg';

  ngOnInit(): void {
    const s = this.settingsService.publicSettings();

    // Prefer dynamic settings, fall back to static values
    const restaurantName = s?.restaurantName || "BIZZ'ART";
    const descriptionFr = s?.seo?.metaDescription?.fr ||
      "Découvrez BIZZ'ART, restaurant à Monastir. Cuisine méditerranéenne authentique. Réservation en ligne.";
    const metaTitleFr = s?.seo?.metaTitle?.fr ||
      "BIZZ'ART - Restaurant Méditerranéen à Monastir";
    const keywords = s?.seo?.keywords?.join(', ') ||
      "restaurant Monastir, BIZZ'ART Monastir, cuisine méditerranéenne";

    this.seoService.updateSeo({
      title: metaTitleFr,
      description: descriptionFr,
      keywords,
      image: s?.branding?.logo || this.OG_IMAGE,
      url: this.SITE_URL,
    });

    // JSON-LD Schema.org — pass settings directly (addRestaurantSchema accepts any)
    this.seoService.addRestaurantSchema({
      restaurantName,
      branding: {
        heroImage: s?.branding?.heroImage || '',
        logo:      s?.branding?.logo      || this.OG_IMAGE,
      },
      contact: {
        address:     s?.contact?.address     ?? {},
        phone:       s?.contact?.phone       ?? '',
        coordinates: s?.contact?.coordinates ?? { lat: 0, lng: 0 },
      },
      openingHours: s?.openingHours ?? [],
      socialMedia:  s?.socialMedia  ?? {},
    });
  }
}
