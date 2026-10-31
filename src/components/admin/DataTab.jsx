import React, { useState, useEffect, useCallback } from 'react';
import { collection, getCountFromServer, getDocs } from 'firebase/firestore';
import { app, db, isFirebaseConfigured } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useRoster } from '../../context/RosterContext';
import { todayChicago } from '../../utils/dateUtils';
import { downloadBlob, registrationsToCsv } from '../../utils/exportUtils';
import DataMigrationPanel from './DataMigrationPanel';
import { Activity, CheckCircle2, Database, Download, ExternalLink, FileText, RefreshCw, ShieldCheck } from 'lucide-react';

// Admin tab: live document counts, links to Google's authoritative usage dashboards, backups/exports,
// and the one-time schema migration. (Replaces the old self-reported telemetry charts, which counted
// client-side guesses rather than billed operations.)

const BACKUP_COLLECTIONS = [
  'retreat_history',
  'registrations',
  'registration_private',
  'authorized_volunteers',
  'system_settings',
  'flyer_templates',
  'nametag_templates'
];

const cardStyle = { padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' };

const linkButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.9rem 1.1rem',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  background: '#F8FAFC',
  color: 'var(--text-main)',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '0.9rem'
};

const exportButtonStyle = {
  background: '#F8FAFC',
  border: '1px solid var(--border-color)',
  color: 'var(--text-main)',
  padding: '1rem 1.25rem',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '0.4rem',
  cursor: 'pointer',
  textAlign: 'left'
};

export default function DataTab() {
  const { currentUser, authorizedEmails } = useAuth();
  const { retreats, activeRetreat, registrations } = useRoster();
  const [counts, setCounts] = useState(null);
  const [countsError, setCountsError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const projectId = app?.options?.projectId || 'skyatuiuc-web';
  const usageLinks = [
    { label: 'Firestore usage (reads / writes / deletes, last 30 days)', href: `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/usage` },
    { label: 'Firebase usage & billing (all products, quota status)', href: `https://console.firebase.google.com/project/${projectId}/usage` },
    { label: 'Google Cloud quotas for Firestore', href: `https://console.cloud.google.com/apis/api/firestore.googleapis.com/quotas?project=${projectId}` },
    { label: 'Apps Script executions (email relay & campaign engine)', href: 'https://script.google.com/home/executions' }
  ];

  // Aggregation queries cost 1 read per 1,000 documents counted; run once when the tab opens
  const refreshCounts = useCallback(async () => {
    if (!isFirebaseConfigured || !db) return;
    setCountsError('');
    try {
      const [regs, rets, vols] = await Promise.all(
        ['registrations', 'retreat_history', 'authorized_volunteers'].map(name => getCountFromServer(collection(db, name)))
      );
      setCounts({
        registrations: regs.data().count,
        retreats: rets.data().count,
        volunteers: vols.data().count,
        checkedAt: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.warn('Count query notice:', err);
      setCountsError('Could not load counts from Firestore.');
    }
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 6000);
  };

  // Full snapshot reads every document once (an explicit admin action, not a listener)
  const handleFullBackup = async () => {
    setBusy('backup');
    try {
      const collections = {};
      const countsByName = {};
      for (const name of BACKUP_COLLECTIONS) {
        const snap = await getDocs(collection(db, name));
        collections[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        countsByName[name] = snap.size;
      }
      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          exportedBy: currentUser?.email || '',
          description: 'SKY at UIUC Complete Database Backup (template image chunks excluded)',
          version: '2.0.0'
        },
        collections,
        counts: countsByName
      };
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `skyatuiuc_full_backup_${todayChicago()}.json`);
      flash(`Full backup downloaded (${countsByName.registrations} registrations, ${countsByName.retreat_history} retreats).`);
    } catch (err) {
      console.error('Backup failed:', err);
      flash(`Backup failed: ${err.message}`);
    } finally {
      setBusy('');
    }
  };

  const handleRosterCsv = () => {
    if (registrations.length === 0) {
      flash('No registrations in the active retreat to export.');
      return;
    }
    const csv = registrationsToCsv(registrations, activeRetreat, authorizedEmails);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `skyatuiuc_${activeRetreat?.id || 'roster'}_${todayChicago()}.csv`);
    flash(`Exported ${registrations.length} registrations for ${activeRetreat?.title || 'the active retreat'}.`);
  };

  const handleRetreatsJson = () => {
    const payload = { exportedAt: new Date().toISOString(), retreats };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `skyatuiuc_retreats_${todayChicago()}.json`);
    flash(`Exported ${retreats.length} retreat records.`);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Live counts */}
        <div className="glass-card" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Database size={22} color="var(--sky-blue)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>Database Contents</h3>
            </div>
            <button type="button" onClick={refreshCounts} className="btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {countsError && <p style={{ color: '#DC2626', fontSize: '0.85rem' }}>{countsError}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {[
              ['Registrations', counts?.registrations],
              ['Retreats', counts?.retreats],
              ['Volunteers', counts?.volunteers]
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{value ?? '—'}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Server-side counts{counts?.checkedAt ? `, checked at ${counts.checkedAt}` : ''}.
          </p>
        </div>

        {/* Authoritative usage */}
        <div className="glass-card" style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Activity size={22} color="#16A34A" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>Usage & Quotas</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
            Google&apos;s own dashboards show exactly what is billed against the daily free quota
            (50,000 reads / 20,000 writes / 20,000 deletes). Sign in as skyatuiuc@gmail.com.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {usageLinks.map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" style={linkButtonStyle}>
                {link.label} <ExternalLink size={15} color="var(--text-muted)" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Backups & exports */}
      <div className="glass-card" style={{ ...cardStyle, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={22} color="#16A34A" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Database Backup & Data Export</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '680px', lineHeight: 1.5 }}>
              The full snapshot reads every document once ({BACKUP_COLLECTIONS.length} collections, all retreats). Take one before any migration or bulk change.
            </p>
          </div>
          {notice && (
            <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #86EFAC' }}>
              <CheckCircle2 size={16} /> {notice}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <button type="button" onClick={handleFullBackup} disabled={busy === 'backup'} className="btn" style={{ ...exportButtonStyle, background: 'var(--sky-blue-subtle)', border: '1px solid rgba(31, 116, 241, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--sky-blue)' }}>
              <Download size={18} /> {busy === 'backup' ? 'Reading database…' : 'Full System Snapshot (.JSON)'}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Every retreat, registration, volunteer note, setting and template record.
            </span>
          </button>

          <button type="button" onClick={handleRosterCsv} className="btn" style={exportButtonStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: '#16A34A' }}>
              <FileText size={18} /> Active Retreat Roster (.CSV)
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {registrations.length} registrations for {activeRetreat?.title || 'the selected retreat'}.
            </span>
          </button>

          <button type="button" onClick={handleRetreatsJson} className="btn" style={exportButtonStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: '#B45309' }}>
              <Download size={18} /> Retreat History (.JSON)
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Dates, times, venues, instructors, and group configurations.
            </span>
          </button>
        </div>
      </div>

      <DataMigrationPanel />
    </div>
  );
}
