/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CustomerProfile, Booking, QuoteRequest } from '../types';
import { Api } from '../api';
import { Search, MapPin, Phone, Mail, Clock, ShieldAlert, FileText, CheckCircle, Edit3, Trash2 } from 'lucide-react';

interface AdminCustomersProps {
  customers: CustomerProfile[];
  bookings: Booking[];
  quotes: QuoteRequest[];
  onRefreshCustomers: () => void;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customers,
  bookings,
  quotes,
  onRefreshCustomers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  // Notes update field
  const [customerNotes, setCustomerNotes] = useState('');
  const [propertyDetails, setPropertyDetails] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Search filter
  const filteredCustomers = customers.filter(cust => {
    const query = searchQuery.toLowerCase();
    return (
      cust.name.toLowerCase().includes(query) ||
      cust.email.toLowerCase().includes(query) ||
      cust.phone.includes(query) ||
      cust.addresses.some(addr => addr.toLowerCase().includes(query))
    );
  });

  const handleSelectCustomer = (cust: CustomerProfile) => {
    setSelectedCustomer(cust);
    setCustomerNotes(cust.notes || '');
    setPropertyDetails(cust.propertyDetails || '');
  };

  const handleUpdateCustomerNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setIsUpdating(true);
    try {
      const updated = await Api.updateCustomer(selectedCustomer.id, {
        notes: customerNotes,
        propertyDetails
      });
      setSelectedCustomer(updated);
      onRefreshCustomers();
      alert('Customer security notes and profile details updated successfully.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get customer stats
  const getCustomerBookings = (email: string) => bookings.filter(b => b.customerEmail.toLowerCase() === email.toLowerCase());
  const getCustomerQuotes = (email: string) => quotes.filter(q => q.customerEmail.toLowerCase() === email.toLowerCase());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
      
      {/* Left Column: Search & Customer list */}
      <div className="lg:col-span-5 space-y-4">
        
        {/* Header Search bar */}
        <div className="relative rounded-2xl bg-white border border-slate-200 p-3.5 shadow-2xs flex items-center gap-2.5">
          <Search className="h-4.5 w-4.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search clients by name, phone, post code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 outline-none"
          />
        </div>

        {/* Clients list cards */}
        <div className="space-y-3 max-h-[550px] overflow-y-auto scrollbar-thin">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-white border border-slate-150 rounded-2xl">
              No clients matched search parameters.
            </div>
          ) : (
            filteredCustomers.map(cust => {
              const isSelected = selectedCustomer?.id === cust.id;
              const myHistory = getCustomerBookings(cust.email);
              return (
                <button
                  key={cust.id}
                  onClick={() => handleSelectCustomer(cust)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all flex flex-col justify-between gap-2 shadow-2xs cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/15'
                      : 'border-slate-150 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">{cust.name}</h3>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">📧 {cust.email}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">📞 {cust.phone}</p>
                  </div>

                  <div className="border-t border-slate-100/80 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>📍 {cust.addresses.length} registered locations</span>
                    <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {myHistory.length} bookings completed
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Detailed customer sheet */}
      <div className="lg:col-span-7">
        {selectedCustomer ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
            
            {/* Customer Title Card */}
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[9px] font-bold font-mono text-slate-400 uppercase">CLIENT ACCOUNT PROFILE</span>
              <h2 className="text-lg font-black text-slate-900 mt-1">{selectedCustomer.name}</h2>
              
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {selectedCustomer.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {selectedCustomer.phone}</span>
              </div>
            </div>

            {/* Admin updater notes Form */}
            <form onSubmit={handleUpdateCustomerNotes} className="space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Access & Property Constraints</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Property Layout Details</label>
                  <input
                    type="text"
                    value={propertyDetails}
                    onChange={e => setPropertyDetails(e.target.value)}
                    placeholder="e.g. 3-story detached house, 14 windows, conservatory at rear."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Access Instructions / Gate Codes / Dog Alerts</label>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    placeholder="e.g. Gate code is #1404. Friendly Barney dog is in garden."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {isUpdating ? 'Saving profile...' : 'Save Profile Notes'}
              </button>
            </form>

            {/* Saved Locations */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Service Addresses</h4>
              <div className="space-y-1.5 text-xs text-slate-600">
                {selectedCustomer.addresses.map((addr, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2 rounded-xl">
                    <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                    <span>{addr}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bookings & Quotes logs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              
              {/* Completed cleans column */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Appointment logs ({getCustomerBookings(selectedCustomer.email).length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {getCustomerBookings(selectedCustomer.email).map(b => (
                    <div key={b.id} className="p-2.5 border border-slate-100 rounded-xl text-[11px] bg-slate-50/50">
                      <div className="flex justify-between font-bold">
                        <span className="text-blue-600">{b.id}</span>
                        <span>£{b.price}</span>
                      </div>
                      <p className="mt-1 text-slate-600 font-medium truncate">{b.serviceName}</p>
                      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                        <span>📅 {b.date}</span>
                        <span className="uppercase text-[9px] font-black">{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Quote requests column */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Custom Quote requests ({getCustomerQuotes(selectedCustomer.email).length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {getCustomerQuotes(selectedCustomer.email).map(q => (
                    <div key={q.id} className="p-2.5 border border-slate-100 rounded-xl text-[11px] bg-slate-50/50">
                      <div className="flex justify-between font-bold">
                        <span className="text-amber-600">{q.id}</span>
                        <span>Est £{q.estimatedPrice}</span>
                      </div>
                      <p className="mt-1 text-slate-600 font-medium truncate">Windows count: {q.windowsCount}</p>
                      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                        <span>📅 {new Date(q.createdAt).toLocaleDateString()}</span>
                        <span className="uppercase text-[9px] font-black">{q.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="h-full rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Search className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-semibold">Select a Customer</p>
            <p className="text-xs text-slate-400 mt-1">Select any client profile on the left to verify active routes, edit access notes, and check service invoice logs.</p>
          </div>
        )}
      </div>

    </div>
  );
};
