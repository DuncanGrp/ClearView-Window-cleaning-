/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, CleanerProfile, BookingStatus } from '../types';
import { Api } from '../api';
import { Calendar, Clock, Filter, AlertTriangle, ChevronLeft, ChevronRight, User, Check, RefreshCw, RefreshCwIcon, CloudLightning } from 'lucide-react';

interface AdminCalendarProps {
  bookings: Booking[];
  cleaners: CleanerProfile[];
  onRefreshBookings: () => void;
  onSendFCMNotification: (title: string, body: string) => void;
}

export const AdminCalendar: React.FC<AdminCalendarProps> = ({
  bookings,
  cleaners,
  onRefreshBookings,
  onSendFCMNotification
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-07-14')); // Enforce local test context date
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');
  
  // Filters
  const [filterCleanerId, setFilterCleanerId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Weather Rescheduling Trigger states
  const [showWeatherPostpone, setShowWeatherPostpone] = useState(false);
  const [postponeTargetDate, setPostponeTargetDate] = useState('2026-07-14');
  const [postponeNewDate, setPostponeNewDate] = useState('2026-07-17');
  const [postponeReason, setPostponeReason] = useState('Amber Warning: Heavy Rain & High Winds (>35mph)');
  const [isPostponing, setIsPostponing] = useState(false);

  // Selected Booking for Quick Reassignment drawer/modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filter bookings based on cleaner and status selection
  const filteredBookings = bookings.filter(b => {
    const matchCleaner = filterCleanerId === 'all' || b.cleanerId === filterCleanerId;
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchCleaner && matchStatus;
  });

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - (calendarView === 'day' ? 1 : calendarView === 'week' ? 7 : 30));
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + (calendarView === 'day' ? 1 : calendarView === 'week' ? 7 : 30));
    setCurrentDate(next);
  };

  const handleReassignCleaner = async (bookingId: string, cleanerId: string) => {
    try {
      const cleaner = cleaners.find(c => c.id === cleanerId);
      if (!cleaner) return;

      await Api.updateBooking(bookingId, {
        cleanerId,
        cleanerName: cleaner.name,
        status: 'assigned' // Auto-transition
      });
      setSelectedBooking(null);
      onRefreshBookings();
      onSendFCMNotification('Job Dispatched', `Technician ${cleaner.name} has been assigned to your window cleaning appointment (${bookingId}).`);
    } catch (err) {
      console.error('Failed to reassign cleaner', err);
    }
  };

  const handleQuickStatusChange = async (bookingId: string, status: BookingStatus) => {
    try {
      await Api.updateBooking(bookingId, { status });
      onRefreshBookings();
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking(null);
      }
      onSendFCMNotification('Booking Status Changed', `Your clearview appointment (${bookingId}) is now set to: ${status.toUpperCase().replace('_', ' ')}.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteWeatherPostpone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPostponing(true);
    try {
      const result = await Api.bulkPostponeBookings(postponeTargetDate, postponeNewDate, postponeReason);
      
      onRefreshBookings();
      setShowWeatherPostpone(false);
      
      if (result.affectedCount > 0) {
        onSendFCMNotification(
          'Weather Delay Triggered',
          `Adverse weather alert: rescheduled ${result.affectedCount} Guildford cleans from ${postponeTargetDate} to ${postponeNewDate}. Client notifications sent.`
        );
      } else {
        alert('No active or pending bookings were scheduled on ' + postponeTargetDate + ' to postpone.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostponing(false);
    }
  };

  // Generate Week Dates list
  const getWeekDates = () => {
    const dates = [];
    const temp = new Date(currentDate);
    // Go to monday of this week
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // adjust when sunday
    temp.setDate(diff);

    for (let i = 0; i < 6; i++) { // Mon - Sat (closed Sundays)
      dates.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return dates;
  };

  const weekDatesList = getWeekDates();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-150 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Calendar className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Visual Appointment Scheduler</h2>
            <p className="text-[11px] text-slate-400">Drag/click appointments to change technicians or postponement dates.</p>
          </div>
        </div>

        {/* Navigation & Views controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Nav Chevrons */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button onClick={handlePrevDay} className="p-2 hover:bg-slate-50 border-r border-slate-200 cursor-pointer">
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <span className="px-3.5 py-1.5 text-xs font-bold text-slate-700 select-none">
              {calendarView === 'day' && currentDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {calendarView === 'week' && `W/C ${weekDatesList[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
              {calendarView === 'month' && currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNextDay} className="p-2 hover:bg-slate-50 cursor-pointer">
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* View selector dropdown */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white text-xs font-semibold">
            <button
              onClick={() => setCalendarView('day')}
              className={`px-3 py-1.5 ${calendarView === 'day' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              Day
            </button>
            <button
              onClick={() => setCalendarView('week')}
              className={`px-3 py-1.5 border-l border-r border-slate-200 ${calendarView === 'week' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1.5 ${calendarView === 'month' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
            >
              Month
            </button>
          </div>

          {/* Weather reschedule button */}
          <button
            onClick={() => setShowWeatherPostpone(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 transition-all cursor-pointer shadow-sm"
          >
            <CloudLightning className="h-4 w-4 text-slate-950 animate-pulse" />
            Weather Postpone Trigger
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
        <span className="font-semibold text-slate-400 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" /> Filter by:
        </span>
        
        {/* Cleaner filter */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Technician</span>
          <select
            value={filterCleanerId}
            onChange={e => setFilterCleanerId(e.target.value)}
            className="bg-transparent outline-none font-semibold text-slate-700"
          >
            <option value="all">All Vets</option>
            {cleaners.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-transparent outline-none font-semibold text-slate-700"
          >
            <option value="all">All States</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="en_route">En Route</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rain_delay">Rain Delay</option>
          </select>
        </div>
      </div>

      {/* Week Calendar Board Grid */}
      {calendarView === 'week' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {weekDatesList.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === '2026-07-14';
            const daysJobs = filteredBookings.filter(b => b.date === dateStr);
            
            return (
              <div
                key={dateStr}
                className={`rounded-2xl border bg-white p-4.5 flex flex-col justify-between min-h-[300px] shadow-xs ${
                  isToday ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                }`}
              >
                {/* Day Header */}
                <div className="border-b border-slate-100 pb-2.5 mb-3 flex justify-between items-baseline">
                  <div>
                    <span className={`block text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {date.toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                    <span className="text-[11px] text-slate-400">{date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 rounded-md">
                    {daysJobs.length} jobs
                  </span>
                </div>

                {/* Day items */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px] scrollbar-thin">
                  {daysJobs.length === 0 ? (
                    <div className="text-center text-[10px] text-slate-300 py-12 select-none">
                      No Scheduled Cleans
                    </div>
                  ) : (
                    daysJobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedBooking(job)}
                        className={`w-full text-left p-2.5 rounded-xl border flex flex-col justify-between gap-1 shadow-2xs hover:scale-[1.01] transition-transform cursor-pointer ${
                          job.status === 'completed'
                            ? 'bg-emerald-50/40 border-emerald-100 text-emerald-950'
                            : job.status === 'rain_delay'
                              ? 'bg-amber-50/50 border-amber-100 text-amber-900'
                              : 'bg-slate-50 border-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold font-mono text-slate-400">{job.id}</span>
                          <span className={`text-[8px] font-black uppercase px-1 rounded ${
                            job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-[11px] font-bold truncate leading-tight mt-1">{job.customerName}</h4>
                        <p className="text-[9px] text-slate-400 truncate">⌚ {job.timeSlot.split(' - ')[0]}</p>
                        <div className="mt-1 pt-1 border-t border-slate-200/50 flex justify-between items-center text-[9px] text-slate-500 font-medium">
                          <span className="truncate">🧹 {job.cleanerName || '❌ UNASSIGNED'}</span>
                          <span className="font-bold text-slate-900">£{job.price}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fallback View cards for Day/Month view (Simple list format) */}
      {(calendarView === 'day' || calendarView === 'month') && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4 uppercase tracking-wider text-[11px] text-slate-400">
            Appointments List ({calendarView.toUpperCase()} view: {filteredBookings.length} matching jobs)
          </h3>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No matching bookings found for this view range.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookings.map(job => (
                <div key={job.id} className="border border-slate-150 p-4.5 rounded-2xl bg-slate-50/50 space-y-3 shadow-2xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-bold font-mono text-indigo-600">{job.id}</span>
                    <span className="text-xs font-bold text-slate-800">£{job.price}</span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs">{job.customerName}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">📍 {job.address}</p>
                  </div>

                  <div className="text-[10px] text-slate-600 space-y-1">
                    <p>📅 <strong>Date:</strong> {job.date}</p>
                    <p>⏱️ <strong>Timeslot:</strong> {job.timeSlot}</p>
                    <p>🧹 <strong>Technician:</strong> {job.cleanerName || '❌ Unassigned'}</p>
                  </div>

                  <button
                    onClick={() => setSelectedBooking(job)}
                    className="w-full text-center bg-white border border-slate-200 hover:border-slate-400 rounded-xl py-2 text-[11px] font-semibold text-slate-600 cursor-pointer"
                  >
                    Adjust Dispatch Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weather Postpone popup modal */}
      {showWeatherPostpone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mb-4 border border-amber-100">
              <CloudLightning className="h-5 w-5 animate-pulse shrink-0" />
              <div>
                <h4 className="text-xs font-bold">Mass Adverse Weather Postpone</h4>
                <p className="text-[10px] text-amber-700">Reschedules all bookings on a target day and triggers FCM updates.</p>
              </div>
            </div>

            <form onSubmit={handleExecuteWeatherPostpone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Target Postpone Date</label>
                <input
                  type="date"
                  required
                  value={postponeTargetDate}
                  onChange={e => setPostponeTargetDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">New Target Reschedule Date</label>
                <input
                  type="date"
                  required
                  value={postponeNewDate}
                  onChange={e => setPostponeNewDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Delay Reason (Printed on Job Sheet)</label>
                <input
                  type="text"
                  required
                  value={postponeReason}
                  onChange={e => setPostponeReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWeatherPostpone(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPostponing}
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer disabled:opacity-50"
                >
                  {isPostponing ? 'Processing postpone...' : 'Reschedule All Bookings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking assignment / quick details drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Dispatch Controls ({selectedBooking.id})</h3>
                <p className="text-[10px] text-slate-400">Client: {selectedBooking.customerName} • £{selectedBooking.price}</p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              
              {/* Assign Cleaner Section */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Assign Specialist Cleaner
                </label>
                <div className="grid gap-2">
                  {cleaners.filter(c => c.status === 'active').map(c => {
                    const isAssigned = selectedBooking.cleanerId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleReassignCleaner(selectedBooking.id, c.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isAssigned
                            ? 'border-indigo-600 bg-indigo-50/30 font-semibold text-indigo-950'
                            : 'border-slate-150 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span>{c.name} (Rating: ⭐{c.rating})</span>
                        </div>
                        {isAssigned ? (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 hover:underline">Select</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status adjust */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Force Status Override
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(['pending', 'confirmed', 'assigned', 'rain_delay', 'cancelled'] as BookingStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => handleQuickStatusChange(selectedBooking.id, st)}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded px-2.5 py-1 text-[10px] font-semibold uppercase cursor-pointer"
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Security info */}
              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3 space-y-1">
                <p>📍 <strong>Target Location Address:</strong> {selectedBooking.address}</p>
                <p>⌚ <strong>Arrival Window:</strong> {selectedBooking.timeSlot} on {selectedBooking.date}</p>
                {selectedBooking.notes && <p>💬 <strong>Client Notes:</strong> "{selectedBooking.notes}"</p>}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
