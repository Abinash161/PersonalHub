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

  return (
    <div className="main" style={{ paddingTop: 0, minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        width: '100%',
        alignItems: 'center',
      }}>

        {/* Left: hero */}
        <div className="panel" style={{ position: 'static' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div className="nav-logo-icon" style={{ width: 48, height: 48, borderRadius: 12, fontSize: 22 }}>✨</div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text3)' }}>
                PersonalHub
              </p>
              <p className="section-title" style={{ marginTop: 4 }}>Your private digital sanctuary</p>
            </div>
          </div>

          <p style={{ color: 'var(--text3)', lineHeight: 1.6, fontSize: 14, marginBottom: 20 }}>
            Keep notes, music, photos, and letters in one polished space — calm dark interface, instant access across devices.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { emoji: '📝', title: 'Notes that feel fast',       body: 'Clean workspace, quick editing, zero clutter.' },
              { emoji: '🎵', title: 'Music that stays handy',     body: 'Playback controls right where you need them.' },
              { emoji: '🖼️', title: 'Photos with breathing room', body: 'Soft grids, better spacing, stronger contrast.' },
              { emoji: '💌', title: 'Letters with presence',      body: 'A quieter layout for intentional writing.' },
            ].map((item) => (
              <div className="note-card" key={item.title} style={{ padding: 14 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{item.emoji}</div>
                <h4 style={{ marginBottom: 4 }}>{item.title}</h4>
                <p>{item.body}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-cyan">Secure sign-in</span>
            <span className="badge badge-purple">Responsive by default</span>
          </div>
        </div>

        {/* Right: auth form */}
        <div className="panel" style={{ position: 'static' }}>
          <div className="panel-title">
            {isSignup ? '🚀 Get started' : '👋 Welcome back'}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.5px' }}>
            {isSignup ? 'Create your account' : 'Sign in to continue'}
          </h2>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            {isSignup
              ? 'Create your secure hub and start organizing everything in one place.'
              : 'Pick up where you left off with your notes, music, and photos.'}
          </p>

          {error && (
            <div role="alert" style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)',
              color: '#fca5a5', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 4 }}>
            <label className="field-label">Email</label>
            <input
              type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" className="field-input"
            />
            <label className="field-label">Password</label>
            <input
              type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete={isSignup ? 'new-password' : 'current-password'}
              className="field-input"
            />
            <button
              type="submit" disabled={loading}
              className="btn-primary" style={{ marginTop: 8, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
            {isSignup ? 'Already have an account?' : 'New here?'}{' '}
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font)' }}
            >
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}