/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, CustomerProfile, UserSession } from '../types';
import { Api } from '../api';
import { INITIAL_EXTRAS } from '../data';
import { Clock, CheckCircle2, AlertTriangle, MessageSquare, Star, ArrowRight, Download, Eye, Navigation, Info, ShieldCheck, Heart } from 'lucide-react';

interface CustomerDashboardProps {
  currentSession: UserSession;
  bookings: Booking[];
  onRefreshBookings: () => void;
  onNavigateToBooking: (prefilledData: any) => void;
  onSendFCMNotification: (title: string, body: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  currentSession,
  bookings,
  onRefreshBookings,
  onNavigateToBooking,
  onSendFCMNotification
}) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressInput, setAddressInput] = useState('');

  // Review states
  const [selectedJobForReview, setSelectedJobForReview] = useState<Booking | null>(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Selected Booking for Detailed modal (invoice or photos)
  const [selectedJobDetail, setSelectedJobDetail] = useState<Booking | null>(null);

  // Before & After comparison slide position
  const [slideComparePosition, setSlideComparePosition] = useState(50);

  // Filter bookings for this customer email
  const myBookings = bookings.filter(b => b.customerEmail.toLowerCase() === currentSession.email.toLowerCase());

  // Split into active/upcoming and historical
  const activeBookings = myBookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');
  const pastBookings = myBookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const customers = await Api.getCustomers();
        const match = customers.find(c => c.email.toLowerCase() === currentSession.email.toLowerCase());
        if (match) {
          setProfile(match);
          setName(match.name);
          setPhone(match.phone);
        } else {
          // Auto register customer profile
          const registered = await Api.registerCustomer({
            name: currentSession.name,
            email: currentSession.email,
            phone: currentSession.phone || '+44 7700 900155',
            address: currentSession.addresses?.[0] || '29 High Street, Guildford, GU1 3AJ'
          });
          setProfile(registered);
          setName(registered.name);
          setPhone(registered.phone);
        }
      } catch (err) {
        console.error('Error fetching customer profile', err);
      }
    }
    fetchProfile();
  }, [currentSession]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const addresses = [...profile.addresses];
      if (addressInput && !addresses.includes(addressInput)) {
        addresses.push(addressInput);
      }
      const updated = await Api.updateCustomer(profile.id, {
        name,
        phone,
        addresses
      });
      setProfile(updated);
      setEditingProfile(false);
      setAddressInput('');
      onSendFCMNotification('Profile Updated', 'Your customer details and service locations have been successfully saved.');
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this booking? Cancellations within 24 hours are subject to our standard policy.')) {
      try {
        await Api.updateBooking(id, { status: 'cancelled' });
        onRefreshBookings();
        onSendFCMNotification('Booking Cancelled', `Your appointment (${id}) has been cancelled. Reach out if you wish to reschedule.`);
      } catch (err) {
        console.error('Failed to cancel booking', err);
      }
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForReview) return;

    try {
      await Api.updateBooking(selectedJobForReview.id, {
        rating: reviewStars,
        reviewText,
        reviewDate: new Date().toISOString()
      });
      setSelectedJobForReview(null);
      setReviewText('');
      onRefreshBookings();
      onSendFCMNotification('Review Submitted', 'Thank you! Your feedback has been published on our cleaner scoreboard.');
    } catch (err) {
      console.error('Failed to submit review', err);
    }
  };

  const handleBookAgain = (job: Booking) => {
    onNavigateToBooking({
      propertyType: job.propertyType,
      windowsCount: job.windowsCount,
      floorsCount: job.floorsCount,
      extras: job.extras,
      frequency: job.frequency,
      estimatedPrice: job.price
    });
  };

  // Helper to render tracking dots
  const getStatusStep = (status: string) => {
    const steps = ['pending', 'confirmed', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed'];
    return steps.indexOf(status);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Banner / Profile Card */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm md:grid md:grid-cols-12">
        <div className="p-6 sm:p-8 md:col-span-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 border border-blue-100">
            <Heart className="h-3 w-3 fill-blue-500 text-blue-500" />
            ClearView Customer Hub
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Welcome Back, <span className="text-blue-600">{profile?.name || currentSession.name}</span>!
          </h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Manage your scheduled glass cleans, review before & after proofs, view generated invoice sheets, or trigger instant "Book Again" schedules.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">Client ID:</span> {profile?.id}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Registered:</span> {profile ? new Date(profile.createdAt).toLocaleDateString() : 'Today'}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Account status:</span> <span className="font-bold text-emerald-600">Active</span>
            </div>
          </div>
        </div>

        {/* Profile editor sidebar */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-6 sm:p-8 md:col-span-4 md:border-t-0 md:border-l">
          {editingProfile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Edit Profile</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  placeholder="Add another cleaning address"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2 text-center text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Save Updates
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Your Contact Info</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <p><span className="font-semibold text-slate-400">Email:</span> {currentSession.email}</p>
                <p><span className="font-semibold text-slate-400">Phone:</span> {profile?.phone || 'Not set'}</p>
                <div>
                  <span className="font-semibold text-slate-400 block mb-1">Saved Locations:</span>
                  <div className="space-y-1">
                    {profile?.addresses.map((addr, i) => (
                      <span key={i} className="block bg-white border border-slate-100 p-1.5 rounded-lg font-mono text-[10px] text-slate-500 truncate">
                        📍 {addr}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Modify Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Active bookings list */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Active Cleans & Real-time Progress ({activeBookings.length})
          </h2>

          {activeBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
              <Info className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No glass cleaning scheduled at this time.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Use our booking wizard to coordinate an appointment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeBookings.map(job => {
                const currentStepIdx = getStatusStep(job.status);
                return (
                  <div key={job.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    {/* Card Header */}
                    <div className="border-b border-slate-50 bg-slate-50/50 p-4 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {job.id}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {job.serviceName}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500 truncate max-w-md">
                          📍 {job.address}
                        </p>
                      </div>
                      <div className="mt-3.5 sm:mt-0 flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">£{job.price}</span>
                        <span className="text-[10px] font-semibold text-slate-400">({job.frequency.replace('-', ' ')})</span>
                      </div>
                    </div>

                    {/* Card Body (Tracking & Details) */}
                    <div className="p-4 sm:p-6 space-y-6">
                      
                      {/* Tracking Progress Bar */}
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Job Tracking Timeline
                        </h4>
                        
                        {job.status === 'cancelled' ? (
                          <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            This booking was marked cancelled.
                          </div>
                        ) : job.status === 'rain_delay' ? (
                          <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-xl border border-amber-100 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            Delayed due to adverse weather. An admin will re-route this appointment shortly.
                          </div>
                        ) : (
                          <div className="relative">
                            {/* Horizontal Line for Desktop */}
                            <div className="absolute top-4 left-0 h-1 w-full -translate-y-1/2 bg-slate-100 hidden sm:block" />
                            <div
                              className="absolute top-4 left-0 h-1 -translate-y-1/2 bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500 hidden sm:block"
                              style={{ width: `${(Math.max(0, currentStepIdx) / 6) * 100}%` }}
                            />

                            {/* Tracking Dots */}
                            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-2 relative z-10">
                              {[
                                { s: 'pending', label: 'Pending' },
                                { s: 'confirmed', label: 'Confirmed' },
                                { s: 'assigned', label: 'Assigned' },
                                { s: 'en_route', label: 'En Route' },
                                { s: 'arrived', label: 'Arrived' },
                                { s: 'in_progress', label: 'In Progress' },
                                { s: 'completed', label: 'Complete' }
                              ].map((stepObj, idx) => {
                                const isPassed = currentStepIdx >= idx;
                                const isCurrent = job.status === stepObj.s;
                                return (
                                  <div key={stepObj.s} className="flex sm:flex-col items-center gap-3 sm:gap-1.5 flex-1 text-center">
                                    <div
                                      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                                        isCurrent
                                          ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                          : isPassed
                                            ? 'border-sky-400 bg-sky-400 text-white'
                                            : 'border-slate-200 bg-white text-slate-400'
                                      }`}
                                    >
                                      {isPassed && !isCurrent ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <span className="text-[10px] font-bold">{idx + 1}</span>
                                      )}
                                    </div>
                                    <span
                                      className={`text-[10px] font-bold ${
                                        isCurrent ? 'text-blue-600 font-extrabold' : isPassed ? 'text-slate-700' : 'text-slate-400'
                                      }`}
                                    >
                                      {stepObj.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Job Metadata details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4 text-xs">
                        <div>
                          <span className="text-slate-400 block">Scheduled Date</span>
                          <span className="font-semibold text-slate-800">{new Date(job.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Arrival Window</span>
                          <span className="font-semibold text-slate-800">{job.timeSlot}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Cleaner Assigned</span>
                          <span className="font-semibold text-slate-800">{job.cleanerName || 'Under Dispatch'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Status Label</span>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 font-bold uppercase text-[9px] text-blue-700 border border-blue-100 mt-0.5">
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Cleaner real-time notes */}
                      {job.status === 'en_route' && (
                        <div className="bg-emerald-50 text-emerald-800 text-[11px] p-3 rounded-xl border border-emerald-100 flex items-center gap-2 animate-pulse">
                          <Navigation className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span><strong>{job.cleanerName}</strong> is en route and navigating to your address with our pure water van. Estimated arrival: 10 mins.</span>
                        </div>
                      )}

                      {/* Controls */}
                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                          onClick={() => setSelectedJobDetail(job)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Full Details
                        </button>
                        {['pending', 'confirmed', 'assigned'].includes(job.status) && (
                          <button
                            onClick={() => handleCancelBooking(job.id)}
                            className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 cursor-pointer"
                          >
                            Cancel Clean
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Past Bookings history & reviews */}
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 pt-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Booking History & Feedback ({pastBookings.length})
          </h2>

          {pastBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-400 text-xs">
              No historical bookings recorded.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pastBookings.map(job => (
                <div key={job.id} className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase">
                        {job.id} • Completed
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        £{job.price}
                      </span>
                    </div>

                    <h4 className="mt-2 text-xs font-bold text-slate-700 truncate">{job.serviceName}</h4>
                    <p className="text-[11px] text-slate-400 mt-1">{new Date(job.date).toLocaleDateString()} with {job.cleanerName || 'Dave'}</p>

                    {/* Show Proof photo proof if any */}
                    {job.afterPhotos.length > 0 && (
                      <button
                        onClick={() => setSelectedJobDetail(job)}
                        className="mt-3.5 flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Before/After Photos
                      </button>
                    )}

                    {/* Show Review or review invitation */}
                    {job.status === 'completed' && (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        {job.rating ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-amber-400">
                              {Array.from({ length: job.rating }).map((_, i) => (
                                <Star key={i} className="h-3.5 w-3.5 fill-current" />
                              ))}
                              <span className="text-[10px] text-slate-400 ml-1">Reviewed</span>
                            </div>
                            <p className="text-[10px] text-slate-500 italic">"{job.reviewText}"</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedJobForReview(job);
                              setReviewStars(5);
                              setReviewText('');
                            }}
                            className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Leave Star Feedback
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBookAgain(job)}
                      className="flex-1 rounded-xl bg-slate-900 text-white text-center py-2 text-xs font-bold hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Book Again
                    </button>
                    <button
                      onClick={() => setSelectedJobDetail(job)}
                      className="rounded-xl border border-slate-200 bg-white text-slate-600 px-3 py-2 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Sidebar panels */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick Quote Calculator Box */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 shadow-md border border-slate-800">
            <h3 className="text-sm font-bold tracking-wide text-sky-300">
              Need another cleaning estimate?
            </h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Launch our pricing engine to calculate estimates for different sills, gutters, conservatory structures, or window totals.
            </p>
            <button
              onClick={() => onNavigateToBooking(undefined)}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-400 py-3 text-center text-xs font-bold text-slate-900 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Configure Service Booking
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Guidelines on our Pure Water System */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              ClearView Clean Standards
            </h4>
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Purified Water Guarantee:</strong> We filter water to 0 PPM. It acts as a dirt magnet, leaving glass totally spot-free without streaks.
                </p>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Sills & Frames Wiped:</strong> Standard packages clean all exterior plastic framing and sills to prevent dirt tracking.
                </p>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Fully Insured:</strong> All cleaners are vetted, background checked, and backed by £5m public liability protection.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Review Dialog modal */}
      {selectedJobForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800">Rate Your Service</h3>
            <p className="mt-1 text-xs text-slate-500">Provide feedback for {selectedJobForReview.cleanerName || 'your cleaner'}.</p>
            
            <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Rating (Stars)</label>
                <div className="flex gap-2 text-amber-400">
                  {[1, 2, 3, 4, 5].map(stars => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setReviewStars(stars)}
                      className="cursor-pointer"
                    >
                      <Star className={`h-8 w-8 ${reviewStars >= stars ? 'fill-current' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Comments</label>
                <textarea
                  required
                  rows={3}
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="e.g. Excellent attention to details, sills are clean, arrived exactly on time..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobForReview(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Publish Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details / Photos / Invoice Modal */}
      {selectedJobDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Appointment Details ({selectedJobDetail.id})</h3>
                <p className="text-[11px] text-slate-500 font-mono">Date Booked: {new Date(selectedJobDetail.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedJobDetail(null)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-6 text-slate-700 text-xs">
              
              {/* Before & After Premium Slider if photos exist */}
              {selectedJobDetail.beforePhotos.length > 0 || selectedJobDetail.afterPhotos.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">Job Completion Photos</h4>
                  
                  {selectedJobDetail.beforePhotos.length > 0 && selectedJobDetail.afterPhotos.length > 0 ? (
                    /* Slider comparison widget */
                    <div className="relative h-64 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 select-none">
                      {/* Before (Bottom) */}
                      <img
                        src={selectedJobDetail.beforePhotos[0]}
                        alt="Before clean"
                        className="absolute inset-0 h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white font-bold text-[10px] px-2 py-1 rounded">BEFORE</div>

                      {/* After (Top overlay) */}
                      <div
                        className="absolute inset-y-0 left-0 overflow-hidden"
                        style={{ width: `${slideComparePosition}%` }}
                      >
                        <img
                          src={selectedJobDetail.afterPhotos[0]}
                          alt="After clean"
                          className="absolute inset-y-0 left-0 h-full w-full object-cover"
                          style={{ width: '100%', maxWidth: 'none' }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 right-2 bg-blue-600/95 text-white font-bold text-[10px] px-2 py-1 rounded whitespace-nowrap">AFTER (SPARKLING)</div>
                      </div>

                      {/* Split handle */}
                      <div
                        className="absolute inset-y-0 w-1 bg-white cursor-ew-resize flex items-center justify-center"
                        style={{ left: `${slideComparePosition}%` }}
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-600 text-white border-2 border-white flex items-center justify-center shadow font-black text-xs">
                          ↔
                        </div>
                      </div>

                      {/* Invisible Slider input overlay */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={slideComparePosition}
                        onChange={e => setSlideComparePosition(Number(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                      />
                    </div>
                  ) : (
                    /* Simple grid */
                    <div className="grid grid-cols-2 gap-3">
                      {selectedJobDetail.beforePhotos.length > 0 && (
                        <div>
                          <span className="block text-[10px] font-bold text-slate-400 mb-1">BEFORE WORK</span>
                          <img src={selectedJobDetail.beforePhotos[0]} className="h-40 w-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      {selectedJobDetail.afterPhotos.length > 0 && (
                        <div>
                          <span className="block text-[10px] font-bold text-blue-500 mb-1">AFTER WORKPROOF</span>
                          <img src={selectedJobDetail.afterPhotos[0]} className="h-40 w-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedJobDetail.cleanerNotes && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl italic text-slate-600">
                      <strong>Cleaner note:</strong> "{selectedJobDetail.cleanerNotes}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center text-slate-400">
                  No before/after photos uploaded for this clean.
                </div>
              )}

              {/* Invoice section */}
              {selectedJobDetail.status === 'completed' && selectedJobDetail.invoiceId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 font-mono space-y-4">
                  <div className="flex justify-between border-b border-dashed border-slate-300 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">INVOICE SHEET</h4>
                      <p className="text-[10px] text-slate-400">ClearView Premium Cleaning</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600 text-sm">{selectedJobDetail.invoiceId}</p>
                      <p className="text-[10px] text-slate-400">Date: {new Date(selectedJobDetail.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <p><strong>Customer:</strong> {selectedJobDetail.customerName}</p>
                    <p><strong>Address:</strong> {selectedJobDetail.address}</p>
                  </div>

                  <table className="w-full text-left text-xs border-t border-slate-200 pt-3">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400">
                        <th className="py-2 font-normal">Description</th>
                        <th className="py-2 text-right font-normal">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 font-semibold text-slate-700">{selectedJobDetail.serviceName}</td>
                        <td className="py-2 text-right text-slate-900">£{selectedJobDetail.price}</td>
                      </tr>
                      {selectedJobDetail.extras.length > 0 && (
                        <tr>
                          <td className="py-1 text-[11px] text-slate-400 pl-2">
                            • Premium Extras: {selectedJobDetail.extras.map(eId => INITIAL_EXTRAS.find(ext => ext.id === eId)?.name).join(', ')}
                          </td>
                          <td className="py-1 text-right text-[11px] text-slate-400">Included</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="border-t border-dashed border-slate-300 pt-3 text-right text-xs">
                    <p className="text-slate-500">VAT (0%): £0.00</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">Paid Amount: £{selectedJobDetail.price}</p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700 border border-emerald-100">
                      ✓ PAID VIA INVOICE
                    </span>
                  </div>

                  <div className="text-center pt-3 border-t border-slate-100">
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      <Download className="h-4.5 w-4.5" />
                      Print / Download Invoice
                    </button>
                  </div>
                </div>
              )}

              {/* General audit trail */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Property Type</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedJobDetail.propertyType.replace('-', ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Windows / Floors</span>
                  <span className="font-semibold text-slate-800">{selectedJobDetail.windowsCount} Windows, {selectedJobDetail.floorsCount} Floors</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Customer Security Notes</span>
                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
                    {selectedJobDetail.notes || 'No security notes provided.'}
                    {selectedJobDetail.gateCode && <span className="block mt-1 font-semibold text-blue-700">🔒 Gate Access Code: {selectedJobDetail.gateCode}</span>}
                    {selectedJobDetail.hasDog && <span className="block mt-0.5 font-semibold text-amber-700">🐾 Warning: Dog in garden!</span>}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
