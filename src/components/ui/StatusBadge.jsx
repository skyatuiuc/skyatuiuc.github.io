import React from 'react';
import { STATUS_OPTIONS, STATUS_STYLES, getStatus, getStatusLabel } from '../../models/applicant';

// Application status pill, coloured from the shared STATUS_STYLES.
export function StatusBadge({ status, registration, style }) {
  const value = status || getStatus(registration);
  const s = STATUS_STYLES[value] || STATUS_STYLES[STATUS_OPTIONS[0]];
  return (
    <span className="status-badge" style={{ background: s.bg, color: s.color, borderColor: s.border, ...style }}>
      {getStatusLabel(value)}
    </span>
  );
}

// Multi-select status filter chips with optional counts. `selected` is an array of status values.
export function StatusChips({ statuses = STATUS_OPTIONS, selected, counts, onToggle, leading }) {
  return (
    <div className="chip-row" role="group" aria-label="Filter by application status">
      {leading}
      {statuses.map((status) => {
        const isOn = selected.includes(status);
        const s = STATUS_STYLES[status];
        return (
          <button
            key={status}
            type="button"
            className="chip"
            aria-pressed={isOn}
            onClick={() => onToggle(status)}
            style={isOn ? { background: s.bg, color: s.color, borderColor: s.border } : undefined}
          >
            {getStatusLabel(status)}{counts ? ` (${counts[status] ?? 0})` : ''}
          </button>
        );
      })}
    </div>
  );
}
