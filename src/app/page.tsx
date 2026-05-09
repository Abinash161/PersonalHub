export const dynamic = 'force-dynamic';

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, signup, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
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
    <div className="main">
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          minHeight: 'calc(100vh - 2rem)',
          alignItems: 'center',
          maxWidth: '1100px',
          margin: '0 auto',
          paddingInline: '24px',
        }}
      >
        <section>
          <div className="panel">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <div className="nav-logo-icon" style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span aria-hidden style={{ fontSize: 20 }}>✨</span>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.12em' }}>
                  PersonalHub
                </p>
                <h1 className="section-title" style={{ marginTop: 6 }}>Your private digital sanctuary</h1>
              </div>
            </div>

            <p style={{ color: 'var(--text3)', maxWidth: 520, lineHeight: 1.6 }}>Keep notes, music, photos, and letters in one polished space with a calm dark interface, subtle motion, and instant access across devices.</p>

            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { title: 'Notes that feel fast', body: 'Clean workspace, quick editing, zero clutter.' },
                { title: 'Music that stays handy', body: 'Playback controls right where you need them.' },
                { title: 'Photos with breathing room', body: 'Soft grids, better spacing, stronger contrast.' },
                { title: 'Letters with presence', body: 'A quieter layout for writing that feels intentional.' },
              ].map((item) => (
                <div key={item.title} className="note-card" style={{ padding: 12 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.title}</h2>
                  <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text3)' }}>{item.body}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-cyan">Secure sign-in</span>
              <span className="badge badge-purple">Responsive by default</span>
            </div>
          </div>
        </section>

        <section>
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.12em' }}>Welcome back</p>
                <h2 style={{ marginTop: 8, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{isSignup ? 'Create your account' : 'Sign in to continue'}</h2>
                <p style={{ marginTop: 8, color: 'var(--text3)' }}>{isSignup ? 'Create your secure hub and start organizing everything in one place.' : 'Pick up where you left off with your personal notes, music, and photos.'}</p>
              </div>

              <div style={{ display: 'none' }} />
            </div>

            {error && (
              <div role="alert" style={{ marginBottom: 12, borderRadius: 12, border: '1px solid rgba(240,80,80,0.2)', background: 'rgba(240,80,80,0.06)', padding: '10px 12px', color: 'var(--text)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label htmlFor="email" className="field-label">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="field-input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="field-label">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field-input"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div style={{ marginTop: 14, textAlign: 'center', color: 'var(--text3)' }}>
              {isSignup ? 'Already have an account?' : 'New here?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError('');
                }}
                style={{ fontWeight: 700, color: 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                {isSignup ? 'Sign in' : 'Create an account'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
