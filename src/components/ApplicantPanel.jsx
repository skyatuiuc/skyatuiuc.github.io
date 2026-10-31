import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoster } from '../context/RosterContext';
import {
  getDisplayName, getStatus, getPayment, getAppliedAtMs, getGroupId, getGroupName, getAttendance,
  STATUS_OPTIONS, PAYMENT, RETREAT_DAYS, getStatusLabel
} from '../models/applicant';
import { todayChicago } from '../utils/dateUtils';
import Modal from './ui/Modal';
import { StatusBadge } from './ui/StatusBadge';
import { useConfirm } from './ui/ConfirmProvider';
import { Mail, Phone, MessageSquare, Copy, FileText, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';

// The one applicant panel, opened from Orientation, Groups, Attendance and Email Dispatch.
// It renders the live roster document, so edits made anywhere show immediately. Every control
// writes straight to Firestore, except the notes textarea, which keeps a local draft that is
// debounced and always flushed when the panel closes.

const NOTES_DEBOUNCE_MS = 600;

const SENT_EMAIL_LABELS = {
  application_received: 'Application Received',
  application_accepted: 'Application Accepted',
  reminder: 'Registration Reminder',
  welcome: 'Welcome & Preparation',
  completion: 'Completion & Follow-Up'
};

const copyToClipboard = (text) => {
  if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
};

const formatDateTime = (ms) => (ms
  ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  : 'Unknown');

export default function ApplicantPanel({ registrationId, onClose }) {
  const { registrations } = useRoster();
  const reg = registrations.find(r => r.id === registrationId);

  // Deleted or moved while open (or not in the active retreat): nothing left to show
  useEffect(() => {
    if (!reg) onClose();
  }, [reg, onClose]);
  if (!reg) return null;

  return <ApplicantPanelBody reg={reg} onClose={onClose} />;
}

function ApplicantPanelBody({ reg, onClose }) {
  const { currentUser, isAdmin, authorizedEmails } = useAuth();
  const confirm = useConfirm();
  const { activeRetreat, updateRegistration, saveNotes, deleteRegistration } = useRoster();
  const userEmailLower = (currentUser?.email || '').toLowerCase();

  const [notesDraft, setNotesDraft] = useState(reg.notes || '');
  const [saveState, setSaveState] = useState({ kind: 'idle', text: '' });
  const [showAnswers, setShowAnswers] = useState(false);

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
    if (text === null) return undefined;
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

  // Unsaved notes are written even if the panel closes mid-debounce
  useEffect(() => () => { flushNotes(); }, [flushNotes]);

  // ----- Field handlers -----
  const claimedBy = reg.claimedBy || '';
  const setClaim = (email) => save({
    claimedBy: email || null,
    claimedByName: email
      ? (email.toLowerCase() === userEmailLower ? (currentUser?.displayName || email.split('@')[0]) : email.split('@')[0])
      : null
  });

  const handleDelete = async () => {
    if (!(await confirm({ title: 'Delete registration?', message: 'This registration and its volunteer notes will be permanently deleted.', confirmLabel: 'Delete', danger: true }))) return;
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
  const attendance = getAttendance(reg);
  const groupId = getGroupId(reg, activeRetreat);
  const sentEmails = Object.entries(reg.sentEmails || {}).filter(([, rec]) => rec?.sent);
  const phoneDigits = String(reg.phone || '').replace(/[^0-9+]/g, '');

  return (
    <Modal onClose={onClose} width={850} title={getDisplayName(reg)}>
      {/* Header: identity & contact */}
      <div className="row" style={{ marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
        <StatusBadge status={status} />
        {reg.academicRole && <span className="badge badge-earth" style={{ fontSize: '0.72rem' }}>🎓 {reg.academicRole}</span>}
        <span className="muted text-xs">Submitted {formatDateTime(getAppliedAtMs(reg))}</span>
      </div>

      <div className="row text-sm" style={{ marginBottom: '1.5rem' }}>
        <div className="row" style={{ gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <Mail size={14} color="var(--sky-blue)" />
          <a href={`mailto:${reg.email}`} className="text-main fw-bold" style={{ textDecoration: 'none' }}>{reg.email}</a>
          <button type="button" onClick={() => copyToClipboard(reg.email)} className="btn btn-secondary btn-sm" title="Copy email"><Copy size={11} /> Copy</button>
        </div>
        {phoneDigits && (
          <div className="row" style={{ gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Phone size={14} color="#16A34A" />
            <span className="text-main fw-bold">{reg.phone}</span>
            <a href={`tel:${phoneDigits}`} className="btn btn-primary btn-sm" style={{ background: '#10B981', borderColor: '#10B981' }} title="Call"><Phone size={11} /> Call</a>
            <a href={`sms:${phoneDigits}`} className="btn btn-primary btn-sm" style={{ background: '#0284C7', borderColor: '#0284C7' }} title="Text"><MessageSquare size={11} /> Text</a>
            <button type="button" onClick={() => copyToClipboard(reg.phone)} className="btn btn-secondary btn-sm" title="Copy phone"><Copy size={11} /> Copy</button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="card" style={{ background: '#F8FAFC', boxShadow: 'none', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div>
          <label htmlFor="dossier-status" className="field-label">Application status</label>
          <select id="dossier-status" value={status} onChange={(e) => save({ status: e.target.value })} className="field-input fw-bold">
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="dossier-claim" className="field-label">Point of contact</label>
          {isAdmin ? (
            <select id="dossier-claim" value={claimedBy} onChange={(e) => setClaim(e.target.value)} className="field-input">
              <option value="">Unclaimed</option>
              {claimedBy && !authorizedEmails.includes(claimedBy.toLowerCase()) && <option value={claimedBy}>{claimedBy}</option>}
              {authorizedEmails.map(email => <option key={email} value={email}>{email}</option>)}
            </select>
          ) : (
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input id="dossier-claim" type="text" readOnly className="field-input" value={claimedBy ? (claimedBy.toLowerCase() === userEmailLower ? 'Claimed by you' : (reg.claimedByName || claimedBy)) : 'Unclaimed'} />
              {!claimedBy && <button type="button" onClick={() => setClaim(currentUser.email)} className="btn btn-sun btn-sm">Claim</button>}
              {claimedBy.toLowerCase() === userEmailLower && <button type="button" onClick={() => setClaim('')} className="btn btn-secondary btn-sm">Unclaim</button>}
            </div>
          )}
        </div>

        <div>
          <span className="field-label">Fee (admin managed)</span>
          <div className={`notice ${payment.isSettled ? 'notice-success' : 'notice-warning'}`} style={{ padding: '0.55rem 0.65rem' }}>
            {payment.status === PAYMENT.EXEMPT ? '✓ Free ($0)' : payment.status === PAYMENT.PAID ? `✓ ${payment.formattedFee} paid` : `${payment.formattedFee} unpaid`}
          </div>
        </div>

        <div>
          <span className="field-label">IAHV registration</span>
          <button type="button" onClick={() => save({ iahvRegistered: !reg.iahvRegistered })} className={`btn ${reg.iahvRegistered ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>
            {reg.iahvRegistered ? '✓ IAHV registered' : 'Not registered'}
          </button>
        </div>
      </div>

      {/* Notes & contact log */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="row-between" style={{ marginBottom: '0.5rem' }}>
          <label htmlFor="dossier-notes" className="field-label" style={{ marginBottom: 0 }}>
            Orientation notes <span style={{ fontWeight: 500, textTransform: 'none' }}>(volunteers only)</span>
          </label>
          <div className="row" style={{ gap: '0.5rem' }}>
            <label htmlFor="dossier-last-contacted" className="muted text-xs">Last contacted</label>
            <input id="dossier-last-contacted" type="date" value={reg.lastContactedDate || ''} onChange={(e) => save({ lastContactedDate: e.target.value })} className="select-compact" />
            <button type="button" onClick={() => save({ lastContactedDate: todayChicago() })} className="btn btn-secondary btn-sm">Log Contact Today</button>
          </div>
        </div>
        <textarea
          id="dossier-notes"
          rows={4}
          placeholder="Orientation notes, phone impressions, scheduling notes (auto-saved as you type)…"
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          className="field-input"
          style={{ fontSize: '0.9rem', lineHeight: 1.6 }}
        />
      </div>

      {/* Retreat record: group, attendance, emails */}
      <div className="card" style={{ background: '#F8FAFC', boxShadow: 'none', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div>
          <span className="field-label">Group</span>
          <div className="text-main fw-bold">{groupId ? getGroupName(groupId, activeRetreat) : 'Unassigned'}</div>
        </div>
        <div>
          <span className="field-label">Attendance ({attendance.attendedCount}/3)</span>
          <div className="row" style={{ gap: '0.35rem' }}>
            {RETREAT_DAYS.map((day, i) => (
              <span key={day} className="status-badge" style={attendance.days[day]
                ? { background: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' }
                : { background: '#FFFFFF', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
                Day {i + 1} {attendance.days[day] ? '✓' : '—'}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="field-label">Emails sent</span>
          {sentEmails.length === 0 ? <span className="muted text-sm">None yet</span> : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {sentEmails.map(([key, rec]) => (
                <li key={key}>
                  {SENT_EMAIL_LABELS[key] || key}
                  {rec.sentAt ? ` · ${new Date(rec.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Application answers */}
      <div className="card" style={{ background: '#F8FAFC', boxShadow: 'none', marginBottom: '1.5rem' }}>
        <button type="button" onClick={() => setShowAnswers(v => !v)} aria-expanded={showAnswers} className="row-between" style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: 0 }}>
          <span className="row fw-bold" style={{ gap: '0.5rem' }}><FileText size={18} color="var(--sky-blue)" /> Application answers</span>
          <span className="text-sm fw-bold" style={{ color: 'var(--sky-blue)' }}>{showAnswers ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {showAnswers && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {[
                ['Role / affiliation', reg.academicRole],
                ['Age', reg.isOver18],
                ['Done SKY before?', reg.completedSkyBefore],
                ['How they heard about SKY', reg.referralSource],
                ['Dietary restrictions / allergies', reg.foodAllergies]
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label}>
                  <span className="muted text-xs" style={{ display: 'block' }}>{label}</span>
                  <strong className="text-main">{value}</strong>
                </div>
              ))}
            </div>
            {((Array.isArray(reg.healthConditions) && reg.healthConditions.length > 0) || reg.otherHealthConditions) && (
              <div className="notice notice-warning" style={{ display: 'block', fontWeight: 500 }}>
                <strong>Health conditions reported:</strong> {(reg.healthConditions || []).join(', ')}
                {reg.otherHealthConditions ? ` (${reg.otherHealthConditions})` : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="row-between">
        <div className="row">
          {saveState.kind === 'saved' && <span className="row fw-bold text-sm" style={{ color: '#16A34A', gap: '0.35rem' }}><CheckCircle2 size={16} /> {saveState.text}</span>}
          {saveState.kind === 'error' && <span className="row fw-bold text-sm" style={{ color: '#DC2626', gap: '0.35rem' }}><AlertTriangle size={16} /> {saveState.text}</span>}
          {saveState.kind === 'idle' && <span className="muted text-sm">Changes save automatically</span>}
        </div>
        <div className="row">
          {isAdmin && (
            <button type="button" onClick={handleDelete} className="btn btn-sm" style={{ background: '#FEF2F2', border: '1px solid #F87171', color: '#DC2626' }} title="Delete registration (admin only)">
              <Trash2 size={14} /> Delete application
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-primary">Done (Esc)</button>
        </div>
      </div>
    </Modal>
  );
}
