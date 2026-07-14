/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Booking, CleanerProfile } from '../types';
import { Api } from '../api';
import { Clock, Check, UserPlus, XCircle, MapPin, Calendar as CalendarIcon, DollarSign, User, Sparkles, Shield, AlertTriangle, ChevronRight, Phone, Mail } from 'lucide-react';

interface AdminPendingBookingsProps {
  bookings: Booking[];
  cleaners: CleanerProfile[];
  onRefreshBookings: () => void;
  onSendFCMNotification: (title: string, body: string) => void;
}

export const AdminPendingBookings: React.FC<AdminPendingBookingsProps> = ({
  bookings,
  cleaners,
  onRefreshBookings,
  onSendFCMNotification
}) => {
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  const [selectedCleanerId, setSelectedCleanerId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const activeCleaners = cleaners.filter(c => c.status === 'active');

  const handleAcceptBooking = async (bookingId: string) => {
    setActionLoading(bookingId + '-accept');
    try {
      await Api.updateBooking(bookingId, { status: 'confirmed' });
      onRefreshBookings();
      onSendFCMNotification(
        'Booking Accepted',
        `Your window cleaning booking (${bookingId}) has been officially accepted by ClearView Admin!`
      );
    } catch (err) {
      console.error('Failed to accept booking', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel/decline this booking?')) return;
    setActionLoading(bookingId + '-decline');
    try {
      await Api.updateBooking(bookingId, { status: 'cancelled' });
      onRefreshBookings();
      onSendFCMNotification(
        'Booking Declined',
        `The appointment booking (${bookingId}) has been cancelled by ClearView Admin.`
      );
    } catch (err) {
      console.error('Failed to decline booking', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignCleaner = async (bookingId: string) => {
    if (!selectedCleanerId) {
      alert('Please select a technician first.');
      return;
    }
    const cleaner = activeCleaners.find(c => c.id === selectedCleanerId);
    if (!cleaner) return;

    setActionLoading(bookingId + '-assign');
    try {
      await Api.updateBooking(bookingId, {
        cleanerId: cleaner.id,
        cleanerName: cleaner.name,
        status: 'assigned'
      });
      setAssigningBookingId(null);
      setSelectedCleanerId('');
      onRefreshBookings();
      onSendFCMNotification(
        'Technician Assigned',
        `Technician ${cleaner.name} has been dispatched to handle your window clean (${bookingId}) on date scheduled.`
      );
    } catch (err) {
      console.error('Failed to assign cleaner', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-150 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-150">
            <Clock className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Pending Bookings Approval Center</h2>
            <p className="text-[11px] text-slate-400">Review, accept, and allocate field professionals to newly requested appointments.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Unapproved Requests:</span>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
            {pendingBookings.length} Bookings
          </span>
        </div>
      </div>

      {pendingBookings.length === 0 ? (
        <div className="bg-white border border-slate-150 rounded-3xl p-10 text-center space-y-4 shadow-sm max-w-2xl mx-auto mt-6">
          <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <Check className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">All Bookings Approved!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no pending booking alerts waiting in the queue. All customer-initiated schedules are active, confirmed, or dispatched.
            </p>
          </div>
          <button
            onClick={onRefreshBookings}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Force Sync Queue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingBookings.map(job => (
            <div key={job.id} className="relative rounded-3xl border border-slate-200 bg-white p-5 hover:border-slate-350 transition-all shadow-xs space-y-4 flex flex-col justify-between">
              
              {/* Card Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-mono text-indigo-600">{job.id}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{job.frequency}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">{job.customerName}</h3>
                </div>
                
                <div className="text-right">
                  <span className="block text-sm font-black text-slate-950">£{job.price}</span>
                  <span className="text-[9px] text-slate-400 block font-semibold">{job.windowsCount} windows • {job.floorsCount} floors</span>
                </div>
              </div>

              {/* Service & Details Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Service Requested</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {job.serviceName}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Schedule Timeslot</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {job.date} ({job.timeSlot.split(' - ')[0]})
                  </span>
                </div>

                <div className="col-span-2 space-y-1 pt-1.5 border-t border-slate-200/40">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Address Location</span>
                  <span className="font-semibold text-slate-700 flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{job.address}</span>
                  </span>
                </div>
              </div>

              {/* Contact Information & Notes */}
              <div className="text-[11px] text-slate-600 space-y-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" /> {job.customerPhone}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400 truncate" /> {job.customerEmail}</span>
                </div>
                {job.notes && (
                  <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-blue-950 font-medium italic">
                    " {job.notes} "
                  </div>
                )}
                {job.gateCode && (
                  <p className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-md inline-block">
                    🔐 Access Gate Code: {job.gateCode}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-3.5 flex flex-col gap-2">
                {assigningBookingId !== job.id ? (
                  <div className="flex flex-wrap gap-2 justify-between items-center">
                    <button
                      onClick={() => handleDeclineBooking(job.id)}
                      disabled={actionLoading !== null}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptBooking(job.id)}
                        disabled={actionLoading !== null}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="h-4 w-4 text-emerald-600" />
                        {actionLoading === job.id + '-accept' ? 'Confirming...' : 'Accept & Confirm'}
                      </button>

                      <button
                        onClick={() => {
                          setAssigningBookingId(job.id);
                          setSelectedCleanerId(activeCleaners[0]?.id || '');
                        }}
                        disabled={actionLoading !== null}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <UserPlus className="h-4 w-4" />
                        Accept & Assign Technician
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3 space-y-3 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Assign route specialist:</span>
                      <button
                        onClick={() => setAssigningBookingId(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedCleanerId}
                        onChange={e => setSelectedCleanerId(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500"
                      >
                        {activeCleaners.length === 0 ? (
                          <option value="">No active cleaners available</option>
                        ) : (
                          activeCleaners.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} (⭐ {c.rating} • {c.completedJobsCount} cleans)
                            </option>
                          ))
                        )}
                      </select>

                      <button
                        onClick={() => handleAssignCleaner(job.id)}
                        disabled={!selectedCleanerId || actionLoading !== null}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        {actionLoading === job.id + '-assign' ? 'Assigning...' : 'Confirm Dispatch'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
