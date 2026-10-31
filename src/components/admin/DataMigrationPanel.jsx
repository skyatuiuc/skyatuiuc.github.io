import React, { useState } from 'react';
import { collection, doc, getDoc, getDocs, writeBatch, deleteField, FieldPath } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { migrateRegistration } from '../../models/migrateRegistration';
import { SCHEMA_VERSION } from '../../models/applicant';
import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';

// One-time registrations v1 -> v2 migration (see docs/HARDENING_PLAN_2026.md, Phase 4).
// Dry run first; Apply re-reads the collection so it always works on fresh data.

const MAX_OPS_PER_BATCH = 400;

const planMigration = (snapshot) => {
  const plan = [];
  const removedFieldCounts = {};
  let notesToMove = 0;
  snapshot.docs.forEach((d) => {
    const data = d.data();
    const result = migrateRegistration(data);
    if (!result.changed && !result.privateNotes) return;
    result.remove.forEach((f) => { removedFieldCounts[f] = (removedFieldCounts[f] || 0) + 1; });
    if (result.privateNotes) notesToMove += 1;
    plan.push({ id: d.id, retreatId: data.retreatId, result });
  });
  return { total: snapshot.size, plan, removedFieldCounts, notesToMove };
};

export default function DataMigrationPanel() {
  const { currentUser } = useAuth();
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState({ busy: false, error: '', done: '' });

  const runDryRun = async () => {
    setStatus({ busy: true, error: '', done: '' });
    try {
      const [snap, schemaSnap] = await Promise.all([
        getDocs(collection(db, 'registrations')),
        getDoc(doc(db, 'system_settings', 'schema'))
      ]);
      setSchemaInfo(schemaSnap.exists() ? schemaSnap.data() : null);
      setPreview(planMigration(snap));
      setStatus({ busy: false, error: '', done: '' });
    } catch (err) {
      setStatus({ busy: false, error: `Dry run failed: ${err.message}`, done: '' });
    }
  };

  const applyMigration = async () => {
    if (!window.confirm('Apply the registration schema migration now? Download a Full System Snapshot first.')) return;
    setStatus({ busy: true, error: '', done: '' });
    try {
      // Recompute from fresh data, never from the (possibly stale) preview
      const { plan } = planMigration(await getDocs(collection(db, 'registrations')));
      const now = new Date().toISOString();
      let batch = writeBatch(db);
      let ops = 0;
      const flush = async () => {
        if (ops === 0) return;
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      };

      for (const { id, retreatId, result } of plan) {
        if (result.changed) {
          // FieldPath per field: a literal "sentEmails.welcome" field must not be read as a nested path
          const args = [];
          Object.entries(result.set).forEach(([field, value]) => args.push(new FieldPath(field), value));
          result.remove.forEach((field) => args.push(new FieldPath(field), deleteField()));
          batch.update(doc(db, 'registrations', id), ...args);
          ops += 1;
        }
        if (result.privateNotes) {
          batch.set(doc(db, 'registration_private', id), {
            retreatId,
            notes: result.privateNotes,
            updatedAt: now,
            updatedBy: 'schema-migration'
          }, { merge: true });
          ops += 1;
        }
        if (ops >= MAX_OPS_PER_BATCH) await flush();
      }
      batch.set(doc(db, 'system_settings', 'schema'), {
        registrationsVersion: SCHEMA_VERSION,
        migratedAt: now,
        migratedBy: currentUser?.email || ''
      }, { merge: true });
      ops += 1;
      await flush();

      setStatus({ busy: false, error: '', done: `Migrated ${plan.length} registrations.` });
      await runDryRun();
    } catch (err) {
      setStatus({ busy: false, error: `Migration stopped: ${err.message}. Already-committed batches are safe; re-run to finish.`, done: '' });
    }
  };

  const pending = preview?.plan.length ?? null;

  return (
    <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <Wrench size={22} color="#B45309" />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>Data Maintenance: Registration Schema v{SCHEMA_VERSION}</h3>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, maxWidth: '760px' }}>
        Collapses duplicate status / notes / payment / group fields into one canonical field each, moves volunteer
        notes to a volunteer-only document, and deletes stray <code>sentEmails.*</code> fields. Safe to re-run:
        already-migrated registrations are skipped.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={runDryRun} disabled={status.busy}>
          {status.busy ? 'Working…' : 'Dry run (read only)'}
        </button>
        <button type="button" className="btn btn-primary" onClick={applyMigration} disabled={status.busy || !pending}>
          Apply migration{pending ? ` (${pending} documents)` : ''}
        </button>
      </div>

      {status.error && (
        <p style={{ marginTop: '1rem', color: '#DC2626', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <AlertTriangle size={16} /> {status.error}
        </p>
      )}
      {status.done && (
        <p style={{ marginTop: '1rem', color: '#166534', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <CheckCircle2 size={16} /> {status.done}
        </p>
      )}

      {preview && (
        <div style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
          <p>
            <strong>{preview.total}</strong> registrations scanned · <strong>{preview.plan.length}</strong> need migration ·
            {' '}<strong>{preview.notesToMove}</strong> notes to move.
            {schemaInfo?.migratedAt && <> Last migrated {new Date(schemaInfo.migratedAt).toLocaleString()} by {schemaInfo.migratedBy}.</>}
          </p>
          {Object.keys(preview.removedFieldCounts).length > 0 && (
            <table style={{ marginTop: '0.75rem', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr><th style={{ textAlign: 'left', padding: '0.25rem 1rem 0.25rem 0' }}>Field removed</th><th style={{ textAlign: 'right' }}>Documents</th></tr>
              </thead>
              <tbody>
                {Object.entries(preview.removedFieldCounts).sort((a, b) => b[1] - a[1]).map(([field, n]) => (
                  <tr key={field}><td style={{ padding: '0.15rem 1rem 0.15rem 0' }}><code>{field}</code></td><td style={{ textAlign: 'right' }}>{n}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
