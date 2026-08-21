import mongoose, { Document, Schema, Types } from 'mongoose';
import { ReservationStatus, CONSTANTS } from '../config/constants';

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface ReservationCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface StatusHistoryEntry {
  status: ReservationStatus;
  changedBy?: Types.ObjectId;
  changedAt: Date;
  note?: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IReservation extends Document {
  customer: ReservationCustomer;
  date: Date;
  time: string;
  guests: number;
  specialRequest?: string;
  status: ReservationStatus;
  statusHistory: StatusHistoryEntry[];
  tableNumber?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schema: Customer ─────────────────────────────────────────────────────

const customerSchema = new Schema<ReservationCustomer>(
  {
    firstName: {
      type: String,
      required: [true, 'Customer first name is required'],
      trim: true,
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Customer last name is required'],
      trim: true,
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
  },
  { _id: false }
);

// ─── Sub-schema: StatusHistory ────────────────────────────────────────────────

const statusHistorySchema = new Schema<StatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: Object.values(CONSTANTS.RESERVATION_STATUS),
      required: [true, 'Status is required'],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    changedAt: {
      type: Date,
      required: [true, 'Change date is required'],
      default: () => new Date(),
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note must not exceed 500 characters'],
      default: undefined,
    },
  },
  { _id: false }
);

// ─── Schema ───────────────────────────────────────────────────────────────────

const reservationSchema = new Schema<IReservation>(
  {
    customer: {
      type: customerSchema,
      required: [true, 'Customer information is required'],
    },
    date: {
      type: Date,
      required: [true, 'Reservation date is required'],
    },
    time: {
      type: String,
      required: [true, 'Reservation time is required'],
      trim: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format'],
    },
    guests: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [CONSTANTS.MIN_GUESTS_PER_RESERVATION, `Minimum ${CONSTANTS.MIN_GUESTS_PER_RESERVATION} guest required`],
      max: [CONSTANTS.MAX_GUESTS_PER_RESERVATION, `Maximum ${CONSTANTS.MAX_GUESTS_PER_RESERVATION} guests allowed`],
    },
    specialRequest: {
      type: String,
      trim: true,
      maxlength: [1000, 'Special request must not exceed 1000 characters'],
      default: undefined,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(CONSTANTS.RESERVATION_STATUS),
        message: 'Invalid reservation status',
      },
      default: CONSTANTS.RESERVATION_STATUS.PENDING,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    tableNumber: {
      type: String,
      trim: true,
      default: undefined,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Pre-save hook: initialize statusHistory on creation ──────────────────────

reservationSchema.pre('save', function (next) {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      note: 'Reservation created',
    });
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

reservationSchema.index({ date: 1, status: 1 });               // Daily reservation queries + admin filtering
reservationSchema.index({ 'customer.email': 1 });               // Lookup by customer email
reservationSchema.index({ status: 1, createdAt: -1 });         // Admin list sorted by date
reservationSchema.index({ date: 1, time: 1 });                 // Availability slot checks
reservationSchema.index({ reminderSent: 1, date: 1, status: 1 }); // Reminder cron job queries

// ─── Model ────────────────────────────────────────────────────────────────────

export const Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);
