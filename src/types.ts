/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'GUEST' | 'CUSTOMER' | 'CLEANER' | 'ADMIN';

export interface UserSession {
  role: UserRole;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  addresses?: string[];
}

export type PropertyType = 'semi-detached' | 'detached' | 'terraced' | 'apartment' | 'commercial-low' | 'commercial-high';

export type CleaningFrequency = 'one-off' | '4-weeks' | '6-weeks' | '8-weeks';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: 'domestic' | 'commercial' | 'extra';
  basePrice: number;
}

export interface ExtraOption {
  id: string;
  name: string;
  price: number;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rain_delay'
  | 'no_access';

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  propertyType: PropertyType;
  windowsCount: number;
  floorsCount: number;
  serviceId: string;
  serviceName: string;
  extras: string[]; // List of extra option ids
  frequency: CleaningFrequency;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 - 11:00"
  status: BookingStatus;
  cleanerId?: string; // Assigned cleaner ID
  cleanerName?: string;
  price: number;
  notes: string;
  gateCode?: string;
  parkingInfo?: string;
  hasDog?: boolean;
  beforePhotos: string[];
  afterPhotos: string[];
  cleanerNotes?: string;
  signatureSvg?: string; // Captured canvas signature
  rating?: number; // Star rating (1-5)
  reviewText?: string;
  reviewDate?: string;
  invoiceId?: string;
  createdAt: string;
}

export interface QuoteRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  propertyType: PropertyType;
  windowsCount: number;
  floorsCount: number;
  extras: string[];
  frequency: CleaningFrequency;
  notes: string;
  estimatedPrice: number;
  status: 'pending' | 'sent' | 'converted';
  createdAt: string;
}

export interface CleanerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  rating: number;
  completedJobsCount: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: string[];
  propertyDetails?: string;
  notes?: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  logoText: string;
  workingHoursStart: string; // e.g. "08:00"
  workingHoursEnd: string; // e.g. "17:00"
  holidayClosures: string[]; // List of "YYYY-MM-DD"
  cancellationPolicy: string;
  weatherPolicy: string;
  basePricePerWindow: number;
  basePricePerFloor: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}
