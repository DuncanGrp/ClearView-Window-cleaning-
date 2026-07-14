/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Booking, CleanerProfile } from '../types';
import { Api } from '../api';
import { Navigation, Camera, Edit3, CheckCircle2, MapPin, Phone, MessageSquare, Compass, ShieldAlert, FileText } from 'lucide-react';

interface CleanerDashboardProps {
  currentSession: { userId: string; name: string };
  bookings: Booking[];
  onRefreshBookings: () => void;
  onSendFCMNotification: (title: string, body: string) => void;
}

export const CleanerDashboard: React.FC<CleanerDashboardProps> = ({
  currentSession,
  bookings,
  onRefreshBookings,
  onSendFCMNotification
}) => {
  const [cleaner, setCleaner] = useState<CleanerProfile | null>(null);
  const [selectedJob, setSelectedJob] = useState<Booking | null>(null);

  // Cleaner action fields
  const [cleanerNotes, setCleanerNotes] = useState('');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState('');
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('');

  // Signature pad states
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigPoints, setSigPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [signatureSvg, setSignatureSvg] = useState('');
  const sigContainerRef = useRef<HTMLDivElement>(null);

  // Maps simulation
  const [isNavigating, setIsNavigating] = useState(false);
  const [etaMins, setEtaMins] = useState(15);
  const [distanceKm, setDistanceKm] = useState(4.2);

  // Filter jobs assigned to this cleaner
  const myJobs = bookings.filter(b => b.cleanerId === currentSession.userId);
  const pendingJobs = myJobs.filter(b => b.status !== 'completed' && b.status !== 'cancelled');
  const completedJobs = myJobs.filter(b => b.status === 'completed');

  // Next job is the first pending job
  const nextJob = pendingJobs[0] || null;

  useEffect(() => {
    async function loadCleaner() {
      try {
        const cleaners = await Api.getCleaners();
        const match = cleaners.find(c => c.id === currentSession.userId);
        if (match) {
          setCleaner(match);
        }
      } catch (err) {
        console.error('Failed to load cleaner profile', err);
      }
    }
    loadCleaner();
  }, [currentSession]);

  // Set default action fields when selecting a job
  useEffect(() => {
    if (selectedJob) {
      setCleanerNotes(selectedJob.cleanerNotes || '');
      setBeforePhotoUrl(selectedJob.beforePhotos[0] || '');
      setAfterPhotoUrl(selectedJob.afterPhotos[0] || '');
      setSignatureSvg(selectedJob.signatureSvg || '');
      setSigPoints([]);
    }
  }, [selectedJob]);

  const handleUpdateStatus = async (jobId: string, status: any) => {
    try {
      const updated = await Api.updateBooking(jobId, { status });
      onRefreshBookings();
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(updated);
      }
      
      // Trigger FCM Simulation
      let fcmBody = '';
      if (status === 'en_route') fcmBody = `Dave Carter is en route to clean your windows! ETA ${etaMins} mins.`;
      if (status === 'arrived') fcmBody = 'Dave has arrived at your location with the pure water pole system.';
      if (status === 'in_progress') fcmBody = 'Your window clean is currently in progress. Squeegees ready!';
      
      if (fcmBody) {
        onSendFCMNotification('Cleaner Update', fcmBody);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Simulated before/after photo selection
  const simulatePhotoUpload = (type: 'before' | 'after') => {
    const beforePool = [
      'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop'
    ];
    const afterPool = [
      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&auto=format&fit=crop'
    ];

    if (type === 'before') {
      const img = beforePool[Math.floor(Math.random() * beforePool.length)];
      setBeforePhotoUrl(img);
    } else {
      const img = afterPool[Math.floor(Math.random() * afterPool.length)];
      setAfterPhotoUrl(img);
    }
  };

  // Signature pad sketching logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!sigContainerRef.current) return;
    setIsDrawing(true);
    const rect = sigContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSigPoints([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !sigContainerRef.current) return;
    const rect = sigContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSigPoints(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    // Compile points into an SVG path
    if (sigPoints.length > 1) {
      let d = `M ${sigPoints[0].x} ${sigPoints[0].y}`;
      for (let i = 1; i < sigPoints.length; i++) {
        d += ` L ${sigPoints[i].x} ${sigPoints[i].y}`;
      }
      const svg = `<svg viewBox="0 0 350 120" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      setSignatureSvg(svg);
    }
  };

  const handleClearSignature = () => {
    setSigPoints([]);
    setSignatureSvg('');
  };

  const handleCompleteJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      await Api.updateBooking(selectedJob.id, {
        status: 'completed',
        cleanerNotes,
        beforePhotos: beforePhotoUrl ? [beforePhotoUrl] : [],
        afterPhotos: afterPhotoUrl ? [afterPhotoUrl] : [],
        signatureSvg: signatureSvg || undefined
      });
      
      setSelectedJob(null);
      onRefreshBookings();
      onSendFCMNotification('Job Completed!', `Dave has finished cleaning your windows at ${selectedJob.address}. Check your history to view photo proof and leave a review.`);
    } catch (err) {
      console.error('Failed to complete job', err);
    }
  };

  const handleSimulateNavigation = () => {
    setIsNavigating(true);
    setEtaMins(12);
    setDistanceKm(3.8);
    // Simulate navigation count down
    const interval = setInterval(() => {
      setEtaMins(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsNavigating(false);
          return 0;
        }
        return prev - 1;
      });
      setDistanceKm(prev => Math.max(0, parseFloat((prev - 0.3).toFixed(1))));
    }, 4000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Cleaner Header Summary */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs">
        <div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            🧹 Cleaner Portal
          </span>
          <h1 className="text-xl font-extrabold text-slate-800 mt-2">
            Technician: {cleaner?.name || currentSession.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Standard Rating: <strong>⭐ {cleaner?.rating}</strong> • Lifetime Completed Cleans: <strong>{cleaner?.completedJobsCount}</strong>
          </p>
        </div>
        <div className="flex gap-4 text-xs text-slate-600">
          <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-center">
            <span className="block font-black text-blue-600 text-lg">{pendingJobs.length}</span>
            <span>Assigned Today</span>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-center">
            <span className="block font-black text-emerald-600 text-lg">{completedJobs.length}</span>
            <span>Completed Today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Assigned jobs */}
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Today's Route Schedule ({pendingJobs.length} active)
          </h2>

          <div className="space-y-4">
            {pendingJobs.length === 0 ? (
              <div className="bg-white border border-slate-150 p-8 rounded-2xl text-center text-slate-400 text-xs">
                🎉 High-five! All jobs are completed for the day.
              </div>
            ) : (
              pendingJobs.map((job, idx) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`w-full text-left rounded-2xl border p-4.5 transition-all flex flex-col justify-between gap-3 shadow-xs cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                        <span className="text-slate-400">ROUTE JOB #{idx + 1}</span>
                        <span className="text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase">
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm mt-1.5 truncate">
                        {job.customerName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        📍 {job.address}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        ⏱️ Slot: {job.timeSlot}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {job.windowsCount} windows • {job.floorsCount} floors
                      </span>
                      <span className="font-bold text-slate-900">
                        £{job.price}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Dynamic job actions / Maps routing */}
        <div className="lg:col-span-8 space-y-6">
          {selectedJob ? (
            /* Active Job Checklist & Completer Form */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono uppercase">{selectedJob.id}</span>
                    <h3 className="text-base font-extrabold text-slate-800">{selectedJob.customerName}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">📍 {selectedJob.address}</p>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1"
                >
                  Deselect
                </button>
              </div>

              {/* Status Update bar */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Update Booking Dispatch State
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedJob.id, 'en_route')}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedJob.status === 'en_route' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    En Route
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedJob.id, 'arrived')}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedJob.status === 'arrived' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Arrived
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedJob.id, 'in_progress')}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedJob.status === 'in_progress' ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedJob.id, 'rain_delay')}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                      selectedJob.status === 'rain_delay' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Rain Delay
                  </button>
                </div>
              </div>

              {/* Client specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="p-3.5 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-1.5">
                  <span className="font-bold text-slate-800 block">Security Instructions:</span>
                  <p>{selectedJob.notes || 'No customer notes.'}</p>
                  {selectedJob.gateCode && <p className="font-semibold text-blue-700">🔒 Gate Access Code: {selectedJob.gateCode}</p>}
                  {selectedJob.hasDog && <p className="font-semibold text-amber-700">🐾 Dog in garden: KEEP GATE LOCKED</p>}
                </div>

                <div className="p-3.5 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-1.5">
                  <span className="font-bold text-slate-800 block">Job Details:</span>
                  <p><strong>Package:</strong> {selectedJob.serviceName}</p>
                  <p><strong>Work Target:</strong> {selectedJob.windowsCount} windows • {selectedJob.floorsCount} floors</p>
                  {selectedJob.extras.length > 0 && <p className="text-blue-600 font-semibold">⚡ Extras: {selectedJob.extras.join(', ')}</p>}
                </div>
              </div>

              {/* Complete Job Form */}
              <form onSubmit={handleCompleteJobSubmit} className="space-y-6 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Complete Job & Upload Proofs</h4>
                
                {/* Simulated Photo upload components */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-slate-500 uppercase">Before Photo</span>
                    {beforePhotoUrl ? (
                      <div className="relative rounded-2xl overflow-hidden h-36 border border-slate-200">
                        <img src={beforePhotoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button type="button" onClick={() => setBeforePhotoUrl('')} className="absolute top-2 right-2 bg-slate-900 text-white rounded p-1 text-[10px]">Remove</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => simulatePhotoUpload('before')}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl h-36 w-full text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer"
                      >
                        <Camera className="h-6 w-6 mb-1.5" />
                        <span className="text-[11px] font-bold">Simulate Snapshot</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Show dirty glass state</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-slate-500 uppercase">After Photo</span>
                    {afterPhotoUrl ? (
                      <div className="relative rounded-2xl overflow-hidden h-36 border border-slate-200">
                        <img src={afterPhotoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button type="button" onClick={() => setAfterPhotoUrl('')} className="absolute top-2 right-2 bg-slate-900 text-white rounded p-1 text-[10px]">Remove</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => simulatePhotoUpload('after')}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl h-36 w-full text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer"
                      >
                        <Camera className="h-6 w-6 mb-1.5" />
                        <span className="text-[11px] font-bold">Simulate Snapshot</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">Show squeegeed sparkle proof</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cleaner Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Technician Work Notes</label>
                  <textarea
                    rows={2}
                    value={cleanerNotes}
                    onChange={e => setCleanerNotes(e.target.value)}
                    placeholder="e.g. Cleared back gutters, frames deeply wiped, front bottom left sash window was slightly loose."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Signature Capture component */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Customer Sign-off Signature</label>
                    {signatureSvg && (
                      <button
                        type="button"
                        onClick={handleClearSignature}
                        className="text-[10px] text-red-600 hover:underline cursor-pointer"
                      >
                        Reset Pad
                      </button>
                    )}
                  </div>

                  {signatureSvg ? (
                    <div className="h-24 w-full border border-slate-200 rounded-xl bg-slate-50 p-2.5 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: signatureSvg }} />
                  ) : (
                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                      <div
                        ref={sigContainerRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="h-24 w-full cursor-crosshair touch-none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] text-slate-400 font-semibold select-none">
                        🖌️ Click & Drag to sign on delivery
                      </div>
                    </div>
                  )}
                </div>

                {/* Form submit button */}
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-center text-sm font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Sign-off & Mark Job Completed
                </button>
              </form>

            </div>
          ) : (
            /* Google Maps Navigation Simulation */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Active Navigation Assist</h3>
                <p className="text-xs text-slate-500 mt-1">Select any job on the left to review checklists. Below is your current optimized route guidance map.</p>
              </div>

              {/* Styled Maps Simulation Canvas */}
              <div className="relative rounded-2xl overflow-hidden h-90 bg-slate-100 border border-slate-200 flex flex-col justify-between">
                
                {/* SVG Route Visualization */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid background */}
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Road Paths */}
                  <path d="M 50,220 L 150,220 L 150,80 L 350,80 L 350,280 L 520,280" fill="none" stroke="#cbd5e1" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 150,80 L 150,20 L 450,20 L 450,150" fill="none" stroke="#cbd5e1" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Active Navigation Path (Blue Line) */}
                  {isNavigating && (
                    <path
                      d="M 50,220 L 150,220 L 150,80 L 350,80"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="10 6"
                      className="animate-[dash_10s_linear_infinite]"
                      style={{
                        animation: 'dash 15s linear infinite'
                      }}
                    />
                  )}

                  {/* Van Marker (Dave) */}
                  <circle cx={isNavigating ? 150 : 50} cy={isNavigating ? 150 : 220} r="10" fill="#2563eb" stroke="white" strokeWidth="3" className={isNavigating ? 'animate-pulse' : ''} />
                  
                  {/* Customer Marker Pin */}
                  <g transform="translate(350, 70)">
                    <circle cx="0" cy="0" r="14" fill="#ef4444" stroke="white" strokeWidth="2.5" />
                    <circle cx="0" cy="0" r="5" fill="white" />
                  </g>

                  {/* Customer Label card */}
                  <g transform="translate(350, 30)">
                    <rect x="-60" y="-12" width="120" height="24" rx="6" fill="#1e293b" opacity="0.95" />
                    <text x="0" y="4" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">
                      {nextJob ? nextJob.customerName : 'Guildford Clean'}
                    </text>
                  </g>
                </svg>

                {/* Floating GPS HUD */}
                <div className="absolute top-4 left-4 bg-slate-900/95 text-white p-4 rounded-2xl border border-slate-700/50 shadow-xl max-w-xs space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-sky-400 font-bold border-b border-slate-700 pb-1.5 uppercase tracking-wide text-[10px]">
                    <Compass className="h-4 w-4 animate-spin-slow" />
                    GPS Co-Pilot
                  </div>
                  <div>
                    <span className="text-slate-400">Route Destination</span>
                    <p className="font-semibold truncate text-[11px] mt-0.5">{nextJob ? nextJob.address : 'No active dispatches.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-700/60 pt-1.5 text-center">
                    <div>
                      <span className="text-slate-400 text-[10px]">ETA</span>
                      <p className="font-black text-white text-sm">{nextJob ? `${etaMins}m` : '--'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Distance</span>
                      <p className="font-black text-white text-sm">{nextJob ? `${distanceKm}km` : '--'}</p>
                    </div>
                  </div>
                </div>

                {/* Map Control overlay (Bottom) */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {nextJob ? (
                    <button
                      onClick={handleSimulateNavigation}
                      disabled={isNavigating}
                      className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-blue-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      {isNavigating ? 'Navigating Active...' : 'Simulate Turn Guidance'}
                    </button>
                  ) : (
                    <div className="bg-slate-900/90 text-white rounded-lg px-3 py-1.5 text-[10px]">No Dispatched Cleanings</div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
