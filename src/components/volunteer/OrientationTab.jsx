import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRoster } from '../../context/RosterContext';
import { useApplicantFilters } from '../../hooks/useApplicantFilters';
import ApplicantFilterBar from '../ApplicantFilterBar';
import OrientationDossierModal from './OrientationDossierModal';
import { useToast } from '../ui/ToastProvider';
import { useConfirm } from '../ui/ConfirmProvider';
import { getDisplayName, getPayment, getAppliedAtMs, PAYMENT } from '../../models/applicant';
import { StatusBadge } from '../ui/StatusBadge';
import { downloadBlob, registrationsToCsv } from '../../utils/exportUtils';
import { todayChicago } from '../../utils/dateUtils';
import { getRetreatLabel, getUpcomingRetreats } from '../../models/retreat';
import { User, UserPlus, ChevronRight, Trash2, Copy, Download, ArrowRightCircle } from 'lucide-react';

// Volunteer tab: orientation roster for the active retreat (claim applicants, open dossiers).

const ROSTER_FACETS = ['search', 'statuses', 'claim', 'payment', 'iahv', 'role', 'people', 'sort'];

const thStyle = { padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 };
const tdStyle = { padding: '0.75rem 1rem' };

export default function OrientationTab() {
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { registrations, activeRetreat, retreats, updateRegistration, deleteRegistration, moveRegistrations } = useRoster();
  const userEmailLower = (currentUser?.email || '').toLowerCase();

  const { filters, setFilter, resetFilters, filtered, statusCounts, activeFilterCount } = useApplicantFilters(
    registrations,
    { userEmail: userEmailLower, retreat: activeRetreat }
  );

  const [selectedId, setSelectedId] = useState(null);
  const selectedReg = selectedId ? registrations.find(r => r.id === selectedId) : null;

  // General Interest List -> retreat moves (super admin; defaults to the next retreat by start date)
  const canMove = isAdmin && Boolean(activeRetreat?.isGeneral);
  const upcomingRetreats = useMemo(() => getUpcomingRetreats(retreats), [retreats]);
  const [moveTargetId, setMoveTargetId] = useState('');
  const moveTarget = upcomingRetreats.find(r => r.id === moveTargetId) || upcomingRetreats[0] || null;
  const [moving, setMoving] = useState(false);

  const handleMove = async (regs) => {
    if (!moveTarget || regs.length === 0 || moving) return;
    const label = getRetreatLabel(moveTarget);
    const who = regs.length === 1 ? getDisplayName(regs[0]) : `${regs.length} applicants`;
    if (!(await confirm({
      title: `Move ${who} to ${label}?`,
      message: 'Answers, status, claim and notes move with them; they leave the General Interest List.',
      details: regs.length > 1 ? regs.map(getDisplayName) : [],
      confirmLabel: 'Move'
    }))) return;
    setMoving(true);
    try {
      const { moved, skipped } = await moveRegistrations(regs, moveTarget.id, currentUser?.email);
      const skippedText = skipped.length
        ? ` Skipped ${skipped.length} already registered there: ${skipped.map(getDisplayName).join(', ')}.`
        : '';
      (skipped.length ? toast.error : toast.success)(`Moved ${moved.length} to ${label}.${skippedText}`);
    } catch (err) {
      toast.error(`Move stopped: ${err.code || err.message}. Anyone already moved is safe; re-run for the rest.`);
    } finally {
      setMoving(false);
    }
  };

  const writeClaim = async (reg, claim) => {
    try {
      await updateRegistration(reg.id, claim);
    } catch (err) {
      toast.error(`Could not update claim: ${err.code || err.message}`);
    }
  };

  const handleClaim = (reg) => {
    if (!userEmailLower) return;
    if (reg.claimedBy && reg.claimedBy.toLowerCase() !== userEmailLower && !isAdmin) {
      toast.error(`Already claimed by ${reg.claimedBy}.`);
      return;
    }
    writeClaim(reg, {
      claimedBy: currentUser.email,
      claimedByName: currentUser.displayName || currentUser.email.split('@')[0]
    });
  };

  const handleUnclaim = (reg) => {
    if (reg.claimedBy && reg.claimedBy.toLowerCase() !== userEmailLower && !isAdmin) {
      toast.error(`Only ${reg.claimedBy} or the Super Admin can unclaim this applicant.`);
      return;
    }
    writeClaim(reg, { claimedBy: null, claimedByName: null });
  };

  const handleDelete = async (reg) => {
    if (!isAdmin) return;
    if (!(await confirm({ title: 'Delete registration?', message: `${getDisplayName(reg)}'s registration and volunteer notes will be permanently deleted.`, confirmLabel: 'Delete', danger: true }))) return;
    try {
      await deleteRegistration(reg.id);
    } catch (err) {
      toast.error(`Delete failed: ${err.code || err.message}`);
    }
  };

  const handleCopyEmails = () => {
    const emails = filtered.map(r => r.email).filter(Boolean).join(', ');
    if (!emails) return toast.error('No email addresses in the current list.');
    navigator.clipboard?.writeText(emails)
      .then(() => toast.success(`Copied ${filtered.length} emails to clipboard.`))
      .catch(() => toast.error('Clipboard permission denied.'));
  };

  const handleExportCsv = () => {
    const csv = registrationsToCsv(filtered, activeRetreat);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `skyatuiuc_${activeRetreat?.id || 'roster'}_filtered_${todayChicago()}.csv`);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <ApplicantFilterBar
        facets={ROSTER_FACETS}
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        statusCounts={statusCounts}
        activeFilterCount={activeFilterCount}
        retreat={activeRetreat}
        resultCount={filtered.length}
        totalCount={registrations.length}
      >
        <button type="button" onClick={handleCopyEmails} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', gap: '0.35rem' }}>
          <Copy size={12} /> Copy {filtered.length} emails
        </button>
        <button type="button" onClick={handleExportCsv} disabled={filtered.length === 0} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', gap: '0.35rem' }}>
          <Download size={12} /> Export CSV
        </button>
      </ApplicantFilterBar>

      {canMove && (
        <div className="glass-card" style={{ padding: '1rem 1.25rem', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <ArrowRightCircle size={18} color="var(--sky-blue)" />
          {moveTarget ? (
            <>
              <label htmlFor="interest-move-target" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Move interest list to</label>
              <select
                id="interest-move-target"
                value={moveTarget.id}
                onChange={(e) => setMoveTargetId(e.target.value)}
                style={{ padding: '0.4rem 0.7rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600 }}
              >
                {upcomingRetreats.map(r => <option key={r.id} value={r.id}>{getRetreatLabel(r)}</option>)}
              </select>
              <button type="button" onClick={() => handleMove(filtered)} disabled={moving || filtered.length === 0} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                {moving ? 'Moving…' : `Move ${filtered.length} shown`}
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or use Move on a single row.</span>
            </>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              No upcoming retreat yet. Create one in Admin › Retreat Management to move interest-list applicants into it.
            </span>
          )}
        </div>
      )}


      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No applicant records found matching the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={thStyle}>APPLICANT</th>
                  <th style={thStyle}>ORIENTATION STATUS</th>
                  <th style={thStyle}>POINT OF CONTACT</th>
                  <th style={thStyle}>PAYMENT</th>
                  <th style={thStyle}>IAHV REG</th>
                  <th style={thStyle}>LAST CONTACT</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg) => {
                  const payment = getPayment(reg).status;
                  const isClaimedByMe = Boolean(reg.claimedBy) && reg.claimedBy.toLowerCase() === userEmailLower;
                  const appliedMs = getAppliedAtMs(reg);

                  return (
                    <tr
                      key={reg.id}
                      onClick={() => setSelectedId(reg.id)}
                      className="roster-row-hover"
                      style={{
                        borderBottom: '1px solid rgba(35, 39, 95, 0.06)',
                        cursor: 'pointer',
                        background: isClaimedByMe ? 'var(--sky-blue-subtle)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>{getDisplayName(reg)}</span>
                          {appliedMs > 0 && (
                            <span title={`Applied: ${new Date(appliedMs).toLocaleString()}`} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: '#F1F5F9', padding: '0.12rem 0.45rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                              {new Date(appliedMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.15rem' }}>
                          <span>{reg.email}</span>
                          {reg.phone && <span>• {reg.phone}</span>}
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <StatusBadge registration={reg} />
                      </td>

                      <td style={tdStyle}>
                        {reg.claimedBy ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="badge badge-sky" style={{ fontSize: '0.72rem', gap: '0.3rem' }}>
                              <User size={12} /> {isClaimedByMe ? 'You' : reg.claimedByName || reg.claimedBy.split('@')[0]}
                            </span>
                            {(isClaimedByMe || isAdmin) && (
                              <button onClick={(e) => { e.stopPropagation(); handleUnclaim(reg); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }} title="Unclaim application">
                                Unclaim
                              </button>
                            )}
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleClaim(reg); }} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', gap: '0.3rem' }}>
                            <UserPlus size={12} /> Claim
                          </button>
                        )}
                      </td>

                      <td style={tdStyle}>
                        {payment === PAYMENT.PAID && <span style={{ color: '#16A34A', fontWeight: 600, fontSize: '0.8rem' }}>✓ Paid</span>}
                        {payment === PAYMENT.EXEMPT && <span style={{ color: 'var(--sky-blue)', fontWeight: 600, fontSize: '0.8rem' }}>✓ $0 Exempt</span>}
                        {payment === PAYMENT.UNPAID && <span style={{ color: '#B45309', fontWeight: 600, fontSize: '0.8rem' }}>⚠️ Unpaid</span>}
                      </td>

                      <td style={tdStyle}>
                        {reg.iahvRegistered
                          ? <span style={{ color: 'var(--sky-blue)', fontWeight: 600, fontSize: '0.8rem' }}>✓ IAHV Reg</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No</span>}
                      </td>

                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{reg.lastContactedDate || 'Never'}</td>

                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedId(reg.id); }} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', gap: '0.3rem' }}>
                            Orientation Dossier <ChevronRight size={14} />
                          </button>
                          {canMove && moveTarget && (
                            <button onClick={(e) => { e.stopPropagation(); handleMove([reg]); }} disabled={moving} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', gap: '0.3rem' }} title={`Move to ${getRetreatLabel(moveTarget)}`}>
                              <ArrowRightCircle size={14} /> Move
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(reg); }} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '0.25rem' }} title="Delete record (Super Admin Only)">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReg && (
        <OrientationDossierModal key={selectedReg.id} reg={selectedReg} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
