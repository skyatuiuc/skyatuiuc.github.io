import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase/config';
import { X, LogIn, ShieldAlert } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    const onWindowFocus = () => {
      setTimeout(() => {
        setLoading(false);
      }, 400);
    };
    window.addEventListener('focus', onWindowFocus, { once: true });

    try {
      if (auth) {
        const user = await loginWithGoogle();
        if (user) {
          onClose();
        }
      } else {
        setError('Firebase Authentication is initializing. Please refresh and try again.');
      }
    } catch (err) {
      console.error("Google Auth Modal Error:", err);
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      window.removeEventListener('focus', onWindowFocus);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(35, 39, 95, 0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }} onClick={onClose}>
      
      <div style={{
        maxWidth: '440px',
        width: '100%',
        position: 'relative',
        padding: '2.5rem 2.25rem',
        borderRadius: 'var(--radius-lg)',
        background: '#FFFFFF',
        boxShadow: '0 20px 48px -8px rgba(35, 39, 95, 0.2)'
      }} className="glass-card animate-fade-in" onClick={e => e.stopPropagation()}>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(35, 39, 95, 0.06)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--sky-blue-light)',
            color: 'var(--sky-blue)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            border: '1px solid rgba(31, 116, 241, 0.3)'
          }}>
            <LogIn size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-headline)', color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            Sign In to SKY at UIUC
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
            Sign in with your Google account to submit retreat applications and access volunteer portals.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#DC2626',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Official Google OAuth Sign-In Button */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="btn btn-primary" 
          style={{ 
            width: '100%', 
            padding: '0.95rem 1rem', 
            justifyContent: 'center',
            fontSize: '0.95rem'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '0.6rem' }}>
            <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          {loading ? 'Signing in with Google...' : 'Continue with Google Account'}
        </button>

      </div>
    </div>
  );
}
