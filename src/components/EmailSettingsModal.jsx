import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Settings
} from 'lucide-react';
import { DEFAULT_EMAIL_SETTINGS } from '../services/emailService';

export default function EmailSettingsModal({ 
  emailSettings = {}, 
  isSuperAdmin = false,
  onSave, 
  onClose 
}) {
  const [formData, setFormData] = useState({
    ...DEFAULT_EMAIL_SETTINGS,
    ...emailSettings
  });

  const [activeTab, setActiveTab] = useState('links'); // 'links' | 'webhook'

  const handleSave = (e) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    onSave(formData);
    onClose();
  };

  return (
    <div 
      className="modal-overlay animate-fade-in" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(35, 39, 95, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem'
      }}
    >
      <div 
        className="glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          background: '#FFFFFF'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #EDF4FF 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--sky-sun-light)',
              border: '1px solid rgba(250, 188, 29, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B45309'
            }}>
              <Settings size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>
                Email Template & Dispatch Settings
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Configure global links, contact details, and Apps Script Webhook
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(35, 39, 95, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: '#F8FAFC' }}>
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: activeTab === 'links' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'links' ? '3px solid var(--sky-blue)' : '3px solid transparent',
              color: activeTab === 'links' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Retreat Template Links
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: activeTab === 'webhook' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'webhook' ? '3px solid var(--sky-blue)' : '3px solid transparent',
              color: activeTab === 'webhook' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Gmail Webhook Connector
          </button>
        </div>

        {/* Read-Only Notice for Non-Admins */}
        {!isSuperAdmin && (
          <div style={{
            background: '#FEF3C7',
            borderBottom: '1px solid #FCD34D',
            padding: '0.75rem 1.75rem',
            color: '#92400E',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🔒 Read-Only: Global email template links and Google Apps Script settings can only be modified by the Super Admin (skyatuiuc@gmail.com).
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#FFFFFF' }}>
          
          {activeTab === 'links' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  WhatsApp Community Chat Link
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.whatsAppLink}
                  onChange={(e) => setFormData({ ...formData, whatsAppLink: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Post-Retreat Feedback Survey Link
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.surveyLink}
                  onChange={(e) => setFormData({ ...formData, surveyLink: e.target.value })}
                  placeholder="https://forms.gle/..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Daily Morning Zoom Practice Link
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.dailyPracticeLink}
                  onChange={(e) => setFormData({ ...formData, dailyPracticeLink: e.target.value })}
                  placeholder="https://illinois.zoom.us/j/..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    On-Site Contact Name
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid rgba(35, 39, 95, 0.15)',
                      color: 'var(--text-main)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    On-Site Contact Phone
                  </label>
                  <input
                    type="text"
                    disabled={!isSuperAdmin}
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                      border: '1px solid rgba(35, 39, 95, 0.15)',
                      color: 'var(--text-main)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'webhook' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Google Apps Script Webhook URL (For skyatuiuc@gmail.com)
                </label>
                <input
                  type="url"
                  disabled={!isSuperAdmin}
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                    border: '1px solid rgba(35, 39, 95, 0.15)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem'
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                  Deploy the Apps Script snippet in Google Apps Script as a Web App to enable direct dispatching from <strong>skyatuiuc@gmail.com</strong>. Authentication is securely handled in real time via signed Firebase ID Tokens.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Central Club Sender Address
                </label>
                <input
                  type="email"
                  value={formData.senderEmail}
                  disabled={true}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: '#F8FAFC',
                    border: '1px solid var(--border-color)',
                    color: 'var(--sky-blue)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.88rem',
                    fontWeight: 700
                  }}
                />
              </div>
            </>
          )}

          {/* Footer Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              {isSuperAdmin ? 'Cancel' : 'Close'}
            </button>
            {isSuperAdmin && (
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Save size={15} /> Save Settings
              </button>
            )}
          </div>

        </form>

      </div>
    </div>
  );
}
