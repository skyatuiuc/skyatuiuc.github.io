import React, { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoster } from '../context/RosterContext';
import TabBar from '../components/TabBar';
import RetreatSelector from '../components/RetreatSelector';
import VolunteersTab from '../components/admin/VolunteersTab';
import RetreatsTab from '../components/admin/RetreatsTab';
import { UserPlus, Calendar, Users, Mail, FileText, Tag, BarChart3, Database, CheckCircle2, AlertCircle, HeartHandshake, ArrowRight } from 'lucide-react';

// Heavy tabs (PDF/canvas tooling, charts) load only when opened
const GroupAssignmentTab = lazy(() => import('../components/GroupAssignmentTab'));
const AutoEmailDispatchTab = lazy(() => import('../components/AutoEmailDispatchTab'));
const FlyerTemplateStudioTab = lazy(() => import('../components/admin/FlyerTemplateStudioTab'));
const NametagTemplateTab = lazy(() => import('../components/NametagTemplateTab'));
const CampaignAnalyticsTab = lazy(() => import('../components/admin/CampaignAnalyticsTab'));
const DataTab = lazy(() => import('../components/admin/DataTab'));

const TabFallback = () => (
  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Loading…</div>
);

export default function Admin() {
  const { currentUser, authorizedEmails } = useAuth();
  const { retreats } = useRoster();
  const [activeTab, setActiveTab] = useState('volunteers');
  const [message, setMessage] = useState({ type: '', text: '' });

  const tabs = [
    { id: 'volunteers', label: `Volunteer Access (${authorizedEmails.length})`, Icon: UserPlus },
    { id: 'retreats', label: `Retreat Management (${retreats.length})`, Icon: Calendar, accent: 'var(--sky-sun)', color: '#B45309' },
    { id: 'groups', label: 'Group Assignments', Icon: Users },
    { id: 'emails', label: 'Auto Email Dispatch', Icon: Mail },
    { id: 'flyer_templates', label: 'Flyer Templates', Icon: FileText, accent: 'var(--illini-orange)', color: '#C2410C' },
    { id: 'nametag_templates', label: 'Nametag Templates', Icon: Tag, accent: '#0284C7', color: '#0284C7' },
    { id: 'campaign_analytics', label: 'Campaign Scan Analytics', Icon: BarChart3, accent: 'var(--sky-sun)', color: '#B45309' },
    { id: 'data', label: 'Data, Usage & Backups', Icon: Database, accent: '#10B981', color: '#166534' }
  ];

  return (
    <div style={{ padding: '3.5rem 0 6rem 0' }}>
      <div className="container">

        {/* Admin Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, color: 'var(--text-main)' }}>UIUC Campus Administration & Monitoring</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
              Authenticated Super Admin: <strong style={{ color: 'var(--sky-blue)' }}>{currentUser?.email}</strong>
            </p>
          </div>

          <Link to="/volunteer" className="btn btn-primary" style={{ padding: '0.8rem 1.35rem', whiteSpace: 'nowrap' }}>
            <HeartHandshake size={18} /> Open Volunteer Portal <ArrowRight size={16} />
          </Link>
        </div>

        {/* Status Message Alert */}
        {message.text && (
          <div style={{
            background: message.type === 'success' ? '#DCFCE7' : '#FEF2F2',
            border: `1px solid ${message.type === 'success' ? '#86EFAC' : '#F87171'}`,
            color: message.type === 'success' ? '#166534' : '#DC2626',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span style={{ fontWeight: 600 }}>{message.text}</span>
          </div>
        )}

        <RetreatSelector />

        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'volunteers' && <VolunteersTab setMessage={setMessage} />}
        {activeTab === 'retreats' && <RetreatsTab setMessage={setMessage} />}

        <Suspense fallback={<TabFallback />}>
          {activeTab === 'groups' && <GroupAssignmentTab />}
          {activeTab === 'emails' && <AutoEmailDispatchTab />}
          {activeTab === 'flyer_templates' && <FlyerTemplateStudioTab setMessage={setMessage} />}
          {activeTab === 'nametag_templates' && <NametagTemplateTab />}
          {activeTab === 'campaign_analytics' && <CampaignAnalyticsTab />}
          {activeTab === 'data' && <DataTab />}
        </Suspense>

      </div>
    </div>
  );
}
