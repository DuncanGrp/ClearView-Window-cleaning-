/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, CleanerProfile, CustomerProfile, AuditLog } from '../types';
import { Api } from '../api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Briefcase, Users, Calendar, AlertTriangle, CheckCircle, TrendingUp, RefreshCw, Terminal, Clock } from 'lucide-react';

interface AdminDashboardProps {
  bookings: Booking[];
  cleaners: CleanerProfile[];
  customers: CustomerProfile[];
  onRefreshAll: () => void;
  onViewPending?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  cleaners,
  customers,
  onRefreshAll,
  onViewPending
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      try {
        const audit = await Api.getLogs();
        setLogs(audit);
      } catch (err) {
        console.error('Failed to load logs', err);
      }
    }
    loadLogs();
  }, [bookings]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshAll();
    try {
      const audit = await Api.getLogs();
      setLogs(audit);
    } catch (err) {
      console.error(err);
    }
    setIsRefreshing(false);
  };

  // 1. Calculate General KPI Statistics
  const todayStr = '2026-07-14'; // Enforce system current date
  const todayJobs = bookings.filter(b => b.date === todayStr);
  const pendingJobs = bookings.filter(b => b.status === 'pending');
  const completedJobs = bookings.filter(b => b.status === 'completed');
  const cancelledJobs = bookings.filter(b => b.status === 'cancelled');

  // Total Earnings
  const totalRevenue = completedJobs.reduce((sum, b) => sum + b.price, 0);
  const upcomingRevenue = bookings
    .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.price, 0);

  // Active & Repeat Customers
  const totalCustomersCount = customers.length;
  // Repeat customer is a customer with more than 1 booking
  const customerEmailsCount: Record<string, number> = {};
  bookings.forEach(b => {
    customerEmailsCount[b.customerEmail] = (customerEmailsCount[b.customerEmail] || 0) + 1;
  });
  const repeatCustomersCount = Object.values(customerEmailsCount).filter(count => count > 1).length;

  // 2. Prepare Recharts Datasets
  // Dataset A: Monthly Revenue / Booking totals (Mar - Jul 2026)
  const monthlyData = [
    { name: 'Mar 26', bookings: 12, revenue: 540, customers: 3 },
    { name: 'Apr 26', bookings: 18, revenue: 810, customers: 5 },
    { name: 'May 26', bookings: 25, revenue: 1220, customers: 8 },
    { name: 'Jun 26', bookings: 35, revenue: 1850, customers: 12 },
    { name: 'Jul 26', bookings: bookings.length, revenue: bookings.reduce((sum, b) => sum + b.price, 0), customers: customers.length }
  ];

  // Dataset B: Booking Status distribution
  const statusCounts = bookings.reduce((acc: Record<string, number>, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  
  const statusPieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.toUpperCase().replace('_', ' '),
    value: count
  }));

  const COLORS = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

  // Dataset C: Cleaner performance comparison
  const cleanerPerformanceData = cleaners.map(cln => {
    const jobsCount = bookings.filter(b => b.cleanerId === cln.id && b.status === 'completed').length;
    return {
      name: cln.name,
      completedJobs: cln.completedJobsCount + jobsCount,
      rating: cln.rating
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Title block with refresh triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Executive Command Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Real-time diagnostics, cleaner status, revenue calculations, and customer acquisition metrics.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing live metrics...' : 'Synchronize Logs'}
        </button>
      </div>

      {/* KPI Grid Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Completed Revenue */}
        <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed Revenue</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">£{totalRevenue}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" />
              +14%
            </span>
            <span>from previous month</span>
          </div>
        </div>

        {/* Card 2: Jobs Today */}
        <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Jobs</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{todayJobs.length} Jobs</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-bold text-blue-600">
              {todayJobs.filter(j => j.status === 'completed').length} Completed
            </span>
            <span>• {todayJobs.filter(j => j.status === 'in_progress').length} In Progress</span>
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div 
          onClick={onViewPending}
          className={`rounded-2xl border border-slate-150 bg-white p-5 shadow-xs ${onViewPending ? 'cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all' : ''}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Bookings</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{pendingJobs.length} Alerts</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-amber-600">Needs Admin Confirmation</span>
            {onViewPending && (
              <span className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5">
                Manage Queue →
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Clients */}
        <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clients</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{totalCustomersCount} Accounts</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-bold text-indigo-600">{repeatCustomersCount} Repeat</span>
            <span>({Math.round((repeatCustomersCount / Math.max(1, totalCustomersCount)) * 100)}% loyalty rate)</span>
          </div>
        </div>

      </div>

      {/* Recharts Graphical Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Revenue Area Chart */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Growth Performance & Volume Scale
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Earnings (£)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="bookings" name="Booking Volume" stroke="#10b981" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-emerald-600" />
            Workload Distribution
          </h3>
          <div className="h-72 w-full flex flex-col justify-between">
            {statusPieData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-12">No current bookings in DB.</div>
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 overflow-y-auto max-h-20 border-t border-slate-100 pt-2">
                  {statusPieData.map((d, idx) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="truncate">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cleaner Productivity bar comparison */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-indigo-600" />
            Cleaner Productivity (Completed Cleans)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cleanerPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="completedJobs" name="Completed Cleans" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Audit Terminal */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-slate-950 p-5 shadow-sm text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <h3 className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
              <Terminal className="h-4.5 w-4.5 text-sky-400" />
              Live Security Audits (GDPR Compliant)
            </h3>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[9px] font-semibold text-sky-400 tracking-wider">SECURE</span>
          </div>

          <div className="h-56 overflow-y-auto space-y-2.5 scrollbar-thin text-[11px] font-mono">
            {logs.length === 0 ? (
              <div className="py-12 text-center text-slate-600">No security audit logs recorded.</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="border-b border-slate-900/50 pb-2">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span className="text-sky-300 font-bold">{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 mt-1 leading-normal">{log.details}</p>
                  <div className="flex gap-2 text-[9px] text-slate-500 mt-0.5">
                    <span>Actor: {log.user}</span>
                    <span>•</span>
                    <span>Role: {log.role}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Today's Jobs Urgent List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
          <Clock className="h-4.5 w-4.5 text-blue-500" />
          Urgent Dispatch Checklist (Today: {todayStr})
        </h3>

        {todayJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No window cleaning scheduled for today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-500">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-1">Job ID</th>
                  <th className="py-3">Customer</th>
                  <th className="py-3">Location</th>
                  <th className="py-3">Timeslot</th>
                  <th className="py-3">Technician</th>
                  <th className="py-3">Price</th>
                  <th className="py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-1 font-bold font-mono text-blue-600">{job.id}</td>
                    <td className="py-3 font-semibold text-slate-800">{job.customerName}</td>
                    <td className="py-3 max-w-xs truncate">{job.address}</td>
                    <td className="py-3 font-medium text-slate-700">{job.timeSlot}</td>
                    <td className="py-3 font-semibold text-slate-800">{job.cleanerName || '❌ Unassigned'}</td>
                    <td className="py-3 font-bold text-slate-900">£{job.price}</td>
                    <td className="py-3 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                        job.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : job.status === 'cancelled'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
