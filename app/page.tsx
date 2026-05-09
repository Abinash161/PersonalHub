'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, signup, user } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-white placeholder-white/25 outline-none transition focus:border-indigo-500/50 focus:bg-indigo-500/5';

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#080b14', fontFamily: "'Sora', 'Inter', sans-serif" }}
    >
      {/* Google font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/15 blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/8 blur-[80px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1100px] grid-cols-1 items-center gap-8 px-6 py-12 lg:grid-cols-2">

        {/* ── Left: hero ── */}
        <section className="hidden lg:block">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-xl">
                ✨
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">PersonalHub</p>
                <h1 className="mt-0.5 text-[18px] font-bold text-white">Your private digital sanctuary</h1>
              </div>
            </div>

            <p className="mb-8 text-[14px] leading-relaxed text-white/40">
              Keep notes, music, photos, and letters in one polished space — calm dark interface, instant access across devices.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: '📝', title: 'Notes that feel fast',      body: 'Clean workspace, quick editing, zero clutter.' },
                { emoji: '🎵', title: 'Music that stays handy',    body: 'Playback controls right where you need them.' },
                { emoji: '🖼️', title: 'Photos with breathing room', body: 'Soft grids, better spacing, stronger contrast.' },
                { emoji: '💌', title: 'Letters with presence',     body: 'A quieter layout for writing that feels intentional.' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-white/14"
                >
                  <div className="mb-2 text-xl">{item.emoji}</div>
                  <h2 className="text-[13px] font-semibold text-white">{item.title}</h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/35">{item.body}</p>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
                Secure sign-in
              </span>
              <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-300">
                Responsive by default
              </span>
            </div>
          </div>
        </section>

        {/* ── Right: auth form ── */}
        <section className="w-full">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8">
            {/* Mobile logo */}
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg">
                ✨
              </div>
              <span className="text-[16px] font-bold text-white">PersonalHub</span>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">
              {isSignup ? 'Get started' : 'Welcome back'}
            </p>
            <h2 className="mt-2 text-[22px] font-extrabold tracking-tight text-white">
              {isSignup ? 'Create your account' : 'Sign in to continue'}
            </h2>
            <p className="mt-2 mb-8 text-[13px] text-white/35">
              {isSignup
                ? 'Create your secure hub and start organizing everything in one place.'
                : 'Pick up where you left off with your personal notes, music, and photos.'}
            </p>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-[13px] text-red-300"
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl py-3 text-[14px] font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-[13px] text-white/30">
              {isSignup ? 'Already have an account?' : 'New here?'}{' '}
              <button
                type="button"
                onClick={() => { setIsSignup(!isSignup); setError(''); }}
                className="font-semibold text-white transition hover:text-indigo-300"
              >
                {isSignup ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}