/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { UserRole, UserSession, Booking, CleanerProfile, CustomerProfile, QuoteRequest, BusinessSettings } from './types';
import { Api } from './api';
import { Navbar } from './components/Navbar';
import { QuoteCalculator } from './components/QuoteCalculator';
import { BookingWizard } from './components/BookingWizard';
import { CustomerDashboard } from './components/CustomerDashboard';
import { CleanerDashboard } from './components/CleanerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminCalendar } from './components/AdminCalendar';
import { AdminCustomers } from './components/AdminCustomers';
import { AdminServices } from './components/AdminServices';
import { AdminPendingBookings } from './components/AdminPendingBookings';
import { AdminCleaners } from './components/AdminCleaners';
import { PortalLogin } from './components/PortalLogin';
import { Sparkles, Calendar, BookOpen, Users, Compass, ShieldCheck, Heart, LayoutDashboard, Settings, Clock, Briefcase } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<UserSession>({
    role: 'GUEST',
    userId: 'guest-1',
    name: 'Guest Visitor',
    email: ''
  });

  // Global app datasets
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cleaners, setCleaners] = useState<CleanerProfile[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [extras, setExtras] = useState<any[]>([]);

  // Flow & UI states
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [prefilledBookingData, setPrefilledBookingData] = useState<any>(undefined);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'calendar' | 'customers' | 'services' | 'pending' | 'cleaners'>('dashboard');
  const [showLogin, setShowLogin] = useState(false);

  // FCM simulated notification list
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; time: string; read: boolean }>>([
    {
      id: 'notif-1',
      title: 'Welcome to ClearView Premium!',
      body: 'Switch between Admin, Cleaner, and Customer personas at the top to explore their specific full-stack dashboards.',
      time: 'Just now',
      read: false
    }
  ]);

  // Load backend configurations
  const loadAllData = async () => {
    try {
      const activeSession = await Api.getSession();
      setSession(activeSession);

      const [bList, cList, custList, qList, setObj, srvObj] = await Promise.all([
        Api.getBookings(),
        Api.getCleaners(),
        Api.getCustomers(),
        Api.getQuotes(),
        Api.getSettings(),
        Api.getServices()
      ]);

      setBookings(bList);
      setCleaners(cList);
      setCustomers(custList);
      setQuotes(qList);
      setSettings(setObj);
      setServices(srvObj.services);
      setExtras(srvObj.extras);
    } catch (err) {
      console.error('Failed to synchronize data with server', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleSwitchRole = async (role: UserRole) => {
    let mockSession: Partial<UserSession> = { role };
    if (role === 'ADMIN') {
      mockSession = {
        role: 'ADMIN',
        userId: 'admin-1',
        name: 'Thomas Higgins',
        email: 'ownertest@clearview.com'
      };
    } else if (role === 'CLEANER') {
      mockSession = {
        role: 'CLEANER',
        userId: 'cln-1',
        name: 'Dave Carter',
        email: 'dave.carter@clearview.com',
        phone: '+44 7700 900011'
      };
    } else if (role === 'CUSTOMER') {
      mockSession = {
        role: 'CUSTOMER',
        userId: 'cust-1',
        name: 'Thomas Higgins',
        email: 'thomas.higgins@outlook.com',
        phone: '+44 7700 900155',
        addresses: ['29 High Street, Guildford, GU1 3AJ']
      };
    } else {
      mockSession = {
        role: 'GUEST',
        userId: 'guest-' + Date.now(),
        name: 'Guest Visitor',
        email: ''
      };
    }

    try {
      const updated = await Api.switchSession(mockSession);
      setSession(updated);
      setShowBookingWizard(false);
      
      // Trigger instant FCM welcome simulation
      const text = `Now viewing application as ${role === 'ADMIN' ? 'Administrator Thomas Higgins' : role === 'CLEANER' ? 'Technician Dave Carter' : role === 'CUSTOMER' ? 'Client Thomas Higgins' : 'Guest Visitor'}.`;
      handlePushNotification('Session Persona Switched', text);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePushNotification = (title: string, body: string) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      body,
      time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleMarkNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNavigateToBooking = (prefilled: any) => {
    setPrefilledBookingData(prefilled);
    setShowBookingWizard(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-colors duration-250">
      
      {/* Master Global Header Navigation */}
      <Navbar
        currentSession={session}
        onSwitchRole={handleSwitchRole}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onOpenLogin={() => setShowLogin(true)}
        onLogOut={async () => {
          const guestSess = await Api.switchSession({
            role: 'GUEST',
            userId: 'guest-' + Date.now(),
            name: 'Guest Visitor',
            email: ''
          });
          setSession(guestSess);
          handlePushNotification('Signed Out', 'You have successfully signed out of the portal.');
        }}
      />

      {/* Main Role-Based Router Containers */}
      <main className="flex-1">
        
        {/* VIEW 1: GUEST VISITOR PAGE */}
        {session.role === 'GUEST' && (
          <div className="animate-in fade-in duration-200">
            {showBookingWizard ? (
              <BookingWizard
                prefilledData={prefilledBookingData}
                onBookingCompleted={(b) => {
                  loadAllData();
                  setShowBookingWizard(false);
                  handlePushNotification(
                    'Booking Received!',
                    `Your window cleaning at ${b.address} is scheduled on ${b.date}. Welcome aboard!`
                  );
                }}
                onCancel={() => setShowBookingWizard(false)}
              />
            ) : (
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
                
                {/* Hero section */}
                <div className="text-center space-y-6 max-w-3xl mx-auto py-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-100">
                    <Sparkles className="h-3.5 w-3.5 animate-spin-slow" />
                    Spotless Streak-Free Glass Guarantee
                  </span>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 leading-none">
                    Premium Window Cleaning <span className="text-blue-600">Made Instant</span>
                  </h1>
                  <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                    ClearView employs commercial-grade water filtration to clean up to 3 floors safely. Use our custom calculator below for transparent, instant estimates and book within 60 seconds.
                  </p>
                  
                  <div className="flex justify-center gap-3.5 pt-4">
                    <button
                      onClick={() => handleNavigateToBooking(undefined)}
                      className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:brightness-110 cursor-pointer transition-all"
                    >
                      Book Free Clean Estimate
                    </button>
                    <a
                      href="#quote-calc-sec"
                      className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      Instant Cost Calculator
                    </a>
                  </div>
                </div>

                {/* Main Instant Quote Calculator widget */}
                <div id="quote-calc-sec" className="scroll-mt-24">
                  <QuoteCalculator
                    onQuoteSubmitted={() => {
                      loadAllData();
                      handlePushNotification('Custom Quote Logged', 'Your high-volume glazing assessment has been routed to our Guildford office.');
                    }}
                    onNavigateToBooking={handleNavigateToBooking}
                  />
                </div>

                {/* Features list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
                  <div className="p-5 border border-slate-200 bg-white rounded-2xl shadow-2xs space-y-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">1</div>
                    <h3 className="font-bold text-slate-800 text-sm">Pure Water Pole Cleaning</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">We wash glass utilizing pure water without harsh soap chemicals, drawing dirt from frames and leaving a protective streak-free coating.</p>
                  </div>
                  <div className="p-5 border border-slate-200 bg-white rounded-2xl shadow-2xs space-y-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">2</div>
                    <h3 className="font-bold text-slate-800 text-sm">Flexible Repeat Schedules</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Save up to 15% by choosing standard 4, 6, or 8-week automated cycles. Change or skip cleans instantly from your dashboard.</p>
                  </div>
                  <div className="p-5 border border-slate-200 bg-white rounded-2xl shadow-2xs space-y-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">3</div>
                    <h3 className="font-bold text-slate-800 text-sm">Weather-Proof Guarantees</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">Rain forecast? Our weather policy ensures active rescheduling. If it rains within 24h of a clean and leaves spots, we wash again free.</p>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 2: LOGGED-IN CUSTOMER HUBS */}
        {session.role === 'CUSTOMER' && (
          <div className="animate-in fade-in duration-200">
            {showBookingWizard ? (
              <BookingWizard
                prefilledData={prefilledBookingData}
                customerEmail={session.email}
                onBookingCompleted={(b) => {
                  loadAllData();
                  setShowBookingWizard(false);
                  handlePushNotification(
                    'Booking Confirmed',
                    `Your window clean is confirmed on ${b.date}. Dave Carter is assigned to your guildford route.`
                  );
                }}
                onCancel={() => setShowBookingWizard(false)}
              />
            ) : (
              <CustomerDashboard
                currentSession={session}
                bookings={bookings}
                onRefreshBookings={loadAllData}
                onNavigateToBooking={handleNavigateToBooking}
                onSendFCMNotification={handlePushNotification}
              />
            )}
          </div>
        )}

        {/* VIEW 3: CLEANER IN-FIELD PORTAL */}
        {session.role === 'CLEANER' && (
          <CleanerDashboard
            currentSession={session}
            bookings={bookings}
            onRefreshBookings={loadAllData}
            onSendFCMNotification={handlePushNotification}
          />
        )}

        {/* VIEW 4: ADMIN EXECUTIVE DASHBOARD */}
        {session.role === 'ADMIN' && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            
            {/* Admin sub-tab navbar menu */}
            <div className="flex border-b border-slate-200 text-xs font-bold text-slate-500 gap-6">
              <button
                onClick={() => setAdminTab('dashboard')}
                className={`pb-3 border-b-2 px-1 flex items-center gap-2 cursor-pointer ${
                  adminTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Performance Dashboard
              </button>
              <button
                onClick={() => setAdminTab('pending')}
                className={`pb-3 border-b-2 px-1 flex items-center gap-2 cursor-pointer relative ${
                  adminTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                <Clock className="h-4 w-4" />
                Pending Approvals
                {bookings.filter(b => b.status === 'pending').length > 0 && (
                  <span className="inline-flex items-center justify-center h-4.5 min-w-4.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1 animate-pulse">
                    {bookings.filter(b => b.status === 'pending').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAdminTab('calendar')}
                className={`pb-3 border-b-2 px-1 flex items-center gap-2 cursor-pointer ${
                  adminTab === 'calendar' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Interactive Scheduler
              </button>
              <button
                onClick={() => setAdminTab('customers')}
                className={`pb-3 border-b-2 px-1 flex items-center gap-2 cursor-pointer ${
                  adminTab === 'customers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                <Users className="h-4 w-4" />
                Client Directory
              </button>
              <button
                onClick={() => setAdminTab('services')}
                className={`pb-3 border-b-2 px-1 flex items-center gap-2 cursor-pointer ${
                  adminTab === 'services' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                <Settings className="h-4 w-4" />
                Packages & Quotes
              </button>
              <button
                onClick={() => setAdminTab('cleaners')}
                className={`pb-3 border-b-2 px-1 flex items-center gap-2 cursor-pointer ${
                  adminTab === 'cleaners' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Technician Roster
              </button>
            </div>

            {/* Admin views switch */}
            <div>
              {adminTab === 'dashboard' && (
                <AdminDashboard
                  bookings={bookings}
                  cleaners={cleaners}
                  customers={customers}
                  onRefreshAll={loadAllData}
                  onViewPending={() => setAdminTab('pending')}
                />
              )}

              {adminTab === 'pending' && (
                <AdminPendingBookings
                  bookings={bookings}
                  cleaners={cleaners}
                  onRefreshBookings={loadAllData}
                  onSendFCMNotification={handlePushNotification}
                />
              )}

              {adminTab === 'calendar' && (
                <AdminCalendar
                  bookings={bookings}
                  cleaners={cleaners}
                  onRefreshBookings={loadAllData}
                  onSendFCMNotification={handlePushNotification}
                />
              )}

              {adminTab === 'customers' && (
                <AdminCustomers
                  customers={customers}
                  bookings={bookings}
                  quotes={quotes}
                  onRefreshCustomers={loadAllData}
                />
              )}

              {adminTab === 'services' && (
                <AdminServices
                  services={services}
                  extras={extras}
                  quotes={quotes}
                  onRefreshAll={loadAllData}
                  onSendFCMNotification={handlePushNotification}
                />
              )}

              {adminTab === 'cleaners' && (
                <AdminCleaners
                  cleaners={cleaners}
                  onRefreshCleaners={loadAllData}
                  onSendFCMNotification={handlePushNotification}
                />
              )}
            </div>

          </div>
        )}

      </main>

      {/* Global Bottom Human Design credit & policy margins (Anti-AI-Slop compliance) */}
      <footer className="border-t border-slate-200/60 bg-white py-6 mt-16 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">ClearView Ltd</span>
            <span>•</span>
            <span>GDPR Guarded Database</span>
          </div>
          <div className="flex gap-4">
            <span>Water Safety Regulated</span>
            <span>•</span>
            <span>Liability Insured up to £5m</span>
          </div>
        </div>
      </footer>

      {showLogin && (
        <PortalLogin
          onLoginSuccess={(sess) => {
            setSession(sess);
            handlePushNotification('Portal Access Granted', `Logged in as ${sess.name} (${sess.role}).`);
          }}
          onClose={() => setShowLogin(false)}
        />
      )}

    </div>
  );
}
