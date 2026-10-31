import React from 'react';
import { Calendar } from 'lucide-react';
import { useRoster } from '../context/RosterContext';
import { getRetreatLabel } from '../models/retreat';

// "Active target retreat" bar shared by the Admin and Volunteer portals. The selection lives in the
// roster provider, so both portals always work on the same retreat.
export default function RetreatSelector() {
  const { retreatOptions, activeRetreatId, activeRetreat, setActiveRetreatId, registrations, registrationsReady } = useRoster();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      background: '#FFFFFF',
      border: '1px solid var(--border-color)',
      padding: '0.85rem 1.25rem',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1.5rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <Calendar size={18} color="var(--sky-blue)" />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Active Target Retreat:
        </span>
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {activeRetreat ? getRetreatLabel(activeRetreat) : 'No Retreat Selected'}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {registrationsReady ? `${registrations.length} applications` : 'Loading…'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label htmlFor="active-retreat-select" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Switch Retreat:</label>
        <select
          id="active-retreat-select"
          value={activeRetreatId}
          onChange={(e) => setActiveRetreatId(e.target.value)}
          style={{
            padding: '0.45rem 0.85rem',
            background: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {retreatOptions.map(ret => (
            <option key={ret.id} value={ret.id}>{getRetreatLabel(ret)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
