import mongoose, { Document, Schema, Types } from 'mongoose';
import { MultiLanguageText, multiLanguageTextSchema } from './menu-category.model';
import { CONSTANTS } from '../config/constants';

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface TimeSlot {
  open: string;  // HH:MM format
  close: string; // HH:MM format
}

export interface OpeningHours {
  day: DayOfWeek;
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface ISettings extends Document {
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
    heroImage?: string;        // Full-width background for the homepage hero section
    primaryColor?: string;
    secondaryColor?: string;
  };
  events?: Array<{
    title: string;
    description?: string;
    date?: string;        // ISO date string or 'À venir'
    time?: string;        // HH:MM
    imageUrl?: string;
    isVisible: boolean;
  }>;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const timeSlotSchema = new Schema<TimeSlot>(
  {
    open: {
      type: String,
      required: [true, 'Opening time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format'],
    },
    close: {
      type: String,
      required: [true, 'Closing time is required'],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format'],
    },
  },
  { _id: false }
);

const openingHoursSchema = new Schema<OpeningHours>(
  {
    day: {
      type: String,
      enum: {
        values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[],
        message: 'Invalid day of week',
      },
      required: [true, 'Day is required'],
    },
    isOpen: {
      type: Boolean,
      required: [true, 'isOpen flag is required'],
    },
    slots: {
      type: [timeSlotSchema],
      default: [],
    },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const settingsSchema = new Schema<ISettings>(
  {
    restaurantName: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [100, 'Restaurant name must not exceed 100 characters'],
    },
    description: {
      type: multiLanguageTextSchema,
      required: [true, 'Description is required'],
    },
    contact: {
      type: new Schema(
        {
          phone: {
            type: String,
            trim: true,
            default: '',
          },
          email: {
            type: String,
            lowercase: true,
            trim: true,
            default: '',
          },
          address: {
            type: new Schema(
              {
                street: { type: String, trim: true, default: '' },
                city: { type: String, trim: true, default: '' },
                postalCode: { type: String, trim: true, default: '' },
                country: { type: String, trim: true, default: 'Tunisia' },
              },
              { _id: false }
            ),
            default: {},
          },
          coordinates: {
            type: new Schema(
              {
                lat: { type: Number, default: 0 },
                lng: { type: Number, default: 0 },
              },
              { _id: false }
            ),
            default: {},
          },
        },
        { _id: false }
      ),
      default: {},
    },
    openingHours: {
      type: [openingHoursSchema],
      default: [],
    },
    socialMedia: {
      type: new Schema(
        {
          instagram: { type: String, trim: true, default: undefined },
          facebook: { type: String, trim: true, default: undefined },
          tiktok: { type: String, trim: true, default: undefined },
        },
        { _id: false }
      ),
      default: {},
    },
    reservationSettings: {
      type: new Schema(
        {
          maxGuestsPerReservation: {
            type: Number,
            default: CONSTANTS.MAX_GUESTS_PER_RESERVATION,
            min: 1,
          },
          minGuestsPerReservation: {
            type: Number,
            default: CONSTANTS.MIN_GUESTS_PER_RESERVATION,
            min: 1,
          },
          maxDailyReservations: {
            type: Number,
            default: CONSTANTS.MAX_DAILY_RESERVATIONS,
            min: 1,
          },
          advanceBookingDays: {
            type: Number,
            default: CONSTANTS.ADVANCE_BOOKING_DAYS,
            min: 1,
          },
          timeSlotDuration: {
            type: Number,
            default: CONSTANTS.TIME_SLOT_DURATION,
            min: 15,
          },
          autoConfirm: {
            type: Boolean,
            default: false,
          },
        },
        { _id: false }
      ),
      default: {},
    },
    seo: {
      type: new Schema(
        {
          metaTitle: { type: multiLanguageTextSchema, default: { fr: '' } },
          metaDescription: { type: multiLanguageTextSchema, default: { fr: '' } },
          keywords: { type: [String], default: [] },
        },
        { _id: false }
      ),
      default: {},
    },
    branding: {
      type: new Schema(
        {
          logo: { type: String, trim: true, default: undefined },
          favicon: { type: String, trim: true, default: undefined },
          heroImage: { type: String, trim: true, default: undefined },
          primaryColor: { type: String, trim: true, default: '#b59164' },
          secondaryColor: { type: String, trim: true, default: '#1a1a1a' },
        },
        { _id: false }
      ),
      default: {},
    },
    events: {
      type: [
        new Schema(
          {
            title:       { type: String, trim: true, required: true, maxlength: 200 },
            description: { type: String, trim: true, maxlength: 1000, default: undefined },
            date:        { type: String, trim: true, default: undefined },
            time:        { type: String, trim: true, default: undefined },
            imageUrl:    { type: String, trim: true, default: undefined },
            isVisible:   { type: Boolean, default: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
  },
  {
    // Settings is a singleton — use updatedAt but not createdAt
    timestamps: { createdAt: false, updatedAt: 'updatedAt' },
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Settings is a singleton — the collection will hold at most 1 document.
// No additional indexes needed; a single document is always found instantly by findOne().
// Index on updatedAt removed: unnecessary for singleton collection (see audit report)

// ─── Model ────────────────────────────────────────────────────────────────────

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
