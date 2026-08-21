/**
 * Seed Settings Script — BIZZ'ART Monastir — DONNÉES RÉELLES
 *
 * Usage: npx ts-node src/seed/seed-settings-real.ts
 *
 * Met à jour (ou crée) le document settings singleton avec les vraies informations.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Settings } from '../models/settings.model';

dotenv.config();

async function seedSettingsReal(): Promise<void> {
  console.log('\n🌱 ============================================');
  console.log("⚙️  BIZZ'ART — Settings Seed Script (DONNÉES RÉELLES)");
  console.log('🌱 ============================================\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI manquant');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connecté — DB: ${mongoose.connection.name}\n`);

  // ── Settings singleton ────────────────────────────────────────────────────
  const existingSettings = await Settings.findOne();

  const settingsData = {
    restaurantName: "BIZZ'ART Monastir",
    description: {
      fr: "Découvrez nos nouveautés gourmandes, entre créations exclusives juste pour toi ! Pizzas artisanales, salades fraîches, plats italiens & ...",
      en: "Discover our gourmet novelties, exclusive creations just for you! Artisan pizzas, fresh salads, Italian dishes & ...",
      ar: "",
    },
    contact: {
      phone: "53 065 000",
      email: "contact@bizzart-monastir.tn",
      address: {
        street: "Centre ville – près de l'hôpital Fattouma Bourguiba",
        city: "Monastir",
        postalCode: "5000",
        country: "Tunisia",
      },
      coordinates: {
        lat: 35.7771, // Approximation pour Monastir centre-ville
        lng: 10.8278,
      },
    },
    openingHours: [
      { day: 'monday', isOpen: true, slots: [{ open: '11:00', close: '23:00' }] },
      { day: 'tuesday', isOpen: true, slots: [{ open: '11:00', close: '23:00' }] },
      { day: 'wednesday', isOpen: true, slots: [{ open: '11:00', close: '23:00' }] },
      { day: 'thursday', isOpen: true, slots: [{ open: '11:00', close: '23:00' }] },
      { day: 'friday', isOpen: true, slots: [{ open: '11:00', close: '23:00' }] },
      { day: 'saturday', isOpen: true, slots: [{ open: '11:00', close: '23:00' }] },
      { day: 'sunday', isOpen: true, slots: [{ open: '11:00', close: '23:00' }] },
    ],
    socialMedia: {
      instagram: undefined,
      facebook: undefined,
      tiktok: undefined,
    },
    reservationSettings: {
      maxGuestsPerReservation: 12,
      minGuestsPerReservation: 1,
      maxDailyReservations: 50,
      advanceBookingDays: 30,
      timeSlotDuration: 30,
      autoConfirm: false,
    },
    seo: {
      metaTitle: {
        fr: "BIZZ'ART Monastir — Restaurant Méditerranéen & Pizzeria Artisanale",
        en: "BIZZ'ART Monastir — Mediterranean Restaurant & Artisan Pizzeria",
        ar: "",
      },
      metaDescription: {
        fr: "Découvrez BIZZ'ART Monastir : pizzas artisanales, pâtes fraîches, grillades et fruits de mer. Cuisine méditerranéenne authentique au cœur de Monastir.",
        en: "Discover BIZZ'ART Monastir: artisan pizzas, fresh pasta, grills and seafood. Authentic Mediterranean cuisine in the heart of Monastir.",
        ar: "",
      },
      keywords: [
        "BIZZ'ART",
        "restaurant Monastir",
        "pizzeria Monastir",
        "cuisine italienne Tunisie",
        "plats méditerranéens",
        "pizza artisanale",
        "restaurant centre ville Monastir",
        "réservation restaurant Monastir",
      ],
    },
    branding: {
      logo: "/images/logo.png",
      favicon: "/favicon.ico",
      heroImage: "/images/hero/restaurant-hero.jpg",
      primaryColor: "#b59164",
      secondaryColor: "#1a1a1a",
    },
    events: [],
  };

  if (existingSettings) {
    console.log('📝 Mise à jour des settings existants...');
    await Settings.findByIdAndUpdate(existingSettings._id, settingsData, { new: true });
    console.log('✅ Settings mis à jour\n');
  } else {
    console.log('📝 Création des settings...');
    await Settings.create(settingsData);
    console.log('✅ Settings créés\n');
  }

  console.log('🎉 Seed terminé\n');
  console.log('📞 Téléphone: 53 065 000');
  console.log("📍 Adresse: Centre ville – près de l'hôpital Fattouma Bourguiba, Monastir\n");
}

// ─── Run ──────────────────────────────────────────────────────────────────────

seedSettingsReal()
  .then(async () => {
    await mongoose.disconnect();
    console.log('🔌 MongoDB déconnecté');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Seed échoué:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
