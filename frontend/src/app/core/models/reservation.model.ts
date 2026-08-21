export interface Reservation {
  _id?: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  date: Date | string;
  time: string;
  guests: number;
  specialRequest?: string;
  status: ReservationStatus;
  statusHistory?: Array<{
    status: ReservationStatus;
    changedBy?: string;
    changedAt: Date;
    note?: string;
  }>;
  tableNumber?: string;
  reminderSent?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';

export interface CreateReservationDto {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  date: string;
  time: string;
  guests: number;
  specialRequest?: string;
}
