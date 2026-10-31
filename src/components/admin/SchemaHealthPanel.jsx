import React, { useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { SCHEMA_VERSION } from '../../models/applicant';
import { checkSchemaHealth } from '../../models/schemaHealth';
import { AlertTriangle, CheckCircle2, Stethoscope } from 'lucide-react';

// Read-only check that every registration matches schema v3 (production reached v3 on 2026-10-31;
// the one-time migrator now lives in scripts/legacy/ for tests only). Reads every registration once.

const MAX_LISTED = 25;

export default function SchemaHealthPanel() {
  const [report, setReport] = useState(null);
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [state, setState] = useState({ busy: false, error: '' });

  const runCheck = async () => {
    setState({ busy: true, error: '' });
    try {
      const [regSnap, notesSnap, retreatSnap, schemaSnap] = await Promise.all([
        getDocs(collection(db, 'registrations')),
        getDocs(collection(db, 'registration_private')),
        getDocs(collection(db, 'retreat_history')),
        getDoc(doc(db, 'system_settings', 'schema'))
      ]);
      setSchemaInfo(schemaSnap.exists() ? schemaSnap.data() : null);
      setReport(checkSchemaHealth(
        regSnap.docs.map(d => ({ id: d.id, data: d.data() })),
        notesSnap.docs.map(d => ({ id: d.id })),
        new Set(retreatSnap.docs.map(d => d.id))
      ));
      setState({ busy: false, error: '' });
    } catch (err) {
      setState({ busy: false, error: `Check failed: ${err.code || err.message}` });
    }
  };

  const healthy = report && report.issues.length === 0 && report.orphanNotes.length === 0;

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div className="row" style={{ marginBottom: '0.5rem' }}>
        <Stethoscope size={22} color="var(--sky-blue)" />
        <h3 className="text-main" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Data Health: Registration Schema v{SCHEMA_VERSION}</h3>
      </div>
      <p className="text-secondary text-sm" style={{ lineHeight: 1.55, maxWidth: '760px' }}>
        Checks every registration for unexpected or legacy fields, invalid statuses or groups, ids that don&apos;t
        match <code>{'{email}_{retreatId}'}</code>, deleted retreats, and notes left behind by deleted registrations.
        Read only: it never changes data.
      </p>

      <button type="button" className="btn" onClick={runCheck} disabled={state.busy} style={{ marginTop: '1rem' }}>
        {state.busy ? 'Checking…' : 'Run health check'}
      </button>

      {state.error && <p className="notice notice-error" style={{ marginTop: '1rem' }}><AlertTriangle size={16} /> {state.error}</p>}

      {report && (
        <div style={{ marginTop: '1.25rem' }} data-testid="schema-health-report">
          {healthy ? (
            <p className="notice notice-success"><CheckCircle2 size={16} /> All {report.total} registrations match schema v{SCHEMA_VERSION}.</p>
          ) : (
            <div className="notice notice-warning" style={{ display: 'block' }}>
              <strong>{report.issues.length} of {report.total} registrations need attention</strong>
              {report.orphanNotes.length > 0 && <> · {report.orphanNotes.length} notes without a registration</>}
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontWeight: 500 }}>
                {report.issues.slice(0, MAX_LISTED).map(({ id, problems }) => (
                  <li key={id}><code>{id}</code>: {problems.join('; ')}</li>
                ))}
                {report.orphanNotes.slice(0, MAX_LISTED).map(id => <li key={`note-${id}`}><code>{id}</code>: notes without a registration</li>)}
              </ul>
              {report.issues.length > MAX_LISTED && <p className="text-xs">…and {report.issues.length - MAX_LISTED} more.</p>}
            </div>
          )}
          {schemaInfo?.migratedAt && (
            <p className="muted text-xs" style={{ marginTop: '0.5rem' }}>
              Stored schema v{schemaInfo.registrationsVersion}, last migrated {new Date(schemaInfo.migratedAt).toLocaleString()} by {schemaInfo.migratedBy}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
