/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserSession } from '../types';
import { Shield, Sparkles, X, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface PortalLoginProps {
  onLoginSuccess: (session: UserSession) => void;
  onClose: () => void;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({ onLoginSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Invalid email or password.');
      }

      const session: UserSession = await response.json();
      setSuccess(true);
      setTimeout(() => {
        onLoginSuccess(session);
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setEmail('ownertest@clearview.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-250">
      <div 
        id="portal-login-modal" 
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 text-white shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 shadow-lg shadow-sky-500/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-sky-300 via-blue-200 to-white bg-clip-text text-transparent">
              Business Portal Login
            </h2>
            <p className="text-xs text-slate-400">
              Access administrative features and dispatch dispatch boards.
            </p>
          </div>
        </div>

        {/* Success / Error States */}
        {success ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-emerald-300 animate-pulse text-xs">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <span>Success! Granting secure portal credentials, loading board...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Portal Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ownertest@clearview.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 pl-11 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 focus:bg-slate-950/70"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 pl-11 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 focus:bg-slate-950/70"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-50 transition-all hover:brightness-110"
          >
            {loading ? 'Authenticating Securely...' : 'Enter Business Portal'}
          </button>
        </form>

        {/* Divider / Quick Fill */}
        <div className="border-t border-slate-800 pt-4 text-center">
          <p className="text-[10px] text-slate-500 mb-2 font-medium">Demonstration Quick-Fill Credential Tool</p>
          <button
            type="button"
            onClick={handleQuickFillAdmin}
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-bold transition-all cursor-pointer bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl hover:bg-sky-500/20"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            Fill Owner (Admin) Credentials
          </button>
        </div>
      </div>
    </div>
  );
};
