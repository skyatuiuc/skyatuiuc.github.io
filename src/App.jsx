import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Research from './pages/Research';
import Register from './pages/Register';
import MyRetreats from './pages/MyRetreats';
import Admin from './pages/Admin';
import Volunteer from './pages/Volunteer';
import Unauthorized from './pages/Unauthorized';
import CampaignTracker from './pages/CampaignTracker';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              {/* Public General Info & Marketing Page */}
              <Route path="/" element={<Home />} />

              {/* Public Scientific Research Directory */}
              <Route path="/research" element={<Research />} />

              {/* Standalone Participant Application Page */}
              <Route path="/register" element={<Register />} />
              <Route path="/register/:retreatId" element={<Register />} />

              {/* Participant Retreat History & Completion Page */}
              <Route path="/my-retreats" element={<MyRetreats />} />

              {/* Guarded Volunteer Portal (Whitelisted Emails Only) */}
              <Route 
                path="/volunteer" 
                element={
                  <ProtectedRoute requireAdmin={false}>
                    <Volunteer />
                  </ProtectedRoute>
                } 
              />

              {/* Guarded Super Admin Hub (skyatuiuc@gmail.com Only) */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <Admin />
                  </ProtectedRoute>
                } 
              />

              {/* Access Denied Page */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Dynamic Campaign Analytics & Shortlink Redirect Handler */}
              <Route path="/:campaignTag" element={<CampaignTracker />} />

              {/* Catch-all Fallback */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
