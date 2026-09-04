import React, { useEffect } from 'react';
import { Award, Layers, Mail, Phone, DollarSign, Clock, X } from 'lucide-react';
import { parseFeeAndPayment } from '../services/emailService';

export default function ParticipantDetailsModal({ participant, onClose, groupName, isVolunteer = false }) {
  // Handle ESC key to close
  useEffect(() => {
    if (!participant) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [participant, onClose]);

  if (!participant) return null;

  const fullName = participant.name || `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.email || 'Anonymous Participant';
  const initial = (fullName[0] || 'U').toUpperCase();
  const photoUrl = participant.photoURL || participant.photoUrl || null;
  const isApproved = participant.orientationStatus === 'Approved' || participant.interviewStatus === 'Approved' || participant.status === 'Approved';

  const formatDateTime = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      return new Date(isoStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  const attendance = participant.attendance || {};

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(35, 39, 95, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(35, 39, 95, 0.1)',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(35, 39, 95, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition-fast)'
          }}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header with Avatar & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingRight: '2rem' }}>
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={fullName} 
              referrerPolicy="no-referrer"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: isVolunteer ? '2px solid var(--sky-sun)' : '2px solid var(--sky-blue)',
                boxShadow: 'var(--shadow-sm)',
                flexShrink: 0
              }}
            />
          ) : (
            <div 
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: isVolunteer 
                  ? 'var(--sky-sun-light)' 
                  : 'var(--sky-blue-light)',
                color: isVolunteer ? '#B45309' : 'var(--sky-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
                border: isVolunteer ? '2px solid rgba(250, 188, 29, 0.4)' : '2px solid rgba(31, 116, 241, 0.3)',
                flexShrink: 0
              }}
            >
              {initial}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                {fullName}
              </h3>
              {isVolunteer ? (
                <span className="badge badge-sun" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                  <Award size={12} style={{ display: 'inline', marginRight: '3px' }} /> Volunteer
                </span>
              ) : (
                <span className="badge badge-sky" style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                  Participant
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {participant.academicRole || (isVolunteer ? 'Retreat Volunteer Mentor' : 'Participant')}
            </p>
          </div>
        </div>

        {/* Assigned Group Highlight Card */}
        <div style={{
          background: 'var(--sky-blue-subtle)',
          border: '1px solid rgba(31, 116, 241, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1.1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={18} color="var(--sky-blue)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Assigned Group
              </div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                {groupName || participant.assignedGroup || (participant.groupId ? participant.groupId.toUpperCase() : 'Unassigned')}
              </div>
            </div>
          </div>
          <span className="badge" style={{
            background: isApproved ? '#DCFCE7' : '#FEF3C7',
            color: isApproved ? '#166534' : '#B45309',
            border: isApproved ? '1px solid #86EFAC' : '1px solid #FCD34D'
          }}>
            {participant.orientationStatus || participant.interviewStatus || participant.status || 'Approved'}
          </span>
        </div>

        {/* Contact & Registration Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          
          <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
              <Mail size={13} /> Email Address
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', wordBreak: 'break-all', fontWeight: 600 }}>
              {participant.email || 'N/A'}
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
              <Phone size={13} /> Phone Number
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
              {participant.phone || 'N/A'}
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
              <DollarSign size={13} /> Fee & Payment Status
            </div>
            {(() => {
              const feeInfo = parseFeeAndPayment(participant);
              return (
                <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
                  {feeInfo.amount === 0 ? 'Free ($0 Tuition)' : feeInfo.formattedFee} • <span style={{ color: feeInfo.isPaid ? '#16A34A' : '#C2410C' }}>{feeInfo.amount === 0 ? 'Fully Funded' : feeInfo.isPaid ? 'Paid' : 'Unpaid'}</span>
                </div>
              );
            })()}
          </div>

          <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
              <Clock size={13} /> Application Time
            </div>
            <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
              {formatDateTime(participant.appliedAt || participant.submittedAt || participant.registeredAt || participant.createdAt)}
            </div>
          </div>

        </div>

        {/* 3-Day Attendance Record */}
        <div style={{ background: '#F8FAFC', padding: '0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            3-Day Attendance Record
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {['day1', 'day2', 'day3'].map((dKey, idx) => {
              const attended = Boolean(attendance[dKey]);
              return (
                <div 
                  key={dKey}
                  style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    borderRadius: 'var(--radius-sm)',
                    background: attended ? '#DCFCE7' : '#FFFFFF',
                    border: attended ? '1px solid #86EFAC' : '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Day {idx + 1}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: attended ? '#166534' : 'var(--text-muted)' }}>
                    {attended ? '✓ Present' : '— Absent'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Participant Notes & Health details if present */}
        {(participant.foodAllergies || participant.healthConditions || participant.volunteerNotes || participant.orientationNotes || participant.interviewNotes) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
            {participant.foodAllergies && participant.foodAllergies !== 'None' && (
              <div style={{ background: 'var(--sky-flower-light)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(232, 74, 39, 0.25)', color: '#C2410C' }}>
                <strong>Dietary Restrictions:</strong> {participant.foodAllergies}
              </div>
            )}
            {participant.healthConditions && participant.healthConditions.length > 0 && participant.healthConditions[0] !== 'None' && (
              <div style={{ background: 'var(--sky-sun-light)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(250, 188, 29, 0.3)', color: '#B45309' }}>
                <strong>Health Notes:</strong> {Array.isArray(participant.healthConditions) ? participant.healthConditions.join(', ') : participant.healthConditions}
                {participant.otherHealthConditions ? ` (${participant.otherHealthConditions})` : ''}
              </div>
            )}
            {(participant.volunteerNotes || participant.orientationNotes || participant.interviewNotes) && (
              <div style={{ background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <strong>Volunteer Notes:</strong> {participant.volunteerNotes || participant.orientationNotes || participant.interviewNotes}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
