import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';
import AuthModal from '../components/AuthModal';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const reason = location.state?.reason || 'restricted';

  return (
    <div className="container" style={{ paddingTop: '5rem', paddingBottom: '6rem', minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '560px', width: '100%', padding: '3rem 2.5rem', textAlign: 'center', background: '#FFFFFF', boxShadow: 'var(--shadow-lg)' }}>
        
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--sky-sun-light)',
          border: '1px solid rgba(250, 188, 29, 0.4)',
          color: '#B45309',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          {reason === 'admin_required' ? <ShieldAlert size={36} /> : <Lock size={36} />}
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
          {reason === 'admin_required' ? 'Super Admin Access Only' : 'Volunteer Restricted Page'}
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          {reason === 'admin_required' ? (
            <>
              This page is strictly reserved for administrative management by <strong style={{ color: 'var(--sky-coral)' }}>{ADMIN_EMAIL}</strong>.
            </>
          ) : reason === 'not_logged_in' ? (
            <>
              You must sign in with an authorized volunteer email to view this protected resource page.
            </>
          ) : (
            <>
              Your account (<strong style={{ color: 'var(--text-main)' }}>{currentUser?.email}</strong>) has not been added to the authorized volunteer list yet.
            </>
          )}
        </p>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          lineHeight: 1.5
        }}>
          If you believe you need volunteer access, please contact{' '}
          <strong style={{ color: 'var(--sky-blue)' }}>{ADMIN_EMAIL}</strong>.
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="btn btn-primary"
          >
            Sign In with Different Account
          </button>
          
          <Link to="/" className="btn btn-secondary">
            <ArrowLeft size={16} /> Return to Home
          </Link>
        </div>

      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
