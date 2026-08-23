export type Role = 'CUSTOMER' | 'ORGANISER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  seats?: Seat[];
}

export interface Seat {
  id: string;
  row: string;
  column: number;
  label: string;
  category: string;
}

export interface EventPricing {
  category: string;
  price: string | number;
}

export interface EventItem {
  id: string;
  title: string;
  type: 'MOVIE' | 'CONCERT';
  date: string;
  startTime: string;
  venue: Venue;
  pricing: EventPricing[];
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface SeatMapEntry {
  showSeatId: string;
  seatId: string;
  row: string;
  column: number;
  label: string;
  category: string;
  status: SeatStatus;
  heldUntil: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface ModerationEvent {
  id: string;
  title: string;
  type: 'MOVIE' | 'CONCERT';
  date: string;
  startTime: string;
  venue: Venue;
  organiser: { id: string; name: string; email: string };
  _count: { showSeats: number; bookings: number };
}

export interface OrganiserBooking {
  id: string;
  bookingRef: string;
  status: 'CONFIRMED' | 'CANCELLED';
  totalAmount: string | number;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  seats: { category: string; price: string | number; showSeat: { seat: Seat } }[];
}

export interface Booking {
  id: string;
  bookingRef: string;
  status: 'CONFIRMED' | 'CANCELLED';
  qrCodeData: string | null;
  createdAt: string;
  totalAmount: string | number;
  event: EventItem;
  seats: { category: string; price: string | number; showSeat: { seat: Seat } }[];
}

export interface WaitlistEntry {
  id: string;
  category: string;
  status: 'WAITING' | 'OFFERED' | 'EXPIRED' | 'FULFILLED' | 'CANCELLED';
  offerExpiresAt: string | null;
  offeredSeatId?: string | null;
  event: EventItem;
}
