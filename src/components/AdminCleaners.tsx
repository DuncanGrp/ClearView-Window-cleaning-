/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CleanerProfile } from '../types';
import { Api } from '../api';
import { UserPlus, Phone, Mail, Star, ToggleLeft, ToggleRight, Search, Briefcase, Plus, Check } from 'lucide-react';

interface AdminCleanersProps {
  cleaners: CleanerProfile[];
  onRefreshCleaners: () => void;
  onSendFCMNotification: (title: string, body: string) => void;
}

export const AdminCleaners: React.FC<AdminCleanersProps> = ({
  cleaners,
  onRefreshCleaners,
  onSendFCMNotification,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const filteredCleaners = cleaners.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      alert('Please fill out all fields.');
      return;
    }

    setLoading(true);
    try {
      const newCleaner = await Api.createCleaner({
        name,
        email,
        phone,
        status: 'active',
        rating: 5.0,
        completedJobsCount: 0
      });

      onRefreshCleaners();
      onSendFCMNotification(
        'Technician Registered',
        `New professional ${newCleaner.name} has been added to ClearView network.`
      );
      
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to create cleaner', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (cleaner: CleanerProfile) => {
    const nextStatus = cleaner.status === 'active' ? 'inactive' : 'active';
    try {
      await Api.updateCleaner(cleaner.id, { status: nextStatus });
      onRefreshCleaners();
      onSendFCMNotification(
        'Status Updated',
        `Technician ${cleaner.name} is now ${nextStatus}.`
      );
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="cleaners-management-sec">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-150 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-150">
            <Briefcase className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Technician & Cleaner Roster</h2>
            <p className="text-[11px] text-slate-400">Add new cleaners, view overall ratings, and toggle active status for active route dispatching.</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-110 transition-all cursor-pointer"
        >
          {showAddForm ? 'Close Registration Panel' : 'Register New Cleaner'}
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Add Cleaner Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 max-w-xl animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <UserPlus className="h-4.5 w-4.5 text-indigo-600" />
            New Professional Technician Registration
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Liam Henderson"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="liam.h@clearview.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+44 7700 900222"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-250 text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      )}

      {/* Search and Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Cleaners Grid */}
      {filteredCleaners.length === 0 ? (
        <div className="bg-white border border-slate-150 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">No Cleaners Found</h3>
            <p className="text-xs text-slate-400">Try searching or register a new cleaner to get started.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCleaners.map(cleaner => (
            <div key={cleaner.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50/80 text-indigo-600 flex items-center justify-center font-bold">
                      {cleaner.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{cleaner.name}</h3>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">{cleaner.id}</span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    cleaner.status === 'active'
                      ? 'bg-emerald-50 border-emerald-150 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    {cleaner.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{cleaner.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{cleaner.phone}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Rating</span>
                    <span className="font-extrabold text-slate-800 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      {cleaner.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Completed</span>
                    <span className="font-extrabold text-slate-800">
                      {cleaner.completedJobsCount} Cleans
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStatus(cleaner)}
                  className="flex items-center gap-1 font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Toggle status"
                >
                  {cleaner.status === 'active' ? (
                    <ToggleRight className="h-6 w-6 text-indigo-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-slate-300" />
                  )}
                  <span className="text-[10px]">Status</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
