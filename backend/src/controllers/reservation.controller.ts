import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Reservation } from '../models/reservation.model';
import { Settings } from '../models/settings.model';
import { ResponseUtil } from '../utils/response.util';
import { CONSTANTS, ReservationStatus } from '../config/constants';
import { sendReservationConfirmation, sendReservationStatusUpdate } from '../services/email.service';

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
 * Reads reservationSettings from the singleton Settings document.
 * Falls back to CONSTANTS values if no Settings document exists.
 */
async function getReservationSettings() {
  try {
    const settings = await Settings.findOne().select('reservationSettings').lean();
    const rs = settings?.reservationSettings;
    return {
      minGuests:           rs?.minGuestsPerReservation ?? CONSTANTS.MIN_GUESTS_PER_RESERVATION,
      maxGuests:           rs?.maxGuestsPerReservation ?? CONSTANTS.MAX_GUESTS_PER_RESERVATION,
      maxDailyReservations: rs?.maxDailyReservations   ?? CONSTANTS.MAX_DAILY_RESERVATIONS,
      advanceBookingDays:  rs?.advanceBookingDays      ?? CONSTANTS.ADVANCE_BOOKING_DAYS,
      timeSlotDuration:    rs?.timeSlotDuration        ?? CONSTANTS.TIME_SLOT_DURATION,
      autoConfirm:         rs?.autoConfirm             ?? false,
    };
  } catch {
    // If Settings lookup fails (e.g. DB issue), fall back to constants silently
    return {
      minGuests:           CONSTANTS.MIN_GUESTS_PER_RESERVATION,
      maxGuests:           CONSTANTS.MAX_GUESTS_PER_RESERVATION,
      maxDailyReservations: CONSTANTS.MAX_DAILY_RESERVATIONS,
      advanceBookingDays:  CONSTANTS.ADVANCE_BOOKING_DAYS,
      timeSlotDuration:    CONSTANTS.TIME_SLOT_DURATION,
      autoConfirm:         false,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/reservations
export const createReservation = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { customer, date, time, guests, specialRequest } = req.body;

    // ── Load dynamic settings (with fallback to CONSTANTS) ──────────────────
    const rs = await getReservationSettings();

    // ── Validate guests against dynamic settings ──────────────────────────
    const guestsNum = Number(guests);
    if (guestsNum < rs.minGuests || guestsNum > rs.maxGuests) {
      ResponseUtil.error(res, 'Validation failed', [{
        field: 'guests',
        message: `Number of guests must be between ${rs.minGuests} and ${rs.maxGuests}`,
      }], 422);
      return;
    }

    // ── Validate date against dynamic advanceBookingDays ──────────────────
    const reservationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reservationDate.setHours(0, 0, 0, 0);

    if (reservationDate < today) {
      ResponseUtil.error(res, 'Validation failed', [{
        field: 'date',
        message: 'Reservation date cannot be in the past',
      }], 422);
      return;
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + rs.advanceBookingDays);
    maxDate.setHours(23, 59, 59, 999);

    if (reservationDate > maxDate) {
      ResponseUtil.error(res, 'Validation failed', [{
        field: 'date',
        message: `Reservations can only be made up to ${rs.advanceBookingDays} days in advance`,
      }], 422);
      return;
    }

    // ── Check daily reservation limit ──────────────────────────────────────
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dailyCount = await Reservation.countDocuments({
      date: { $gte: dayStart, $lte: dayEnd },
      status: {
        $in: [
          CONSTANTS.RESERVATION_STATUS.PENDING,
          CONSTANTS.RESERVATION_STATUS.CONFIRMED,
        ],
      },
    });

    if (dailyCount >= rs.maxDailyReservations) {
      ResponseUtil.error(res, 'No availability', [{
        field: 'date',
        message: `No more reservations available on this date (maximum ${rs.maxDailyReservations} reached)`,
      }], 409);
      return;
    }

    // ── Determine initial status (autoConfirm support) ────────────────────
    const initialStatus = rs.autoConfirm
      ? CONSTANTS.RESERVATION_STATUS.CONFIRMED
      : CONSTANTS.RESERVATION_STATUS.PENDING;

    const reservation = new Reservation({
      customer,
      date: new Date(date),
      time,
      guests: guestsNum,
      specialRequest,
      status: initialStatus,
      // statusHistory initialized by pre-save hook
    });

    await reservation.save();

    // ── Return only necessary public fields ──────────────────────────────
    const publicData = {
      _id: reservation._id,
      customer: {
        firstName: reservation.customer.firstName,
        lastName: reservation.customer.lastName,
        email: reservation.customer.email,
      },
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      specialRequest: reservation.specialRequest,
      status: reservation.status,
      createdAt: reservation.createdAt,
    };

    const message = rs.autoConfirm
      ? 'Reservation confirmed! We look forward to welcoming you.'
      : 'Reservation created successfully. We will confirm your booking shortly.';

    // ── Send confirmation email (fire-and-forget — never blocks HTTP response) ──
    sendReservationConfirmation({
      customerFirstName: reservation.customer.firstName,
      customerLastName:  reservation.customer.lastName,
      customerEmail:     reservation.customer.email,
      date:              reservation.date,
      time:              reservation.time,
      guests:            reservation.guests,
      specialRequest:    reservation.specialRequest,
      reservationId:     reservation._id.toString(),
      status:            reservation.status as 'pending' | 'confirmed',
    });

    ResponseUtil.created(res, publicData, message);
  } catch (error) {
    console.error('❌ createReservation error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/reservations/:id
// Public: allows a customer to check their own reservation status
export const getReservationById = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const reservation = await Reservation.findById(req.params.id).lean();

    if (!reservation) {
      ResponseUtil.notFound(res, 'Reservation not found');
      return;
    }

    // Return limited public data — do NOT expose statusHistory, tableNumber, reminderSent
    const publicData = {
      _id: reservation._id,
      customer: {
        firstName: reservation.customer.firstName,
        lastName: reservation.customer.lastName,
        // email intentionally omitted on public lookup to avoid enumeration
      },
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      specialRequest: reservation.specialRequest,
      status: reservation.status,
      createdAt: reservation.createdAt,
    };

    ResponseUtil.success(res, publicData, 'Reservation retrieved successfully');
  } catch (error) {
    console.error('❌ getReservationById error:', error);
    ResponseUtil.serverError(res);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/reservations/admin
export const adminGetReservations = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const {
      status,
      date,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};

    if (status) {
      filter['status'] = status;
    }

    // Filter by specific date (day)
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      filter['date'] = { $gte: dayStart, $lte: dayEnd };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [reservations, total] = await Promise.all([
      Reservation.find(filter)
        .sort({ date: 1, time: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reservation.countDocuments(filter),
    ]);

    ResponseUtil.success(res, {
      reservations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Reservations retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetReservations error:', error);
    ResponseUtil.serverError(res);
  }
};

// GET /api/reservations/admin/:id
export const adminGetReservationById = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    // Populate changedBy in statusHistory with user name
    const reservation = await Reservation.findById(req.params.id)
      .populate('statusHistory.changedBy', 'firstName lastName email')
      .lean();

    if (!reservation) {
      ResponseUtil.notFound(res, 'Reservation not found');
      return;
    }

    ResponseUtil.success(res, reservation, 'Reservation retrieved successfully');
  } catch (error) {
    console.error('❌ adminGetReservationById error:', error);
    ResponseUtil.serverError(res);
  }
};

// PUT /api/reservations/admin/:id/status
export const updateReservationStatus = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const { id } = req.params;
    const { status, note, tableNumber } = req.body as {
      status: ReservationStatus;
      note?: string;
      tableNumber?: string;
    };

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      ResponseUtil.notFound(res, 'Reservation not found');
      return;
    }

    const previousStatus = reservation.status;

    // Prevent redundant status updates
    if (previousStatus === status) {
      ResponseUtil.error(res, `Reservation is already in '${status}' status`, undefined, 400);
      return;
    }

    // Apply the status change
    reservation.status = status;

    // Append to statusHistory — never overwrite existing history
    reservation.statusHistory.push({
      status,
      changedBy: req.user?.id
        ? new mongoose.Types.ObjectId(req.user.id)
        : undefined,
      changedAt: new Date(),
      note: note?.trim() || `Status changed from '${previousStatus}' to '${status}'`,
    });

    // Optional: assign table number when confirming
    if (tableNumber !== undefined) {
      reservation.tableNumber = tableNumber;
    }

    await reservation.save();

    // Populate for response
    await reservation.populate('statusHistory.changedBy', 'firstName lastName email');

    // ── Send status update email (fire-and-forget) ─────────────────────────
    sendReservationStatusUpdate({
      customerFirstName: reservation.customer.firstName,
      customerLastName:  reservation.customer.lastName,
      customerEmail:     reservation.customer.email,
      date:              reservation.date,
      time:              reservation.time,
      guests:            reservation.guests,
      specialRequest:    reservation.specialRequest,
      reservationId:     reservation._id.toString(),
      status:            status as 'confirmed' | 'cancelled' | 'rejected',
    });

    ResponseUtil.success(res, reservation, `Reservation status updated to '${status}'`);
  } catch (error) {
    console.error('❌ updateReservationStatus error:', error);
    ResponseUtil.serverError(res);
  }
};

// DELETE /api/reservations/admin/:id
export const adminDeleteReservation = async (req: Request, res: Response): Promise<void> => {
  if (handleValidationErrors(req, res)) return;

  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      ResponseUtil.notFound(res, 'Reservation not found');
      return;
    }

    // Only allow deletion of cancelled/rejected/completed reservations
    const deletableStatuses: ReservationStatus[] = [
      CONSTANTS.RESERVATION_STATUS.CANCELLED,
      CONSTANTS.RESERVATION_STATUS.REJECTED,
      CONSTANTS.RESERVATION_STATUS.COMPLETED,
    ];

    if (!deletableStatuses.includes(reservation.status)) {
      ResponseUtil.error(
        res,
        `Cannot delete a reservation with status '${reservation.status}'. Cancel or reject it first.`,
        undefined,
        409
      );
      return;
    }

    await Reservation.findByIdAndDelete(req.params.id);

    ResponseUtil.success(res, null, 'Reservation deleted successfully');
  } catch (error) {
    console.error('❌ adminDeleteReservation error:', error);
    ResponseUtil.serverError(res);
  }
};
