import { MultiLanguageText } from './menu.model';

export interface RestaurantEvent {
  title: string;
  description?: string;
  date?: string;
  time?: string;
  imageUrl?: string;
  isVisible: boolean;
}

export interface RestaurantSettings {
  _id?: string;
  restaurantName: string;
  description: MultiLanguageText;
  contact: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  openingHours: OpeningHours[];
  socialMedia: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  reservationSettings: {
    maxGuestsPerReservation: number;
    minGuestsPerReservation: number;
    maxDailyReservations: number;
    advanceBookingDays: number;
    timeSlotDuration: number;
    autoConfirm: boolean;
  };
  seo: {
    metaTitle: MultiLanguageText;
    metaDescription: MultiLanguageText;
    keywords: string[];
  };
  branding: {
    logo?: string;
    favicon?: string;
    heroImage?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  events?: RestaurantEvent[];
  updatedBy?: string;
  updatedAt?: Date;
}

export interface OpeningHours {
  day: DayOfWeek;
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface TimeSlot {
  open: string;
  close: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
