/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PropertyType, CleaningFrequency, ServiceItem, ExtraOption, Booking } from '../types';
import { INITIAL_SERVICES, INITIAL_EXTRAS, INITIAL_SETTINGS } from '../data';
import { Check, Calendar, Clock, DollarSign, FileText, User, ArrowLeft, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { Api } from '../api';

interface BookingWizardProps {
  prefilledData?: {
    propertyType: PropertyType;
    windowsCount: number;
    floorsCount: number;
    extras: string[];
    frequency: CleaningFrequency;
    estimatedPrice: number;
  };
  customerEmail?: string;
  onBookingCompleted: (booking: Booking) => void;
  onCancel: () => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  prefilledData,
  customerEmail,
  onBookingCompleted,
  onCancel
}) => {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [extras, setExtras] = useState<ExtraOption[]>(INITIAL_EXTRAS);

  // Form Fields
  const [selectedService, setSelectedService] = useState<string>('srv-domestic');
  const [propertyType, setPropertyType] = useState<PropertyType>(prefilledData?.propertyType || 'semi-detached');
  const [windowsCount, setWindowsCount] = useState<number>(prefilledData?.windowsCount || 10);
  const [floorsCount, setFloorsCount] = useState<number>(prefilledData?.floorsCount || 2);
  const [selectedExtras, setSelectedExtras] = useState<string[]>(prefilledData?.extras || []);
  const [frequency, setFrequency] = useState<CleaningFrequency>(prefilledData?.frequency || '4-weeks');

  // Customer Contact Info
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState(customerEmail || '');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  // Date & Time slots
  const [bookingDate, setBookingDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  
  // Custom Notes
  const [gateCode, setGateCode] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');
  const [hasDog, setHasDog] = useState(false);
  const [notes, setNotes] = useState('');

  const [totalPrice, setTotalPrice] = useState<number>(prefilledData?.estimatedPrice || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Available slots pool (Simulating standard working capacity)
  const availableSlots = [
    '08:30 - 10:30',
    '11:00 - 13:00',
    '13:30 - 15:30',
    '16:00 - 18:00'
  ];

  // Fetch initial services & auto-fill customer info if email matches
  useEffect(() => {
    async function loadData() {
      try {
        const data = await Api.getServices();
        setServices(data.services);
        setExtras(data.extras);

        if (custEmail) {
          const customers = await Api.getCustomers();
          const match = customers.find(c => c.email.toLowerCase() === custEmail.toLowerCase());
          if (match) {
            setCustName(match.name);
            setCustPhone(match.phone);
            if (match.addresses && match.addresses.length > 0) {
              setCustAddress(match.addresses[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data for booking wizard', err);
      }
    }
    loadData();
  }, [custEmail]);

  // Recalculate price dynamically
  useEffect(() => {
    const basePricePerWindow = 2.50;
    const basePricePerFloor = 5.00;

    const propertyMultipliers: Record<PropertyType, number> = {
      'terraced': 0.9,
      'semi-detached': 1.0,
      'detached': 1.25,
      'apartment': 0.8,
      'commercial-low': 1.5,
      'commercial-high': 2.5
    };

    const frequencyDiscounts: Record<CleaningFrequency, number> = {
      'one-off': 1.0,
      '4-weeks': 0.85,
      '6-weeks': 0.90,
      '8-weeks': 0.95
    };

    // Service base
    const srv = services.find(s => s.id === selectedService) || services[0];
    let price = srv ? srv.basePrice : 20;

    // Window count + floor complexity adjustments
    price += (windowsCount * basePricePerWindow);
    price += (floorsCount * basePricePerFloor);
    price *= propertyMultipliers[propertyType];

    // Extras
    selectedExtras.forEach(extraId => {
      const extra = extras.find(e => e.id === extraId);
      if (extra) {
        price += extra.price;
      }
    });

    // Discount
    price *= frequencyDiscounts[frequency];

    setTotalPrice(Math.round(price));
  }, [selectedService, propertyType, windowsCount, floorsCount, selectedExtras, frequency, services, extras]);

  const handleToggleExtra = (extraId: string) => {
    if (selectedExtras.includes(extraId)) {
      setSelectedExtras(selectedExtras.filter(id => id !== extraId));
    } else {
      setSelectedExtras([...selectedExtras, extraId]);
    }
  };

  const handleNextStep = () => {
    setErrorMsg('');
    
    if (step === 1) {
      if (!selectedService) {
        setErrorMsg('Please select a base service.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!custName || !custEmail || !custPhone || !custAddress) {
        setErrorMsg('Please complete all contact details and address.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!bookingDate) {
        setErrorMsg('Please select a service date.');
        return;
      }
      if (!selectedTimeSlot) {
        setErrorMsg('Please select an arrival timeslot.');
        return;
      }
      setStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep(step - 1);
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const booking = await Api.createBooking({
        customerName: custName,
        customerEmail: custEmail,
        customerPhone: custPhone,
        address: custAddress,
        propertyType,
        windowsCount,
        floorsCount,
        serviceId: selectedService,
        extras: selectedExtras,
        frequency,
        date: bookingDate,
        timeSlot: selectedTimeSlot,
        price: totalPrice,
        notes: notes || '',
        gateCode: gateCode || undefined,
        parkingInfo: parkingInfo || undefined,
        hasDog
      });
      
      onBookingCompleted(booking);
    } catch (err) {
      console.error('Failed to book job', err);
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate tomorrow's date string for input limits
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Schedule Window Cleaning
          </h1>
          <p className="text-xs text-slate-500">
            Complete the form to book an appointment with our specialist cleaners.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
        >
          Go Back
        </button>
      </div>

      {/* Progress Line */}
      <div className="mb-10">
        <div className="relative flex justify-between">
          <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-slate-200 -z-10" />
          {[
            { s: 1, label: 'Configure Service' },
            { s: 2, label: 'Your Address' },
            { s: 3, label: 'Date & Time' },
            { s: 4, label: 'Confirm Clean' }
          ].map((item) => (
            <div key={item.s} className="flex flex-col items-center bg-slate-100 px-3 z-10">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step >= item.s
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step > item.s ? <Check className="h-4 w-4" /> : item.s}
              </div>
              <span
                className={`mt-2 text-[10px] font-semibold tracking-wide uppercase hidden sm:block ${
                  step >= item.s ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-600 flex items-center gap-2">
          <Info className="h-4 w-4 text-red-500 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Booking Form steps */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Step Body */}
        <div className="md:col-span-8 bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                Select Service Package
              </h2>

              <div className="space-y-3">
                {services.map(srv => (
                  <button
                    key={srv.id}
                    onClick={() => setSelectedService(srv.id)}
                    className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      selectedService === srv.id
                        ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selectedService === srv.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                    }`}>
                      {selectedService === srv.id && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-semibold text-slate-900">{srv.name}</span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Base £{srv.basePrice}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">{srv.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Adjust Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Property Structure
                  </label>
                  <select
                    value={propertyType}
                    onChange={e => setPropertyType(e.target.value as PropertyType)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="semi-detached">Semi-Detached Home</option>
                    <option value="detached">Fully Detached Home</option>
                    <option value="terraced">Terraced / Row House</option>
                    <option value="apartment">Apartment / Penthouse</option>
                    <option value="commercial-low">Commercial Shopfront</option>
                    <option value="commercial-high">Commercial Multi-story</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as CleaningFrequency)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="one-off">One Off Service</option>
                    <option value="4-weeks">Every 4 Weeks (15% Off)</option>
                    <option value="6-weeks">Every 6 Weeks (10% Off)</option>
                    <option value="8-weeks">Every 8 Weeks (5% Off)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Windows Count: <span className="font-bold text-blue-600">{windowsCount}</span>
                  </label>
                  <input
                    type="number"
                    min="4"
                    max="45"
                    value={windowsCount}
                    onChange={e => setWindowsCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Floors Count: <span className="font-bold text-blue-600">{floorsCount}</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={floorsCount}
                    onChange={e => setFloorsCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Add Premium Extras */}
              <div className="border-t border-slate-100 pt-6">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Check optional Extras to include:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extras.map(extra => {
                    const checked = selectedExtras.includes(extra.id);
                    return (
                      <button
                        key={extra.id}
                        onClick={() => handleToggleExtra(extra.id)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          checked ? 'border-blue-500 bg-blue-50/10' : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex h-4 w-4 items-center justify-center rounded-md border ${
                            checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                          }`}>
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                          <span className="text-xs text-slate-700">{extra.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">+£{extra.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Contact Info & Property Location
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@email.com"
                    value={custEmail}
                    onChange={e => setCustEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +44 7700 900155"
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Property Cleaning Address</label>
                  <input
                    type="text"
                    required
                    placeholder="Street Address, City, Postcode"
                    value={custAddress}
                    onChange={e => setCustAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Select Date & Arrival Window
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Available Date</label>
                  <input
                    type="date"
                    required
                    min={getMinDate()}
                    value={bookingDate}
                    onChange={e => {
                      const d = new Date(e.target.value);
                      if (d.getDay() === 0) {
                        alert('We are closed on Sundays. Please choose a weekday or Saturday.');
                        return;
                      }
                      setBookingDate(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                  <p className="mt-2 text-[10px] text-slate-400">
                    Sundays and public bank holidays are blocked.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Preferred Timeslot</label>
                  <div className="space-y-2">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          selectedTimeSlot === slot
                            ? 'border-blue-500 bg-blue-50/20 text-blue-800 font-medium'
                            : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-xs">{slot}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Available
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Access Codes & Security Notes
              </h2>

              <p className="text-xs text-slate-500 leading-snug">
                Provide instructions so our cleaners can safely access the exterior glass of your property.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Gate Code (if any)</label>
                  <input
                    type="text"
                    placeholder="e.g. #1404 or Keybox code"
                    value={gateCode}
                    onChange={e => setGateCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Parking Info</label>
                  <input
                    type="text"
                    placeholder="e.g. Driveway free, Permit required"
                    value={parkingInfo}
                    onChange={e => setParkingInfo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setHasDog(!hasDog)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      hasDog ? 'border-amber-400 bg-amber-50/20 text-amber-950' : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded-md border ${
                      hasDog ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
                    }`}>
                      {hasDog && <Check className="h-3 w-3" />}
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold">I have a dog in the garden.</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">We will make sure the safety gates are fully closed on arrival and exit.</span>
                    </div>
                  </button>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Specific Access Notes</label>
                  <textarea
                    placeholder="e.g. Please avoid flower beds in front garden, conservatory needs extension poles..."
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Nav Controls */}
          <div className="mt-8 flex justify-between border-t border-slate-100 pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous Step
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm & Schedule Clean'}
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>

        </div>

        {/* Invoice Summary Panel (Sticky Side) */}
        <div className="md:col-span-4 space-y-5">
          <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Cost Breakdown
            </h3>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-2.5">
              <div className="flex justify-between">
                <span>Base clean package</span>
                <span className="font-semibold text-slate-900">
                  £{(services.find(s => s.id === selectedService) || services[0])?.basePrice}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Windows adjustment</span>
                <span className="font-semibold text-slate-900">
                  +£{windowsCount * 2.5}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Floors difficulty</span>
                <span className="font-semibold text-slate-900">
                  +£{floorsCount * 5.0}
                </span>
              </div>

              {selectedExtras.length > 0 && (
                <div className="border-t border-slate-200/50 pt-2.5">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Premium Extras
                  </span>
                  {selectedExtras.map(extId => {
                    const option = extras.find(e => e.id === extId);
                    if (!option) return null;
                    return (
                      <div key={extId} className="flex justify-between text-[11px] text-slate-500 pl-1">
                        <span>• {option.name}</span>
                        <span>+£{option.price}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-200/50 pt-2.5 flex justify-between font-semibold">
                <span>Frequency discount</span>
                <span className="text-emerald-600">
                  {frequency === 'one-off' ? '0%' : frequency === '4-weeks' ? '-15%' : frequency === '6-weeks' ? '-10%' : '-5%'}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-900">Total estimated cost</span>
                <span className="text-2xl font-extrabold text-blue-600">
                  £{totalPrice}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-blue-50/50 border border-blue-100 p-3.5 flex items-start gap-2.5 text-[10px] text-blue-800 leading-normal">
              <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Weather & Rain Guarantee</p>
                <p className="mt-0.5 text-slate-600">
                  In case of high-wind alerts or severe downpours, we will automatically text you to reschedule.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
