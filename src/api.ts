/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Booking,
  BookingStatus,
  BusinessSettings,
  CleanerProfile,
  CustomerProfile,
  ExtraOption,
  QuoteRequest,
  ServiceItem,
  UserSession,
  AuditLog
} from './types';

// Simple API client wrapping our Express endpoints
export const Api = {
  async getSession(): Promise<UserSession> {
    const res = await fetch('/api/session');
    return res.json();
  },

  async switchSession(session: Partial<UserSession>): Promise<UserSession> {
    const res = await fetch('/api/session/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    return res.json();
  },

  async getServices(): Promise<{ services: ServiceItem[]; extras: ExtraOption[] }> {
    const res = await fetch('/api/services');
    return res.json();
  },

  async createService(srv: Partial<ServiceItem>): Promise<ServiceItem> {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(srv)
    });
    return res.json();
  },

  async updateService(id: string, srv: Partial<ServiceItem>): Promise<ServiceItem> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(srv)
    });
    return res.json();
  },

  async deleteService(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async getCleaners(): Promise<CleanerProfile[]> {
    const res = await fetch('/api/cleaners');
    return res.json();
  },

  async createCleaner(cleaner: Partial<CleanerProfile>): Promise<CleanerProfile> {
    const res = await fetch('/api/cleaners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaner)
    });
    return res.json();
  },

  async updateCleaner(id: string, cleaner: Partial<CleanerProfile>): Promise<CleanerProfile> {
    const res = await fetch(`/api/cleaners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaner)
    });
    return res.json();
  },

  async getCustomers(): Promise<CustomerProfile[]> {
    const res = await fetch('/api/customers');
    return res.json();
  },

  async registerCustomer(customer: { name: string; email: string; phone: string; address: string }): Promise<CustomerProfile> {
    const res = await fetch('/api/customers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },

  async updateCustomer(id: string, customer: Partial<CustomerProfile>): Promise<CustomerProfile> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    return res.json();
  },

  async getBookings(): Promise<Booking[]> {
    const res = await fetch('/api/bookings');
    return res.json();
  },

  async createBooking(booking: Partial<Booking>): Promise<Booking> {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });
    return res.json();
  },

  async updateBooking(id: string, update: Partial<Booking>): Promise<Booking> {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    return res.json();
  },

  async bulkPostponeBookings(date: string, newDate: string, reason: string): Promise<{ success: boolean; affectedCount: number }> {
    const res = await fetch('/api/bookings/bulk-postpone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, newDate, reason })
    });
    return res.json();
  },

  async getQuotes(): Promise<QuoteRequest[]> {
    const res = await fetch('/api/quotes');
    return res.json();
  },

  async createQuote(quote: Partial<QuoteRequest>): Promise<QuoteRequest> {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote)
    });
    return res.json();
  },

  async updateQuote(id: string, update: Partial<QuoteRequest>): Promise<QuoteRequest> {
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update)
    });
    return res.json();
  },

  async getSettings(): Promise<BusinessSettings> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async updateSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async getLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/logs');
    return res.json();
  }
};
