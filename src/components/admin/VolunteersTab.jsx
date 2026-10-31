import React, { useState } from 'react';
import { useAuth, ADMIN_EMAIL } from '../../context/AuthContext';
import { UserPlus, Trash2, Mail } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';
import { useConfirm } from '../ui/ConfirmProvider';

// Admin tab: grant / revoke volunteer portal access
export default function VolunteersTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const { authorizedEmails, addVolunteerEmail, removeVolunteerEmail } = useAuth();
  const [newEmail, setNewEmail] = useState('');

  const handleAddVolunteer = async (e) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error('Please enter an email address.');
      return;
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    if (authorizedEmails.includes(cleanEmail)) {
      toast.error(`Email ${cleanEmail} is already authorized.`);
      return;
    }

    const success = await addVolunteerEmail(cleanEmail);
    if (success) {
      toast.success(`Successfully authorized volunteer: ${cleanEmail}`);
      setNewEmail('');
    } else {
      toast.error('Failed to authorize email.');
    }
  };

  const handleRemoveVolunteer = async (emailToRemove) => {
    if (emailToRemove.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Cannot revoke Super Admin privileges.');
      return;
    }

    if (!(await confirm({ title: 'Revoke volunteer access?', message: `${emailToRemove} will no longer be able to open the volunteer portal.`, confirmLabel: 'Revoke', danger: true }))) return;
    const success = await removeVolunteerEmail(emailToRemove);
    if (success) toast.success(`Revoked access for ${emailToRemove}`);
    else toast.error(`Could not revoke access for ${emailToRemove}.`);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem' }}>
      
      <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <UserPlus size={22} color="var(--sky-blue)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>Authorize New Volunteer</h2>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Grant volunteer portal access to UIUC chapter members by entering their email below.
        </p>

        <form onSubmit={handleAddVolunteer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              VOLUNTEER EMAIL ADDRESS
            </label>
            <input 
              type="email"
              required
              placeholder="netid@illinois.edu or volunteer@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#FFFFFF',
                border: '1px solid rgba(35, 39, 95, 0.15)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
            <UserPlus size={16} /> Authorize Volunteer Email
          </button>
        </form>
      </div>

      <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
          CURRENT AUTHORIZED VOLUNTEERS ({authorizedEmails.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '340px', overflowY: 'auto' }}>
          {authorizedEmails.map((email, idx) => {
            const isSuper = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: isSuper ? 'var(--sky-sun-light)' : '#F8FAFC',
                borderRadius: 'var(--radius-sm)',
                border: isSuper ? '1px solid rgba(250, 188, 29, 0.4)' : '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Mail size={15} color={isSuper ? '#B45309' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.9rem', fontWeight: isSuper ? 700 : 500, color: isSuper ? '#B45309' : 'var(--text-main)' }}>
                    {email}
                  </span>
                  {isSuper && <span className="badge badge-sun" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>SUPER ADMIN</span>}
                </div>

                {!isSuper && (
                  <button 
                    onClick={() => handleRemoveVolunteer(email)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#DC2626',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Revoke Access"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
