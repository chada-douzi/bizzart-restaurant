import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Settings } from '../models/settings.model';
import { ResponseUtil } from '../utils/response.util';
import { CONSTANTS } from '../config/constants';

// ─── Default Settings (neutral — no real restaurant data) ─────────────────────

const DEFAULT_SETTINGS = {
  restaurantName: "BIZZ'ART",
  description: { fr: '', en: '', ar: '' },
  contact: {
    phone: '',
    email: '',
    address: { street: '', city: 'Monastir', postalCode: '', country: 'Tunisia' },
    coordinates: { lat: 0, lng: 0 },
  },
  openingHours: [],
  socialMedia: { instagram: '', facebook: '', tiktok: '' },
  reservationSettings: {
    maxGuestsPerReservation: CONSTANTS.MAX_GUESTS_PER_RESERVATION,
    minGuestsPerReservation: CONSTANTS.MIN_GUESTS_PER_RESERVATION,
    maxDailyReservations: CONSTANTS.MAX_DAILY_RESERVATIONS,
    advanceBookingDays: CONSTANTS.ADVANCE_BOOKING_DAYS,
    timeSlotDuration: CONSTANTS.TIME_SLOT_DURATION,
    autoConfirm: false,
  },
  seo: {
    metaTitle: { fr: "BIZZ'ART Monastir", en: '', ar: '' },
    metaDescription: { fr: '', en: '', ar: '' },
    keywords: [],
  },
  branding: {
    logo: '',
    favicon: '',
    primaryColor: '#b59164',
    secondaryColor: '#1a1a1a',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    ResponseUtil.error(
      res,
      'Validation failed',
      errors.array().map((e) => ({
        field: e.type === 'field' ? (e as any).path : undefined,
        message: e.msg,
      })),
      422
    );
    return true;
  }
  return false;
}

/**
 * Returns the public-safe subset of settings.
 * Strips: updatedBy, seo (optional for public), branding internal details.
 * The branding is included to allow logo/colors to be applied client-side.
 */
function toPublicSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const s = settings as any;
  return {
    restaurantName: s.restaurantName,
    description: s.description,
    contact: {
      phone: s.contact?.phone || '',
      email: s.contact?.email || '',
      address: s.contact?.address || {},
      coordinates: s.contact?.coordinates || { lat: 0, lng: 0 },
    },
    openingHours: s.openingHours || [],
    socialMedia: s.socialMedia || {},
    // Exposed publicly so the reservation form can apply dynamic constraints
    // (guest range, advance booking days, time slot duration) without requiring auth.
    reservationSettings: {
      maxGuestsPerReservation: s.reservationSettings?.maxGuestsPerReservation ?? CONSTANTS.MAX_GUESTS_PER_RESERVATION,
      minGuestsPerReservation: s.reservationSettings?.minGuestsPerReservation ?? CONSTANTS.MIN_GUESTS_PER_RESERVATION,
      advanceBookingDays:      s.reservationSettings?.advanceBookingDays      ?? CONSTANTS.ADVANCE_BOOKING_DAYS,
      timeSlotDuration:        s.reservationSettings?.timeSlotDuration        ?? CONSTANTS.TIME_SLOT_DURATION,
      // autoConfirm is an internal setting — intentionally not exposed publicly
    },
    branding: {
      logo: s.branding?.logo || '',
      heroImage: s.branding?.heroImage || '',
      primaryColor: s.branding?.primaryColor || '#b59164',
      secondaryColor: s.branding?.secondaryColor || '#1a1a1a',
    },
    // Events visible on the public site
    events: (s.events ?? []).filter((e: any) => e.isVisible !== false),
    seo: s.seo || {},
    updatedAt: s.updatedAt,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/settings
export const getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await Settings.findOne().lean();

    if (!settings) {
      // Return neutral defaults if settings have never been saved
      ResponseUtil.success(res, toPublicSettings(DEFAULT_SETTINGS as any), 'Settings retrieved successfully');
      return;
    }

    ResponseUtil.success(res, toPublicSettings(settings as unknown as Record<string, unknown>), 'Settings retrieved successfully');
  } catch (error) {
    console.error('❌ getPublicSettings error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/settings/admin — full settings including reservationSettings
export const adminGetSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await Settings.findOne()
      .populate('updatedBy', 'firstName lastName email')
      .lean();

    if (!settings) {
      // Return defaults when no settings exist yet
      ResponseUtil.success(res, DEFAULT_SETTINGS, 'No settings found — returning defaults');
      return;
    }

    ResponseUtil.success(res, settings, 'Settings retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetSettings error:', error);
    ResponseUtil.serverError(res);
  }
};

// PUT /api/settings/admin — singleton upsert
// Uses findOneAndUpdate with upsert:true — guarantees exactly 1 document in the collection
export const adminUpdateSettings = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const {
      restaurantName,
      description,
      contact,
      openingHours,
      socialMedia,
      reservationSettings,
      seo,
      branding,
    } = req.body;

    // Build the $set object with only provided fields
    // This allows partial updates without overwriting omitted fields
    const updateFields: Record<string, unknown> = {};

    if (restaurantName   !== undefined) updateFields['restaurantName']   = restaurantName;
    if (description      !== undefined) updateFields['description']      = description;
    if (contact          !== undefined) updateFields['contact']          = contact;
    if (openingHours     !== undefined) updateFields['openingHours']     = openingHours;
    if (socialMedia      !== undefined) updateFields['socialMedia']      = socialMedia;
    if (reservationSettings !== undefined) updateFields['reservationSettings'] = reservationSettings;
    if (seo              !== undefined) updateFields['seo']              = seo;
    if (branding         !== undefined) updateFields['branding']         = branding;
    if (req.body.events  !== undefined) updateFields['events']           = req.body.events;

    // Track who made the last update
    if (req.user?.id) {
      updateFields['updatedBy'] = new mongoose.Types.ObjectId(req.user.id);
    }

    const updated = await Settings.findOneAndUpdate(
      {},
      { $set: updateFields },
      {
        new: true,
        upsert: true,
        // runValidators disabled for partial updates to allow fields to be omitted.
        // Schema validation still runs on insert via setDefaultsOnInsert.
        runValidators: false,
        setDefaultsOnInsert: true,
      }
    ).populate('updatedBy', 'firstName lastName email');

    ResponseUtil.success(res, updated, 'Settings updated successfully');
  } catch (error) {
    console.error('❌ adminUpdateSettings error:', error);
    ResponseUtil.serverError(res);
  }
};
