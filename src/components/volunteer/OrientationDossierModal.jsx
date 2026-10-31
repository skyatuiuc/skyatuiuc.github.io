import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRoster } from '../../context/RosterContext';
import { getDisplayName, getStatus, getPayment, getAppliedAtMs, STATUS_OPTIONS, PAYMENT } from '../../models/applicant';
import { todayChicago } from '../../utils/dateUtils';
import { Mail, Phone, MessageSquare, Copy, X, FileText, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';

// Orientation dossier for one applicant. Every control writes straight to Firestore and renders from
// the live roster document (latency compensation makes the change visible immediately), except the
// notes textarea, which keeps a local draft that is debounced and always flushed when the modal closes.

const NOTES_DEBOUNCE_MS = 600;

const STATUS_LABELS = { Pending: 'Pending Orientation' };

const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' };
const controlStyle = { width: '100%', padding: '0.65rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' };

const copyToClipboard = (text) => {
  if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
};

export default function OrientationDossierModal({ reg, onClose }) {
  const { currentUser, isAdmin, authorizedEmails } = useAuth();
  const { updateRegistration, saveNotes, deleteRegistration } = useRoster();
  const userEmailLower = (currentUser?.email || '').toLowerCase();

  const [notesDraft, setNotesDraft] = useState(reg.notes || '');
  const [saveState, setSaveState] = useState({ kind: 'idle', text: '' });
  const [showAppDetails, setShowAppDetails] = useState(false);

  const savedFlashRef = useRef(null);
  const flashSaved = useCallback(() => {
    setSaveState({ kind: 'saved', text: 'Changes saved' });
    clearTimeout(savedFlashRef.current);
    savedFlashRef.current = setTimeout(() => setSaveState({ kind: 'idle', text: '' }), 2000);
  }, []);
  useEffect(() => () => clearTimeout(savedFlashRef.current), []);

  const save = async (fields) => {
    try {
      await updateRegistration(reg.id, fields);
      flashSaved();
    } catch (err) {
      console.warn('Registration update failed:', err);
      setSaveState({ kind: 'error', text: `Not saved: ${err.code || err.message}` });
    }
  };

  // ----- Notes: debounced while typing, flushed on close -----
  const lastSavedNotesRef = useRef(reg.notes || '');
  const pendingNotesRef = useRef(null);
  const regRef = useRef(reg);
  regRef.current = reg;
  const saveNotesRef = useRef(saveNotes);
  saveNotesRef.current = saveNotes;
  const userEmailRef = useRef(currentUser?.email);
  userEmailRef.current = currentUser?.email;

  const flushNotes = useCallback(async () => {
    const text = pendingNotesRef.current;
    if (text === null) return;
    pendingNotesRef.current = null;
    try {
      await saveNotesRef.current(regRef.current, text, userEmailRef.current);
      lastSavedNotesRef.current = text;
      return true;
    } catch (err) {
      console.warn('Notes save failed:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (notesDraft === lastSavedNotesRef.current) return undefined;
    pendingNotesRef.current = notesDraft;
    const timer = setTimeout(async () => {
      const ok = await flushNotes();
      if (ok) flashSaved();
      else if (ok === false) setSaveState({ kind: 'error', text: 'Notes not saved. Check your connection.' });
    }, NOTES_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [notesDraft, flushNotes, flashSaved]);

  // Unsaved notes are written even if the modal closes mid-debounce
  useEffect(() => () => { flushNotes(); }, [flushNotes]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ----- Field handlers -----
  const claimedBy = reg.claimedBy || '';
  const setClaim = (email) => save({
    claimedBy: email || null,
    claimedByName: email
      ? (email.toLowerCase() === userEmailLower ? (currentUser?.displayName || email.split('@')[0]) : email.split('@')[0])
      : null
  });

  const handleDelete = async () => {
    if (!window.confirm('Delete this registration (and its volunteer notes)? This cannot be undone.')) return;
    try {
      pendingNotesRef.current = null;
      await deleteRegistration(reg.id);
      onClose();
    } catch (err) {
      setSaveState({ kind: 'error', text: `Delete failed: ${err.code || err.message}` });
    }
  };

  const status = getStatus(reg);
  const payment = getPayment(reg);
  const appliedMs = getAppliedAtMs(reg);
  const phoneDigits = String(reg.phone || '').replace(/[^0-9+]/g, '');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(35, 39, 95, 0.45)', backdropFilter: 'blur(8px)', zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', cursor: 'pointer'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Orientation dossier for ${getDisplayName(reg)}`}
        className="glass-card modal-responsive-card animate-fade-in"
        style={{
          width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto',
          padding: 'clamp(1rem, 4vw, 2.25rem)', border: '1px solid var(--border-color)',
          background: '#FFFFFF', boxShadow: 'var(--shadow-lg)', cursor: 'default'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.66rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{getDisplayName(reg)}</h2>
              {reg.academicRole && <span className="badge badge-earth" style={{ fontSize: '0.72rem' }}>🎓 {reg.academicRole}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <Mail size={14} color="var(--sky-blue)" />
                <a href={`mailto:${reg.email}`} style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}>{reg.email}</a>
                <button onClick={() => copyToClipboard(reg.email)} className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', gap: '0.2rem', marginLeft: '0.25rem' }} title="Copy email">
                  <Copy size={11} /> Copy
                </button>
              </div>

              {phoneDigits && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                  <Phone size={14} color="#16A34A" />
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{reg.phone}</span>
                  <a href={`tel:${phoneDigits}`} className="btn btn-primary btn-sm" style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', gap: '0.25rem', background: '#10B981', borderColor: '#10B981', color: '#FFF', marginLeft: '0.25rem' }} title="Call">
                    <Phone size={11} /> Call
                  </a>
                  <a href={`sms:${phoneDigits}`} className="btn btn-primary btn-sm" style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', gap: '0.25rem', background: '#0284C7', borderColor: '#0284C7', color: '#FFF' }} title="Text">
                    <MessageSquare size={11} /> Text
                  </a>
                  <button onClick={() => copyToClipboard(reg.phone)} className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', gap: '0.2rem' }} title="Copy phone">
                    <Copy size={11} /> Copy
                  </button>
                </div>
              )}

              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Submitted: {appliedMs ? new Date(appliedMs).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unknown'}
              </div>
            </div>
          </div>

          <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(35, 39, 95, 0.06)', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Control bench */}
        <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label htmlFor="dossier-status" style={labelStyle}>ORIENTATION STATUS</label>
            <select id="dossier-status" value={status} onChange={(e) => save({ status: e.target.value })} style={{ ...controlStyle, fontWeight: 700, fontSize: '0.9rem' }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>PRIMARY POINT OF CONTACT</label>
            {isAdmin ? (
              <select value={claimedBy} onChange={(e) => setClaim(e.target.value)} style={{ ...controlStyle, fontWeight: 600 }}>
                <option value="">Unclaimed (No Contact)</option>
                {claimedBy && !authorizedEmails.includes(claimedBy.toLowerCase()) && <option value={claimedBy}>{claimedBy}</option>}
                {authorizedEmails.map(email => <option key={email} value={email}>{email}</option>)}
              </select>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="text" readOnly value={claimedBy ? (claimedBy.toLowerCase() === userEmailLower ? 'Claimed by You' : (reg.claimedByName || claimedBy)) : 'Unclaimed'} style={{ ...controlStyle, border: '1px solid var(--border-color)' }} />
                {!claimedBy && <button onClick={() => setClaim(currentUser.email)} className="btn btn-sun btn-sm">Claim</button>}
                {claimedBy.toLowerCase() === userEmailLower && <button onClick={() => setClaim('')} className="btn btn-secondary btn-sm">Unclaim</button>}
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>FEE (SUPER ADMIN MANAGED)</label>
            <div style={{
              padding: '0.65rem',
              background: payment.isSettled ? '#DCFCE7' : '#FFEDD5',
              border: payment.isSettled ? '1px solid #86EFAC' : '1px solid #FDBA74',
              borderRadius: 'var(--radius-sm)',
              color: payment.isSettled ? '#166534' : '#C2410C',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}>
              {payment.status === PAYMENT.EXEMPT ? '✓ Free ($0 Tuition)' : payment.status === PAYMENT.PAID ? `✓ ${payment.formattedFee} Paid` : `⚠️ ${payment.formattedFee} Unpaid`}
            </div>
          </div>

          <div>
            <label style={labelStyle}>IAHV REGISTRATION</label>
            <button type="button" onClick={() => save({ iahvRegistered: !reg.iahvRegistered })} className={`btn ${reg.iahvRegistered ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}>
              {reg.iahvRegistered ? '✓ IAHV Registered' : 'Not Registered'}
            </button>
          </div>
        </div>

        {/* Contact log & notes */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label htmlFor="dossier-notes" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              ORIENTATION NOTES & LOGS <span style={{ fontWeight: 500 }}>(visible to volunteers only)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Last Contacted:</span>
              <input
                type="date"
                value={reg.lastContactedDate || ''}
                onChange={(e) => save({ lastContactedDate: e.target.value })}
                style={{ padding: '0.3rem 0.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.78rem' }}
              />
              <button type="button" onClick={() => save({ lastContactedDate: todayChicago() })} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                Log Contact Today
              </button>
            </div>
          </div>
          <textarea
            id="dossier-notes"
            rows={4}
            placeholder="Record orientation notes, phone impressions, scheduling notes, or participant comments (auto-saved as you type)..."
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            style={{ width: '100%', padding: '0.85rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6 }}
          />
        </div>

        {/* Application answers */}
        <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.75rem' }}>
          <button onClick={() => setShowAppDetails(!showAppDetails)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
              <FileText size={18} color="var(--sky-blue)" /> Participant Application Responses
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--sky-blue)', fontWeight: 600 }}>
              {showAppDetails ? '▲ Hide Application Answers' : '▼ View Application Answers'}
            </div>
          </button>

          {showAppDetails && (
            <div className="animate-fade-in" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {[
                  ['Email Address', reg.email],
                  ['Phone Number', reg.phone],
                  ['Academic Role / Affiliation', reg.academicRole],
                  ['Age', reg.isOver18],
                  ['Completed SKY Course Before?', reg.completedSkyBefore]
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>{label}</span>
                    <strong style={{ color: 'var(--text-main)' }}>{value}</strong>
                  </div>
                ))}
              </div>

              {((Array.isArray(reg.healthConditions) && reg.healthConditions.length > 0) || reg.otherHealthConditions) && (
                <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'var(--sky-sun-light)', border: '1px solid rgba(250, 188, 29, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: '#B45309', display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Medical / Health Conditions Reported</span>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0 }}>
                    {(reg.healthConditions || []).join(', ')}
                    {reg.otherHealthConditions ? ` (${reg.otherHealthConditions})` : ''}
                  </p>
                </div>
              )}

              {reg.foodAllergies && (
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Dietary Restrictions / Food Allergies</span>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0 }}>{reg.foodAllergies}</p>
                </div>
              )}

              {reg.referralSource && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>How They Heard About SKY</span>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0 }}>{reg.referralSource}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saveState.kind === 'saved' && (
              <span style={{ color: '#16A34A', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={16} /> {saveState.text}
              </span>
            )}
            {saveState.kind === 'error' && (
              <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={16} /> {saveState.text}
              </span>
            )}
            {saveState.kind === 'idle' && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                Auto-saved in real time
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {isAdmin && (
              <button type="button" onClick={handleDelete} style={{ padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-sm)', background: '#FEF2F2', border: '1px solid #F87171', color: '#DC2626', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Delete registration (Super Admin only)">
                <Trash2 size={14} /> Delete Application
              </button>
            )}
            <button onClick={onClose} className="btn btn-primary" style={{ padding: '0.55rem 1.25rem' }}>Done (Esc)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
