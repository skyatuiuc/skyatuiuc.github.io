import React from 'react';
import { Info } from 'lucide-react';
import { STATUS, getStatusLabel } from '../../models/applicant';

// Member chip colours: Approved green, Withdrawn red, Volunteer status yellow, everyone else blue
const getMemberTheme = (member) => {
  if (member.isVolunteer) {
    return {
      type: 'volunteer',
      bg: 'var(--sky-sun-light)',
      border: '1.5px solid rgba(250, 188, 29, 0.6)',
      avatarBg: 'var(--sky-sun)',
      avatarColor: '#161942',
      textColor: '#B45309',
      hoverShadow: '0 4px 12px rgba(250, 188, 29, 0.3)',
      statusLabel: getStatusLabel(STATUS.VOLUNTEER)
    };
  }
  if (member.status === STATUS.WITHDRAWN) {
    return {
      type: 'withdrawn',
      bg: '#FEE2E2',
      border: '1.5px solid rgba(239, 68, 68, 0.5)',
      avatarBg: '#DC2626',
      avatarColor: '#FFFFFF',
      textColor: '#991B1B',
      hoverShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
      statusLabel: 'Withdrawn'
    };
  }
  if (member.status === STATUS.APPROVED) {
    return {
      type: 'approved',
      bg: '#DCFCE7',
      border: '1.5px solid rgba(34, 197, 94, 0.5)',
      avatarBg: '#16A34A',
      avatarColor: '#FFFFFF',
      textColor: '#166534',
      hoverShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
      statusLabel: 'Approved'
    };
  }
  return {
    type: 'pending',
    bg: '#DBEAFE',
    border: '1.5px solid rgba(59, 130, 246, 0.5)',
    avatarBg: '#1F74F1',
    avatarColor: '#FFFFFF',
    textColor: '#1E40AF',
    hoverShadow: '0 4px 12px rgba(31, 116, 241, 0.3)',
    statusLabel: member.status
  };
};

// One draggable member in Group Assignments: select box, name, status tag, "Move…" picker
// (touch/keyboard alternative to dragging) and the button that opens the applicant panel.
export default function MemberChip({
  member, onDragStart, onDragEnd, selectedMemberIds, onToggleSelected, groupTargetOptions, onMove, onInspect
}) {
  const theme = getMemberTheme(member);
  const initial = (member.name[0] || 'U').toUpperCase();

  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart(e, member)}
      onDragEnd={onDragEnd}
      className="animate-fade-in"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.35rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        background: theme.bg,
        border: theme.border,
        boxShadow: 'var(--shadow-sm)',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        maxWidth: '100%'
      }}
      data-member-id={member.id}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow = theme.hoverShadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Avatar / Profile Picture */}
      {member.photoURL ? (
        <img 
          src={member.photoURL} 
          alt={member.name}
          referrerPolicy="no-referrer"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: `1.5px solid ${theme.avatarBg}`,
            flexShrink: 0
          }}
        />
      ) : (
        <div 
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: theme.avatarBg,
            color: theme.avatarColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 800,
            flexShrink: 0
          }}
        >
          {initial}
        </div>
      )}

      <input
        type="checkbox"
        className="chip-select"
        aria-label={`Select ${member.name}`}
        checked={selectedMemberIds.has(member.id)}
        onChange={() => onToggleSelected(member.id)}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Member Name */}
      <span 
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: theme.textColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '140px'
        }}
        title={`${member.name} (${member.email}) • Status: ${theme.statusLabel} • Role: ${member.academicRole || (member.isVolunteer ? 'Volunteer' : 'Participant')}`}
      >
        {member.name}
      </span>

      {/* Concise Status Tag */}
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '0.1rem 0.35rem',
          borderRadius: '4px',
          background: 'rgba(255, 255, 255, 0.7)',
          color: theme.textColor,
          border: `1px solid ${theme.textColor}33`,
          lineHeight: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          flexShrink: 0
        }}
      >
        {theme.statusLabel}
      </span>

      {/* Move without dragging (touch & keyboard) */}
      <select
        className="chip-move"
        aria-label={`Move ${member.name} to a group`}
        value=""
        onChange={(e) => { if (e.target.value) onMove(member, e.target.value); }}
        onClick={(e) => e.stopPropagation()}
        style={{ color: theme.textColor }}
      >
        <option value="">Move…</option>
        {groupTargetOptions.filter(([gId]) => gId !== member.groupId).map(([gId, label]) => (
          <option key={gId} value={gId}>{label}</option>
        ))}
      </select>

      {/* Details Inspection Info Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onInspect(member);
        }}
        title="Click to view full application details"
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.textColor,
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '50%',
          transition: 'opacity 0.15s ease',
          opacity: 0.8
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
      >
        <Info size={14} />
      </button>
    </div>
  );
}
