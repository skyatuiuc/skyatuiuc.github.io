import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Register from './pages/Register';
import CampaignTracker from './pages/CampaignTracker';

// Dynamic on-demand code splitting for heavy & guarded pages
const Research = lazy(() => import('./pages/Research'));
const MyRetreats = lazy(() => import('./pages/MyRetreats'));
const Volunteer = lazy(() => import('./pages/Volunteer'));
const Admin = lazy(() => import('./pages/Admin'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

function PageFallback() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      color: 'var(--text-secondary)'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid rgba(31, 116, 241, 0.2)',
        borderTopColor: 'var(--sky-blue)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading SKY UIUC...</span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public General Info & Marketing Page */}
                <Route path="/" element={<Home />} />

                {/* Public Scientific Research Directory (Lazy) */}
                <Route path="/research" element={<Research />} />

                {/* Standalone Participant Application Page */}
                <Route path="/register" element={<Register />} />
                <Route path="/register/:retreatId" element={<Register />} />

                {/* Participant Retreat History & Completion Page (Lazy) */}
                <Route path="/my-retreats" element={<MyRetreats />} />

                {/* Guarded Volunteer Portal (Lazy) */}
                <Route 
                  path="/volunteer" 
                  element={
                    <ProtectedRoute requireAdmin={false}>
                      <Volunteer />
                    </ProtectedRoute>
                  } 
                />

                {/* Guarded Super Admin Hub (Lazy) */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />

                {/* Access Denied Page (Lazy) */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Dynamic Campaign Analytics & Shortlink Redirect Handler */}
                <Route path="/:campaignTag" element={<CampaignTracker />} />

                {/* Catch-all Fallback */}
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

