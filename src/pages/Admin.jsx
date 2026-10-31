import React, { lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRoster } from '../context/RosterContext';
import TabBar from '../components/TabBar';
import RetreatSelector from '../components/RetreatSelector';
import { usePortalUrlState } from '../hooks/usePortalUrlState';
import VolunteersTab from '../components/admin/VolunteersTab';
import RetreatsTab from '../components/admin/RetreatsTab';
import { UserPlus, Calendar, Users, Mail, FileText, Tag, BarChart3, Database, HeartHandshake, Settings, ArrowRight } from 'lucide-react';

// Heavy tabs (PDF/canvas tooling, charts) load only when opened
const GroupAssignmentTab = lazy(() => import('../components/GroupAssignmentTab'));
const AutoEmailDispatchTab = lazy(() => import('../components/AutoEmailDispatchTab'));
const FlyerTemplateStudioTab = lazy(() => import('../components/admin/FlyerTemplateStudioTab'));
const NametagTemplateTab = lazy(() => import('../components/NametagTemplateTab'));
const CampaignAnalyticsTab = lazy(() => import('../components/admin/CampaignAnalyticsTab'));
const DataTab = lazy(() => import('../components/admin/DataTab'));
const SettingsTab = lazy(() => import('../components/admin/SettingsTab'));

const TabFallback = () => (
  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Loading…</div>
);

export default function Admin() {
  const { currentUser, authorizedEmails } = useAuth();
  const { retreats } = useRoster();
  const tabs = [
    { id: 'volunteers', label: `Volunteer Access (${authorizedEmails.length})`, Icon: UserPlus },
    { id: 'retreats', label: `Retreat Management (${retreats.length})`, Icon: Calendar, accent: 'var(--sky-sun)', color: '#B45309' },
    { id: 'groups', label: 'Group Assignments', Icon: Users },
    { id: 'emails', label: 'Auto Email Dispatch', Icon: Mail },
    { id: 'flyer-templates', label: 'Flyer Templates', Icon: FileText, accent: 'var(--illini-orange)', color: '#C2410C' },
    { id: 'nametag-templates', label: 'Nametag Templates', Icon: Tag, accent: '#0284C7', color: '#0284C7' },
    { id: 'analytics', label: 'Campaign Scan Analytics', Icon: BarChart3, accent: 'var(--sky-sun)', color: '#B45309' },
    { id: 'data', label: 'Data, Usage & Backups', Icon: Database, accent: '#10B981', color: '#166534' },
    { id: 'settings', label: 'Settings', Icon: Settings, accent: '#64748B', color: '#334155' }
  ];
  const { activeTab, setActiveTab } = usePortalUrlState('/admin', tabs.map(t => t.id));
  const location = useLocation();


  return (
    <div style={{ padding: '3.5rem 0 6rem 0' }}>
      <div className="container">

        {/* Admin Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, color: 'var(--text-main)' }}>Admin Portal</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
              Authenticated Super Admin: <strong style={{ color: 'var(--sky-blue)' }}>{currentUser?.email}</strong>
            </p>
          </div>

          <Link to={`/volunteer${location.search}`} className="btn btn-primary" style={{ padding: '0.8rem 1.35rem', whiteSpace: 'nowrap' }}>
            <HeartHandshake size={18} /> Open Volunteer Portal <ArrowRight size={16} />
          </Link>
        </div>

        <RetreatSelector />

        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'volunteers' && <VolunteersTab />}
        {activeTab === 'retreats' && <RetreatsTab />}

        <Suspense fallback={<TabFallback />}>
          {activeTab === 'groups' && <GroupAssignmentTab />}
          {activeTab === 'emails' && <AutoEmailDispatchTab />}
          {activeTab === 'flyer-templates' && <FlyerTemplateStudioTab />}
          {activeTab === 'nametag-templates' && <NametagTemplateTab />}
          {activeTab === 'analytics' && <CampaignAnalyticsTab />}
          {activeTab === 'data' && <DataTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </Suspense>

      </div>
    </div>
  );
}
