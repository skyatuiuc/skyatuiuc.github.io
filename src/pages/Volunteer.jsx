import React, { useState, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoster } from '../context/RosterContext';
import TabBar from '../components/TabBar';
import RetreatSelector from '../components/RetreatSelector';
import OrientationTab from '../components/volunteer/OrientationTab';
import { AlertTriangle, UserCheck, CheckSquare, QrCode } from 'lucide-react';

const AttendanceTab = lazy(() => import('../components/AttendanceTab'));
const FlyerOutreachTab = lazy(() => import('../components/volunteer/FlyerOutreachTab'));

export default function Volunteer() {
  const { currentUser, isAdmin } = useAuth();
  const { syncError, registrations } = useRoster();
  const [activeTab, setActiveTab] = useState('orientations');

  const tabs = [
    { id: 'orientations', label: `Orientation Workbench (${registrations.length})`, Icon: UserCheck },
    { id: 'attendance', label: 'Retreat Attendance', Icon: CheckSquare, accent: '#10B981', color: '#10B981' },
    { id: 'flyers', label: 'Flyer & QR Studio', Icon: QrCode, accent: 'var(--sky-sun)', color: '#B45309' }
  ];

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container">

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Participant Orientation & Roster Portal</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Logged in as: <strong style={{ color: 'var(--sky-blue)' }}>{currentUser?.email}</strong>
              {isAdmin && <span className="badge badge-sun" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>SUPER ADMIN</span>}
            </p>
          </div>
        </div>

        {syncError && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#DC2626',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertTriangle size={20} />
            <span style={{ fontWeight: 600 }}>{syncError}</span>
          </div>
        )}

        <RetreatSelector />

        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: '2rem' }} />

        {activeTab === 'orientations' && <OrientationTab />}
        <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}>
          {activeTab === 'attendance' && <AttendanceTab />}
          {activeTab === 'flyers' && <FlyerOutreachTab />}
        </Suspense>

      </div>
    </div>
  );
}
