import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { currentUser, isAdmin, isVolunteer, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div className="spinner" style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(31, 116, 241, 0.15)',
            borderTopColor: 'var(--sky-blue)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Verifying credentials...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/unauthorized" state={{ reason: 'not_logged_in', requireAdmin }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/unauthorized" state={{ reason: 'admin_required' }} replace />;
  }

  if (!requireAdmin && !isVolunteer) {
    return <Navigate to="/unauthorized" state={{ reason: 'volunteer_required' }} replace />;
  }

  return children;
}
