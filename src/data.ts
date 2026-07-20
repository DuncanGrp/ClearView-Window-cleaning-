/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceItem, ExtraOption, CleanerProfile, CustomerProfile, Booking, QuoteRequest, BusinessSettings } from './types';

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'srv-domestic',
    name: 'Domestic Window Cleaning',
    description: 'Exterior glass cleaning using pure water fed pole system. Reaches up to 3 floors high safely from the ground. Includes basic wipe of frames.',
    category: 'domestic',
    basePrice: 20,
  },
  {
    id: 'srv-commercial',
    name: 'Commercial Window Cleaning',
    description: 'Professional high-grade cleaning for retail, offices, and storefronts. Scheduled according to safety regulations and business hours.',
    category: 'commercial',
    basePrice: 60,
  },
  {
    id: 'srv-conservatory',
    name: 'Conservatory Roof Cleaning',
    description: 'Full deep clean of conservatory roofs, removing algae, moss, and weather stains. Restores glass or polycarbonate panels.',
    category: 'extra',
    basePrice: 45,
  },
  {
    id: 'srv-gutters',
    name: 'Gutter Clearance & Wash',
    description: 'Clearing debris and downspouts with our powerful gutter vacuum system, followed by an exterior wash of the plastic piping.',
    category: 'extra',
    basePrice: 40,
  },
];

export const INITIAL_EXTRAS: ExtraOption[] = [
  { id: 'ext-sills', name: 'Deep Sill & Frame Cleaning', price: 10 },
  { id: 'ext-conservatory', name: 'Conservatory Glass Sides Only', price: 25 },
  { id: 'ext-fascias', name: 'Fascias & Soffits Cleaned', price: 30 },
  { id: 'ext-inside', name: 'Internal Window Cleaning (Squeegee)', price: 15 },
  { id: 'ext-solar', name: 'Solar Panels Wash (x6)', price: 20 },
];

export const INITIAL_CLEANERS: CleanerProfile[] = [];

export const INITIAL_CUSTOMERS: CustomerProfile[] = [];

export const INITIAL_SETTINGS: BusinessSettings = {
  businessName: 'ClearView Premium Cleaning',
  businessEmail: 'support@clearviewcleaning.co.uk',
  businessPhone: '+44 1483 555789',
  logoText: 'ClearView',
  workingHoursStart: '08:00',
  workingHoursEnd: '17:30',
  holidayClosures: ['2026-12-25', '2026-12-26', '2026-01-01'],
  cancellationPolicy: 'Please notify us at least 24 hours prior to your scheduled cleaning. Cancellations within 24 hours are subject to a 50% call-out fee.',
  weatherPolicy: 'We operate in light drizzle and mist using our pure-water poles. In the event of heavy downpours or high winds, we will reschedule your job and notify you via SMS/Email.',
  basePricePerWindow: 2.5,
  basePricePerFloor: 5.0,
};

export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_QUOTES: QuoteRequest[] = [];
