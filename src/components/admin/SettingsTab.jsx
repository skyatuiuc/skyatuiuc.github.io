import React, { useEffect, useState } from 'react';
import { Save, Settings, Activity } from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { DEFAULT_CHEAT_SHEET_URL } from '../../services/emailService';
import { useToast } from '../ui/ToastProvider';

// Admin tab: global email links, contacts, the cheat sheet and the Gmail relay URL
// (system_settings/email_config). Replaces the Email Settings modal that lived in Email Dispatch.

// Relays older than this lack token verification (see docs/UX_QOL_RECOMMENDATIONS.md, URGENT)
const MIN_SECURE_RELAY_VERSION = [4, 4, 0];

const isAtLeast = (version, min) => {
  const parts = String(version || '').split('.').map(n => Number(n) || 0);
  for (let i = 0; i < min.length; i += 1) {
    if ((parts[i] || 0) !== min[i]) return (parts[i] || 0) > min[i];
  }
  return true;
};

// Asks the relay which version it runs (doGet), so a stale deployment is visible here
function RelayHealth({ webhookUrl }) {
  const [state, setState] = useState({ status: 'idle' });
  const check = async () => {
    setState({ status: 'checking' });
    try {
      const res = await fetch(webhookUrl);
      const data = await res.json();
      setState({ status: data?.status === 'online' ? 'online' : 'error', version: data?.version || '', message: data?.message || '' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  };
  const secure = state.status === 'online' && isAtLeast(state.version, MIN_SECURE_RELAY_VERSION);
  return (
    <div className="row" data-testid="relay-health">
      <button type="button" className="btn btn-secondary btn-sm" onClick={check} disabled={!webhookUrl || state.status === 'checking'}>
        <Activity size={14} /> {state.status === 'checking' ? 'Checking…' : 'Check relay'}
      </button>
      {state.status === 'online' && (
        <span className={`notice ${secure ? 'notice-success' : 'notice-error'}`} style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}>
          {secure
            ? `Relay online · v${state.version}`
            : `Relay online but outdated (v${state.version || 'unknown'}): it lacks token verification. Redeploy it (npm run deploy:apps-script).`}
        </span>
      )}
      {state.status === 'error' && (
        <span className="notice notice-error" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}>Relay not reachable: {state.message || 'unknown error'}</span>
      )}
    </div>
  );
}

export default function SettingsTab() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const { emailSettings, settingsLoaded, saveEmailSettings } = useSettings();
  const isSuperAdmin = (currentUser?.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const [formData, setFormData] = useState(emailSettings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Follow live changes until the admin starts editing
  useEffect(() => { if (!dirty) setFormData(emailSettings); }, [emailSettings, dirty]);

  const update = (next) => {
    setFormData(next);
    setDirty(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      await saveEmailSettings(formData);
      setDirty(false);
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(`Settings not saved: ${err.code || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!settingsLoaded) return <div className="card muted">Loading settings…</div>;

  return (
    <div className="card" style={{ padding: '1.75rem', maxWidth: '760px' }}>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <Settings size={22} color="#B45309" />
        <div>
          <h2 className="text-main" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Settings</h2>
          <p className="text-secondary text-sm">Links and contacts used in every email, the home practice cheat sheet, and the Gmail relay.</p>
        </div>
      </div>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <>
              <h3 className="text-main" style={{ fontSize: '1.05rem', fontWeight: 800 }}>Email template links & contacts</h3>
              {/* IAHV Course Registration Link */}
              <div style={{ background: 'var(--sky-blue-subtle)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(31, 116, 241, 0.25)' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--sky-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  IAHV Course Registration Link (Official Portal) *
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.defaultRegistrationLink || formData.registrationLink || ''}
                  onChange={(e) => update({
                    ...formData,
                    defaultRegistrationLink: e.target.value,
                    registrationLink: e.target.value
                  })}
                  placeholder="https://members.us.iahv.org/us-en/course/checkout..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.2)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem',
                    fontWeight: 600
                  }}
                />
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  This official IAHV registration URL is included in all <strong>Application Accepted</strong> and <strong>Registration Reminder</strong> emails so accepted participants can register prior to the retreat.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  WhatsApp Community Chat Link
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.whatsAppLink}
                  onChange={(e) => update({ ...formData, whatsAppLink: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Post-Retreat Feedback Survey Link
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.surveyLink}
                  onChange={(e) => update({ ...formData, surveyLink: e.target.value })}
                  placeholder="https://forms.gle/..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Daily Morning Zoom Practice Link
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.dailyPracticeLink}
                  onChange={(e) => update({ ...formData, dailyPracticeLink: e.target.value })}
                  placeholder="https://illinois.zoom.us/j/..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Home Practice Cheat Sheet (Completion Email; image or Google Drive link)
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.cheatSheetUrl || ''}
                  onChange={(e) => update({ ...formData, cheatSheetUrl: e.target.value })}
                  placeholder={DEFAULT_CHEAT_SHEET_URL}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    On-Site Contact Name *
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    placeholder="Contact Name"
                    value={formData.contactName}
                    onChange={(e) => update({ ...formData, contactName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid rgba(35, 39, 95, 0.15)',
                      color: 'var(--text-main)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    On-Site Contact Phone *
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    placeholder="e.g. 217-555-0123"
                    value={formData.contactPhone}
                    onChange={(e) => update({ ...formData, contactPhone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid rgba(35, 39, 95, 0.15)',
                      color: 'var(--text-main)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>
            </>

            <>
              <h3 className="text-main" style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '0.75rem' }}>Gmail relay (Apps Script)</h3>
              <RelayHealth webhookUrl={formData.webhookUrl} />
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Google Apps Script Webhook URL (For skyatuiuc@gmail.com)
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.webhookUrl}
                  onChange={(e) => update({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                  Deploy the Apps Script snippet in Google Apps Script as a Web App to enable direct dispatching from <strong>skyatuiuc@gmail.com</strong>. Authentication is securely handled in real time via signed Firebase ID Tokens.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Central Club Sender Address
                </label>
                <input
                  type="email"
                  value={formData.senderEmail}
                  disabled={true}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: '#F8FAFC',
                    border: '1px solid var(--border-color)',
                    color: 'var(--sky-blue)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem',
                    fontWeight: 700
                  }}
                />
              </div>
            </>


        <div className="row" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          {dirty && <button type="button" className="btn btn-secondary" onClick={() => { setFormData(emailSettings); setDirty(false); }}>Discard changes</button>}
          <button type="submit" className="btn btn-primary" disabled={!isSuperAdmin || !dirty || saving}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
