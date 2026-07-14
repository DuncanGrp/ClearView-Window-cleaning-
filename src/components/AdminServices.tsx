/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ServiceItem, ExtraOption, QuoteRequest } from '../types';
import { Api } from '../api';
import { Check, Edit, Trash2, Plus, Sparkles, FolderPlus, CheckCircle2, FileText, Send, HelpCircle } from 'lucide-react';

interface AdminServicesProps {
  services: ServiceItem[];
  extras: ExtraOption[];
  quotes: QuoteRequest[];
  onRefreshAll: () => void;
  onSendFCMNotification: (title: string, body: string) => void;
}

export const AdminServices: React.FC<AdminServicesProps> = ({
  services,
  extras,
  quotes,
  onRefreshAll,
  onSendFCMNotification
}) => {
  // Service editor states
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [srvName, setSrvName] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvCategory, setSrvCategory] = useState<'domestic' | 'commercial' | 'extra'>('domestic');
  const [srvBasePrice, setSrvBasePrice] = useState(25);

  // Quote conversion states
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [quotePriceOverride, setQuotePriceOverride] = useState(100);
  const [quoteBookingDate, setQuoteBookingDate] = useState('2026-07-16');
  const [quoteBookingSlot, setQuoteBookingSlot] = useState('11:00 - 13:00');
  const [isConverting, setIsConverting] = useState(false);

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName || !srvDesc) return;
    try {
      await Api.createService({
        name: srvName,
        description: srvDesc,
        category: srvCategory,
        basePrice: srvBasePrice
      });
      setIsAddingService(false);
      setSrvName('');
      setSrvDesc('');
      onRefreshAll();
      onSendFCMNotification('Service Added', `New business service "${srvName}" is now active and selectable by customers.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateServicePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      await Api.updateService(editingService.id, {
        basePrice: srvBasePrice,
        description: srvDesc
      });
      setEditingService(null);
      onRefreshAll();
      onSendFCMNotification('Pricing Adjusted', `Base rates updated for "${editingService.name}". New rate: £${srvBasePrice}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('Are you sure you want to retire this cleaning package?')) {
      try {
        await Api.deleteService(id);
        onRefreshAll();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleConvertQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    setIsConverting(true);
    try {
      // 1. Convert quote on backend
      await Api.updateQuote(selectedQuote.id, {
        status: 'converted',
        estimatedPrice: quotePriceOverride
      });

      // 2. Schedule real booking automatically
      await Api.createBooking({
        customerName: selectedQuote.customerName,
        customerEmail: selectedQuote.customerEmail,
        customerPhone: selectedQuote.customerPhone,
        address: selectedQuote.address,
        propertyType: selectedQuote.propertyType,
        windowsCount: selectedQuote.windowsCount,
        floorsCount: selectedQuote.floorsCount,
        serviceId: 'srv-domestic', // assume standard
        extras: selectedQuote.extras,
        frequency: selectedQuote.frequency,
        date: quoteBookingDate,
        timeSlot: quoteBookingSlot,
        price: quotePriceOverride,
        notes: `[Converted from custom quote ${selectedQuote.id}] ${selectedQuote.notes}`
      });

      setSelectedQuote(null);
      onRefreshAll();
      onSendFCMNotification(
        'Quote Converted',
        `Successfully generated booking for ${selectedQuote.customerName} on ${quoteBookingDate} (£${quotePriceOverride}).`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleSendQuoteEmail = async (quote: QuoteRequest) => {
    try {
      await Api.updateQuote(quote.id, { status: 'sent' });
      onRefreshAll();
      onSendFCMNotification('Quote Sent', `Formal assessment proposal for £${quote.estimatedPrice} dispatched to ${quote.customerName}.`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
      
      {/* Services List / Admin Editors */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-800">Company Cleaning Catalog</h2>
          <button
            onClick={() => {
              setIsAddingService(true);
              setEditingService(null);
              setSrvName('');
              setSrvDesc('');
              setSrvBasePrice(25);
            }}
            className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Package
          </button>
        </div>

        {/* Adding service modal overlay/form */}
        {(isAddingService || editingService) && (
          <form
            onSubmit={isAddingService ? handleCreateService : handleUpdateServicePrice}
            className="p-5 border border-slate-200 rounded-3xl bg-slate-50 space-y-4 shadow-sm animate-in slide-in-from-top-2"
          >
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {isAddingService ? 'Add Custom Service Package' : `Edit Pricing for: ${editingService?.name}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {isAddingService && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Package Name</label>
                    <input
                      type="text"
                      required
                      value={srvName}
                      onChange={e => setSrvName(e.target.value)}
                      placeholder="e.g. Solar Panel Deep Cleaning"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select
                      value={srvCategory}
                      onChange={e => setSrvCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="domestic">Domestic</option>
                      <option value="commercial">Commercial</option>
                      <option value="extra">Extra Add-on</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Base Price (£)</label>
                <input
                  type="number"
                  required
                  value={srvBasePrice}
                  onChange={e => setSrvBasePrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service description / specifications</label>
                <textarea
                  required
                  rows={2}
                  value={srvDesc}
                  onChange={e => setSrvDesc(e.target.value)}
                  placeholder="Details about equipment used, window poles limits..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setIsAddingService(false); setEditingService(null); }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
              >
                Save Package
              </button>
            </div>
          </form>
        )}

        {/* Services mapping cards */}
        <div className="space-y-4">
          {services.map(srv => (
            <div key={srv.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-800 text-sm">{srv.name}</h4>
                  <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded border uppercase text-slate-500">
                    {srv.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal max-w-md">{srv.description}</p>
                <p className="text-xs font-bold text-indigo-600">Base Clean cost: £{srv.basePrice}</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingService(srv);
                    setIsAddingService(false);
                    setSrvBasePrice(srv.basePrice);
                    setSrvDesc(srv.description);
                  }}
                  className="p-2 border border-slate-200 hover:border-slate-400 bg-white text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                  title="Modify rate"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteService(srv.id)}
                  className="p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer"
                  title="Delete service"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Custom Quotes inbox & Converters */}
      <div className="lg:col-span-5 space-y-6 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-6 lg:pt-0">
        <h2 className="text-base font-extrabold text-slate-800">Custom Quote Inbox ({quotes.filter(q => q.status === 'pending').length} pending)</h2>

        <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
          {quotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-white border border-slate-150 rounded-2xl">
              No custom quote requests.
            </div>
          ) : (
            quotes.map(q => (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4.5 space-y-3.5 shadow-2xs">
                
                {/* Quote Header */}
                <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-xs">{q.customerName}</h3>
                    <p className="text-[10px] text-slate-400 truncate max-w-xs">📍 {q.address}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    q.status === 'converted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : q.status === 'sent'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {q.status}
                  </span>
                </div>

                {/* Parameters details */}
                <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p><strong>Property:</strong> {q.propertyType.replace('-', ' ')} • {q.windowsCount} windows • {q.floorsCount} floors</p>
                  {q.notes && <p className="italic">💬 "{q.notes}"</p>}
                </div>

                {/* Estimate price */}
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-400">Proposed Rate:</span>
                  <span className="font-black text-slate-900 text-sm">£{q.estimatedPrice}</span>
                </div>

                {/* Actions */}
                {q.status !== 'converted' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSendQuoteEmail(q)}
                      className="flex-1 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 py-2 text-center text-xs font-bold text-blue-700 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Email Quote
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQuote(q);
                        setQuotePriceOverride(q.estimatedPrice);
                      }}
                      className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-2 text-center text-xs font-bold text-white cursor-pointer"
                    >
                      Convert to Booking
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Convert Quote popup modal drawer */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-extrabold text-slate-800">Convert Custom Quote inquiry</h3>
            <p className="mt-1 text-xs text-slate-500">Converts quote requested by {selectedQuote.customerName} into a real scheduled booking.</p>
            
            <form onSubmit={handleConvertQuote} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Agreed Price Override (£)</label>
                <input
                  type="number"
                  required
                  value={quotePriceOverride}
                  onChange={e => setQuotePriceOverride(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Schedule Booking Date</label>
                <input
                  type="date"
                  required
                  value={quoteBookingDate}
                  onChange={e => setQuoteBookingDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Schedule Arrival Window</label>
                <select
                  value={quoteBookingSlot}
                  onChange={e => setQuoteBookingSlot(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="08:30 - 10:30">08:30 - 10:30</option>
                  <option value="11:00 - 13:00">11:00 - 13:00</option>
                  <option value="13:30 - 15:30">13:30 - 15:30</option>
                  <option value="16:00 - 18:00">16:00 - 18:00</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white cursor-pointer disabled:opacity-50"
                >
                  {isConverting ? 'Scheduling booking...' : 'Approve & Schedule clean'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
