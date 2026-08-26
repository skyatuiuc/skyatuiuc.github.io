import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  AlertCircle, 
  CreditCard, 
  Eye, 
  FileText 
} from 'lucide-react';
import { compileEmailPayload } from '../services/emailService';

export default function EmailPreviewModal({ 
  templateKey, 
  participant, 
  retreat, 
  emailSettings, 
  onSend, 
  onClose 
}) {
  const [viewTab, setViewTab] = useState('html'); // 'html' | 'text'
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  let payload = null;
  let compileError = null;

  try {
    payload = compileEmailPayload(templateKey, participant, retreat, emailSettings);
  } catch (err) {
    compileError = err.message;
  }

  const handleConfirmSend = async () => {
    if (compileError) return;
    setIsSending(true);
    setErrorMsg('');
    try {
      await onSend(templateKey, participant);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch email.');
      setIsSending(false);
    }
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
          maxWidth: '740px',
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
        {/* Modal Header */}
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
              background: 'var(--sky-blue-light)',
              border: '1px solid rgba(31, 116, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--sky-blue)'
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>
                Email Preview & Dispatch Confirmation
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Template: <strong style={{ color: 'var(--sky-blue)' }}>{payload?.templateName || templateKey}</strong>
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
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Compile Error Warning (e.g. Missing PayPal Link) */}
        {compileError && (
          <div style={{
            margin: '1.25rem 1.75rem 0 1.75rem',
            padding: '1rem 1.25rem',
            background: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: 'var(--radius-md)',
            color: '#DC2626',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle size={22} style={{ flexShrink: 0 }} />
            <div>
              <strong>Cannot Send Email:</strong>
              <div style={{ marginTop: '2px', fontSize: '0.85rem' }}>{compileError}</div>
            </div>
          </div>
        )}

        {/* Runtime Send Error */}
        {errorMsg && (
          <div style={{
            margin: '1.25rem 1.75rem 0 1.75rem',
            padding: '0.85rem 1.25rem',
            background: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: 'var(--radius-md)',
            color: '#DC2626',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email Metadata Details Bar */}
        {payload && (
          <div style={{
            padding: '1rem 1.75rem',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.82rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Recipient</span>
              <strong style={{ color: 'var(--text-main)' }}>{payload.recipientName}</strong> &lt;{payload.recipientEmail}&gt;
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Sender Address</span>
              <strong style={{ color: 'var(--sky-blue)' }}>skyatuiuc@gmail.com</strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Subject</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{payload.subject}</span>
            </div>

            {payload.isPaying && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>PayPal Payment Link</span>
                <a 
                  href={payload.paypalLink} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: '#C2410C', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}
                >
                  <CreditCard size={12} /> {payload.paypalLink}
                </a>
              </div>
            )}
          </div>
        )}

        {/* View Switcher: Live HTML vs Plain Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', borderBottom: '1px solid var(--border-color)', background: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => setViewTab('html')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: viewTab === 'html' ? 'var(--sky-blue-light)' : 'transparent',
              color: viewTab === 'html' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Eye size={14} /> Rendered HTML Preview
          </button>

          <button
            type="button"
            onClick={() => setViewTab('text')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: viewTab === 'text' ? 'var(--sky-blue-light)' : 'transparent',
              color: viewTab === 'text' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FileText size={14} /> Plain Text Fallback
          </button>
        </div>

        {/* Preview Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', minHeight: '320px', maxHeight: '520px', background: '#FAFAFA' }}>
          {payload ? (
            viewTab === 'html' ? (
              <iframe 
                title="Email HTML Preview"
                srcDoc={payload.htmlBody}
                sandbox="allow-same-origin"
                style={{
                  width: '100%',
                  minHeight: '460px',
                  height: '460px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  display: 'block'
                }}
              />
            ) : (
              <pre style={{
                background: '#FFFFFF',
                padding: '1.25rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                margin: 0
              }}>
                {payload.plainText}
              </pre>
            )
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Cannot generate preview due to missing parameters.
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid var(--border-color)',
          background: '#FFFFFF'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSending}
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmSend}
            disabled={Boolean(compileError) || isSending}
            style={{
              padding: '0.55rem 1.5rem',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: compileError || isSending ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={16} />
            {isSending ? 'Sending from skyatuiuc@gmail.com...' : `Send Email to ${participant?.firstName || 'Participant'}`}
          </button>
        </div>

      </div>
    </div>
  );
}
