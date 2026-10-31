import React from 'react';
import { Check, RefreshCw, Send } from 'lucide-react';
import { checkRequiresPayment } from '../../services/emailService';

// One email column cell in Email Dispatch: sent/unsent state plus the Preview & Send button.
// The acceptance column covers both acceptance templates (standard and PayPal).
export default function EmailActionCell({ participant, templateKey, onPreview }) {
  const isAcceptedCol = templateKey === 'application_accepted';
  const isPaying = checkRequiresPayment(participant);
  
  // Determine state key
  const stateKey = isAcceptedCol ? 'application_accepted' : templateKey;
  const sentRecord = participant.sentEmails?.[stateKey];
  const isSent = Boolean(sentRecord?.sent);
  const sentDate = sentRecord?.sentAt 
    ? new Date(sentRecord.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  // PayPal validation error on accepted column
  const isMissingPaypal = isAcceptedCol && isPaying && !(participant.paypalLink || '').trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start', padding: '0 4px', width: '100%' }}>
      {/* Status Indicator Pill */}
      {isSent ? (
        <span 
          className="badge badge-earth" 
          title={`Sent on ${new Date(sentRecord.sentAt).toLocaleString()} by ${sentRecord.sentBy || 'skyatuiuc@gmail.com'}`}
          style={{ 
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.12rem 0.4rem',
            borderRadius: '3px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Check size={10} /> Sent {sentDate}
        </span>
      ) : (
        <span 
          className="badge" 
          style={{ 
            background: '#F1F5F9', 
            color: 'var(--text-muted)', 
            border: '1px solid var(--border-color)',
            fontSize: '0.68rem',
            padding: '0.12rem 0.4rem',
            borderRadius: '3px',
            whiteSpace: 'nowrap'
          }}
        >
          Unsent
        </span>
      )}

      {/* Action Button: Preview & Send / Resend */}
      <button
        type="button"
        data-preview-template={templateKey}
        onClick={() => onPreview({ templateKey, participant })}
        disabled={isMissingPaypal}
        style={{
          padding: '0.2rem 0.48rem',
          borderRadius: '3px',
          border: isSent 
            ? '1px solid var(--border-color)' 
            : isMissingPaypal 
              ? '1px solid #F87171' 
              : '1px solid rgba(31, 116, 241, 0.4)',
          background: isSent 
            ? '#F8FAFC' 
            : isMissingPaypal 
              ? '#FEF2F2' 
              : 'var(--sky-blue-light)',
          color: isSent 
            ? 'var(--text-secondary)' 
            : isMissingPaypal 
              ? '#DC2626' 
              : 'var(--sky-blue)',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: isMissingPaypal ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          width: 'fit-content',
          transition: 'all 0.15s ease'
        }}
        title={isMissingPaypal ? 'Missing PayPal Link. Add a PayPal invoice link to enable sending.' : isSent ? 'Resend this email' : 'Preview & Send Email'}
      >
        {isSent ? <RefreshCw size={10} /> : <Send size={10} />}
        {isSent ? 'Resend' : 'Send'}
      </button>

      {/* Missing PayPal link warning caption */}
      {isMissingPaypal && (
        <span style={{ fontSize: '0.65rem', color: '#DC2626', fontWeight: 600, lineHeight: 1.1 }}>
          ⚠️ Need PayPal Link
        </span>
      )}
    </div>
  );
}
