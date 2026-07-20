/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserRole, UserSession } from '../types';
import { Sparkles, Bell, User, Briefcase, Calendar, Shield, MapPin, Menu, X, CheckCircle } from 'lucide-react';

interface NavbarProps {
  currentSession: UserSession;
  onSwitchRole: (role: UserRole) => void;
  notifications: Array<{ id: string; title: string; body: string; time: string; read: boolean }>;
  onMarkNotificationsRead: () => void;
  onOpenLogin?: () => void;
  onLogOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSession,
  onSwitchRole,
  notifications,
  onMarkNotificationsRead,
  onOpenLogin,
  onLogOut
}) => {
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const rolesList: Array<{ role: UserRole; name: string; desc: string; icon: any; color: string }> = [
    {
      role: 'ADMIN',
      name: 'Business Owner (Admin)',
      desc: 'Manage jobs, calendar, pricing, cleaners & view reports',
      icon: Shield,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
    },
    {
      role: 'CLEANER',
      name: 'Dave Carter (Cleaner)',
      desc: 'View jobs, navigate to clients, upload photos, sign off',
      icon: Briefcase,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
    },
    {
      role: 'CUSTOMER',
      name: 'Thomas Higgins (Customer)',
      desc: 'Book cleanings, view progress, compare photos, pay invoices',
      icon: User,
      color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      role: 'GUEST',
      name: 'Guest Visitor',
      desc: 'Browse, use quote calculator, request custom quote',
      icon: Sparkles,
      color: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
    }
  ];

  const handleSelectRole = (role: UserRole) => {
    onSwitchRole(role);
    setShowRoleSelector(false);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-white/20 bg-slate-900/85 backdrop-blur-md text-white shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 shadow-lg shadow-sky-500/20">
              <Sparkles className="h-5.5 w-5.5 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-blue-200 to-white bg-clip-text text-transparent">
                ClearView
              </span>
              <span className="ml-1.5 hidden rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase text-sky-300 sm:inline-block">
                Premium
              </span>
            </div>
          </div>

          {/* Desktop Right items */}
          <div className="hidden md:flex items-center gap-6">
            
            {/* Quick Role Display */}
            <div className="relative">
              <button
                id="role-selector-btn"
                onClick={() => { setShowRoleSelector(!showRoleSelector); setShowNotifications(false); }}
                className="flex items-center gap-2.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-sm font-medium hover:bg-sky-400/20 hover:border-sky-400/50 transition-all cursor-pointer"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs text-sky-200 uppercase tracking-wider">Role:</span>
                <span className="text-white text-xs font-semibold">
                  {currentSession.role === 'ADMIN' && '👑 Admin'}
                  {currentSession.role === 'CLEANER' && '🧹 Cleaner'}
                  {currentSession.role === 'CUSTOMER' && '🏡 Customer'}
                  {currentSession.role === 'GUEST' && '✨ Guest'}
                </span>
              </button>

              {showRoleSelector && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-700 bg-slate-800 p-3 text-slate-100 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-250">
                  <h3 className="mb-2 px-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Switch Test Personas
                  </h3>
                  <div className="grid gap-2">
                    {rolesList.map(r => {
                      const Icon = r.icon;
                      const isCurrent = currentSession.role === r.role;
                      return (
                        <button
                          key={r.role}
                          onClick={() => handleSelectRole(r.role)}
                          className={`flex items-start gap-3 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-slate-900/50 border-slate-700/60 text-slate-300 hover:border-slate-500 hover:bg-slate-900'
                          }`}
                        >
                          <div className={`mt-0.5 rounded-lg p-1.5 ${isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="text-sm font-medium leading-tight">
                              {r.name}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400 font-normal leading-snug">
                              {r.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* FCM Notifications Bell */}
            <div className="relative">
              <button
                id="notifications-bell-btn"
                onClick={() => { setShowNotifications(!showNotifications); setShowRoleSelector(false); }}
                className="relative rounded-full p-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-90 rounded-2xl border border-slate-700 bg-slate-800 p-4 text-slate-100 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-250">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <Bell className="h-4 w-4 text-sky-400" />
                      Live Alerts (FCM Simulator)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkNotificationsRead}
                        className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2.5 scrollbar-thin">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        No recent notifications.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`rounded-xl p-2.5 transition-colors border ${
                            n.read ? 'bg-slate-900/30 border-slate-800/80 text-slate-400' : 'bg-slate-900/80 border-slate-700 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                            <h4 className="text-xs font-semibold leading-tight">{n.title}</h4>
                            <span className="ml-auto text-[9px] text-slate-500">{n.time}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-snug">{n.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 border-t border-slate-700 pt-2 text-center text-[10px] text-slate-500">
                    Interactive dispatch triggers will send alerts here.
                  </div>
                </div>
              )}
            </div>

            {/* Business Portal Action Button */}
            {currentSession.role === 'GUEST' ? (
              <button
                id="portal-signin-btn"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 shadow-md shadow-sky-500/10 cursor-pointer transition-all"
              >
                <Shield className="h-4 w-4" />
                Business Portal Login
              </button>
            ) : (
              <button
                id="portal-signout-btn"
                onClick={onLogOut}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-750 cursor-pointer transition-all"
              >
                Sign Out
              </button>
            )}

            {/* User Logged-in Tag */}
            <div className="flex items-center gap-3 border-l border-slate-700 pl-4 text-xs">
              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sky-300">
                {currentSession.name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <p className="font-medium text-slate-200">{currentSession.name}</p>
                <p className="text-[10px] text-slate-400">{currentSession.email || 'No email set'}</p>
              </div>
            </div>

          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowRoleSelector(false); }}
              className="relative rounded-full p-2 hover:bg-slate-800 text-slate-300"
            >
              <Bell className="h-5.5 w-5.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-slate-900 p-4 md:hidden">
          <div className="space-y-4">
            
            {/* Quick Profile */}
            <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl">
              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sky-300">
                {currentSession.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{currentSession.name}</p>
                <p className="text-xs text-slate-400">{currentSession.email || 'No email'}</p>
              </div>
            </div>

            {/* Persona Switcher for Mobile */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Switch Test Persona
              </h3>
              <div className="grid gap-2">
                {rolesList.map(r => {
                  const Icon = r.icon;
                  const isCurrent = currentSession.role === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => handleSelectRole(r.role)}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                        isCurrent
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 text-sky-400" />
                      <span className="text-xs font-medium">{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Portal Action Button */}
            <div className="border-t border-slate-800 pt-4">
              {currentSession.role === 'GUEST' ? (
                <button
                  id="mobile-portal-signin-btn"
                  onClick={() => { onOpenLogin?.(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 py-3 text-xs font-bold text-white cursor-pointer hover:brightness-110"
                >
                  <Shield className="h-4 w-4" />
                  Business Portal Login
                </button>
              ) : (
                <button
                  id="mobile-portal-signout-btn"
                  onClick={() => { onLogOut?.(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800 py-3 text-xs font-bold text-slate-300 cursor-pointer hover:bg-slate-750"
                >
                  Sign Out
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
};
