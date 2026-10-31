import React from 'react';
import { Calendar } from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { getRetreatLabel } from '../models/retreat';

// "Active target retreat" bar shared by the Admin and Volunteer portals. The selection lives in the
// roster provider, so both portals always work on the same retreat.
export default function RetreatSelector() {
  const { retreatOptions, activeRetreatId, activeRetreat, setActiveRetreatId, registrations, registrationsReady } = useRoster();

  return (
    <div className="card retreat-bar">
      <div className="row">
        <Calendar size={18} color="var(--sky-blue)" />
        <span className="retreat-bar-label">Active Target Retreat:</span>
        <span className="text-main" style={{ fontSize: '0.95rem', fontWeight: 800 }}>
          {activeRetreat ? getRetreatLabel(activeRetreat) : 'No Retreat Selected'}
        </span>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {registrationsReady ? `${registrations.length} applications` : 'Loading…'}
        </span>
      </div>

      <div className="row">
        <label htmlFor="active-retreat-select" className="muted fw-bold" style={{ fontSize: '0.8rem' }}>Switch Retreat:</label>
        <select
          id="active-retreat-select"
          value={activeRetreatId}
          onChange={(e) => setActiveRetreatId(e.target.value)}
          className="select-compact"
        >
          {retreatOptions.map(ret => (
            <option key={ret.id} value={ret.id}>{getRetreatLabel(ret)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
