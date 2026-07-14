/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PropertyType, CleaningFrequency, ExtraOption, ServiceItem } from '../types';
import { INITIAL_EXTRAS, INITIAL_SERVICES } from '../data';
import { Calculator, Send, AlertTriangle, Check, ArrowRight, HelpCircle, Building } from 'lucide-react';
import { Api } from '../api';

interface QuoteCalculatorProps {
  onQuoteSubmitted?: () => void;
  onNavigateToBooking?: (prefilledData: any) => void;
}

export const QuoteCalculator: React.FC<QuoteCalculatorProps> = ({
  onQuoteSubmitted,
  onNavigateToBooking
}) => {
  // Calculator inputs
  const [propertyType, setPropertyType] = useState<PropertyType>('semi-detached');
  const [windowsCount, setWindowsCount] = useState<number>(10);
  const [floorsCount, setFloorsCount] = useState<number>(2);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<CleaningFrequency>('4-weeks');
  
  // Custom Quote Request inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);

  // Constants for pricing formulas
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
    'one-off': 1.0,      // No discount
    '4-weeks': 0.85,    // 15% discount
    '6-weeks': 0.90,    // 10% discount
    '8-weeks': 0.95     // 5% discount
  };

  // Run calculation whenever values change
  useEffect(() => {
    let price = windowsCount * basePricePerWindow;
    price += floorsCount * basePricePerFloor;
    price *= propertyMultipliers[propertyType];

    // Add extras cost
    selectedExtras.forEach(extraId => {
      const option = INITIAL_EXTRAS.find(e => e.id === extraId);
      if (option) {
        price += option.price;
      }
    });

    // Apply frequency discount
    price *= frequencyDiscounts[frequency];

    // Floor to nearest dollar for clean presentation
    setEstimatedPrice(Math.round(price));
  }, [propertyType, windowsCount, floorsCount, selectedExtras, frequency]);

  // Is custom quote requested?
  const isCustomQuoteRequired = windowsCount > 35 || propertyType === 'commercial-high';

  const handleToggleExtra = (extraId: string) => {
    if (selectedExtras.includes(extraId)) {
      setSelectedExtras(selectedExtras.filter(id => id !== extraId));
    } else {
      setSelectedExtras([...selectedExtras, extraId]);
    }
  };

  const handleSubmitCustomQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !address) return;

    setIsSubmitting(true);
    try {
      await Api.createQuote({
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        address,
        propertyType,
        windowsCount,
        floorsCount,
        extras: selectedExtras,
        frequency,
        notes,
        estimatedPrice
      });
      setSubmitSuccess(true);
      if (onQuoteSubmitted) {
        onQuoteSubmitted();
      }
    } catch (err) {
      console.error('Failed to submit quote request', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantBook = () => {
    if (onNavigateToBooking) {
      onNavigateToBooking({
        propertyType,
        windowsCount,
        floorsCount,
        extras: selectedExtras,
        frequency,
        estimatedPrice
      });
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid md:grid-cols-12">
        
        {/* Left Side: Parameters Form */}
        <div className="p-6 sm:p-8 md:col-span-7 bg-slate-50/50">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Calculator className="h-5.5 w-5.5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Quote Calculator</h2>
              <p className="text-xs text-slate-500">Configure your property for an instant estimation</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* 1. Property Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Property Type
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {(['terraced', 'semi-detached', 'detached', 'apartment', 'commercial-low', 'commercial-high'] as PropertyType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPropertyType(type)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                      propertyType === type
                        ? 'border-blue-600 bg-blue-50/40 text-blue-700 font-medium'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {type.includes('commercial') ? (
                      <Building className="h-4.5 w-4.5 mb-1.5" />
                    ) : (
                      <Calculator className="h-4.5 w-4.5 mb-1.5" />
                    )}
                    <span className="text-xs capitalize leading-tight">
                      {type.replace('-', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Windows Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Number of Windows
                </label>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  {windowsCount} Windows
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="50"
                value={windowsCount}
                onChange={(e) => setWindowsCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>4 (Small Apt)</span>
                <span>20 (Standard House)</span>
                <span>35+ (Large / Custom)</span>
              </div>
            </div>

            {/* 3. Floors */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Number of Floors
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(floor => (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => setFloorsCount(floor)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all cursor-pointer ${
                      floorsCount === floor
                        ? 'border-blue-600 bg-blue-50/40 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {floor} {floor === 1 ? 'Floor' : 'Floors'}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Cleaning Frequency */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Cleaning Frequency (Discount Applied)
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['one-off', '4-weeks', '6-weeks', '8-weeks'] as CleaningFrequency[]).map(freq => {
                  let badge = '';
                  if (freq === '4-weeks') badge = '15% Off';
                  if (freq === '6-weeks') badge = '10% Off';
                  if (freq === '8-weeks') badge = '5% Off';
                  return (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFrequency(freq)}
                      className={`relative flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                        frequency === freq
                          ? 'border-blue-600 bg-blue-50/40 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-semibold capitalize">
                        {freq.replace('-', ' ')}
                      </span>
                      {badge && (
                        <span className="mt-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Extras Checklist */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                Add Premium Extras
              </label>
              <div className="space-y-2">
                {INITIAL_EXTRAS.map(extra => {
                  const isSelected = selectedExtras.includes(extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => handleToggleExtra(extra.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/20 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <span className="text-xs font-medium">{extra.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        +£{extra.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Estimated Price / Request Form */}
        <div className="p-6 sm:p-8 md:col-span-5 flex flex-col justify-between bg-slate-900 text-white">
          {!isCustomQuoteRequired ? (
            /* Instant Booking Estimator */
            <div className="h-full flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
                  Estimated Pricing
                </h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    £{estimatedPrice}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-400">
                    / {frequency === 'one-off' ? 'clean' : frequency.replace('-', ' ')}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  This is an instant estimation based on current weather rules and parameters. Includes standard frames, sills wash, and ultra-pure water polish.
                </p>

                {/* Estimation details */}
                <div className="mt-6 space-y-2 rounded-xl bg-slate-800/60 p-4 border border-slate-700/50">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Base Clean ({windowsCount} windows)</span>
                    <span className="font-semibold text-white">£{windowsCount * basePricePerWindow}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Floor Access Adjust ({floorsCount} fl.)</span>
                    <span className="font-semibold text-white">£{floorsCount * basePricePerFloor}</span>
                  </div>
                  {selectedExtras.length > 0 && (
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Extras Selection ({selectedExtras.length})</span>
                      <span className="font-semibold text-white">
                        +£{selectedExtras.reduce((sum, extId) => sum + (INITIAL_EXTRAS.find(e => e.id === extId)?.price || 0), 0)}
                      </span>
                    </div>
                  )}
                  {frequency !== 'one-off' && (
                    <div className="flex justify-between text-xs text-emerald-400 border-t border-slate-700/80 pt-2 font-medium">
                      <span>Frequency discount</span>
                      <span>
                        -{Math.round((1 - frequencyDiscounts[frequency]) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleInstantBook}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 px-4 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-sky-500/10 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Book Instant Appointment
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-center text-[10px] text-slate-400">
                  No credit card required upfront. Pay upon job completion.
                </p>
              </div>
            </div>
          ) : (
            /* Custom Quote Form */
            <div className="h-full flex flex-col justify-between">
              {submitSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 mb-4 animate-bounce">
                    <Check className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Request Submitted!</h3>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed px-4">
                    Thank you! We have received your custom requirements for {windowsCount} windows. An administrator will assess constraints and email a formal quote within 1-2 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitSuccess(false);
                      setWindowsCount(15);
                      setPropertyType('semi-detached');
                      setName('');
                      setEmail('');
                      setAddress('');
                    }}
                    className="mt-6 text-xs font-semibold text-sky-400 hover:underline"
                  >
                    Calculate Another Quote
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitCustomQuote} className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-xs font-bold">Custom Assessment Required</h4>
                        <p className="text-[10px] text-amber-200">
                          {windowsCount > 35 ? 'High window volumes' : 'Specialist commercial height'} require safety planning.
                        </p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase">
                    Submit Details for Custom Assessment
                  </h3>

                  <div className="space-y-3 text-slate-800">
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs border border-white/10 focus:border-sky-400 outline-none"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs border border-white/10 focus:border-sky-400 outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs border border-white/10 focus:border-sky-400 outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Property Cleaning Address"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs border border-white/10 focus:border-sky-400 outline-none"
                    />
                    <textarea
                      placeholder="Specific instructions, access issues, high glazing details..."
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-white/10 text-white placeholder-slate-400 rounded-xl px-3 py-2 text-xs border border-white/10 focus:border-sky-400 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-4 py-3 text-center text-xs font-bold text-slate-900 shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Sending Request...' : 'Send Custom Quote Request'}
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
