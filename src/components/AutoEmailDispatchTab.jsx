import React, { useState, useEffect, useMemo } from 'react';
import { db, isFirebaseConfigured } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logDatabaseOperation } from '../services/telemetryService';
import { 
  Mail, 
  Send, 
  Settings, 
  Search, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Info, 
  Filter, 
  Check, 
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import { 
  DEFAULT_EMAIL_SETTINGS, 
  checkRequiresPayment, 
  parseFeeAndPayment,
  sendSingleEmail, 
  sendBatchEmails 
} from '../services/emailService';
import { EMAIL_TEMPLATES } from '../templates/emailTemplates';
import EmailPreviewModal from './EmailPreviewModal';
import EmailSettingsModal from './EmailSettingsModal';
import ParticipantDetailsModal from './ParticipantDetailsModal';

export default function AutoEmailDispatchTab({ 
  retreats = [], 
  registrations = [], 
  setRegistrations,
  currentUser = null,
  selectedRetreatId = ''
}) {
  const activeRetreat = retreats.find(r => r.id === selectedRetreatId) || (retreats.length > 0 ? retreats[0] : null);

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('sky_email_settings');
      return saved ? { ...DEFAULT_EMAIL_SETTINGS, ...JSON.parse(saved) } : DEFAULT_EMAIL_SETTINGS;
    } catch {
      return DEFAULT_EMAIL_SETTINGS;
    }
  });

  // Sync cloud email settings on mount
  useEffect(() => {
    let isMounted = true;
    if (isFirebaseConfigured && db) {
      getDoc(doc(db, 'system_settings', 'email_config'))
        .then((docSnap) => {
          if (isMounted && docSnap.exists()) {
            const data = docSnap.data();
            setEmailSettings((prev) => ({ ...prev, ...data }));
            try {
              localStorage.setItem('sky_email_settings', JSON.stringify(data));
            } catch (e) {
              console.warn("Local storage cache notice:", e);
            }
          }
        })
        .catch((err) => console.warn("Email settings cloud sync notice:", err));
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // UI State: Search, Filter, Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'APPROVED' | 'NEEDS_PAYPAL' | 'UNSENT_ACCEPTED' | 'UNSENT_WELCOME' | 'UNSENT_COMPLETION'
  const [selectedApplicantIds, setSelectedApplicantIds] = useState(new Set());
  const [batchTemplateKey, setBatchTemplateKey] = useState('application_accepted');
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // { current, total, recipient }

  // Modals State
  const [previewModalConfig, setPreviewModalConfig] = useState(null); // { templateKey, participant }
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inspectParticipant, setInspectParticipant] = useState(null);
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });

  // PayPal Link saving indicators: { [participantId]: boolean }
  const [savedPaypalLinks, setSavedPaypalLinks] = useState({});

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage({ type: '', text: '' });
    }, 3500);
  };

  const isSuperAdmin = Boolean(currentUser?.email && currentUser.email.toLowerCase().trim() === 'skyatuiuc@gmail.com');

  // Save updated email settings (Super Admin only)
  const handleSaveSettings = (newSettings) => {
    if (!isSuperAdmin) {
      showToast('error', 'Unauthorized: Only the Super Admin can modify global email settings.');
      return;
    }
    setEmailSettings(newSettings);
    localStorage.setItem('sky_email_settings', JSON.stringify(newSettings));
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'system_settings', 'email_config'), newSettings, { merge: true }).catch(console.warn);
    }
    showToast('success', 'Email settings and template links saved to cloud!');
  };

  // Filter retreat registrations
  const retreatRegistrations = useMemo(() => {
    return registrations.filter(r => {
      if (selectedRetreatId === 'ALL' || retreats.length <= 1) return true;
      const matchId = r.retreatId === activeRetreat?.id;
      const matchTitle = (r.retreatTitle && activeRetreat?.title && r.retreatTitle.toLowerCase().trim() === activeRetreat.title.toLowerCase().trim()) ||
        (!r.retreatId && r.retreatTitle === activeRetreat?.title);
      return matchId || matchTitle;
    });
  }, [registrations, activeRetreat, selectedRetreatId, retreats]);

  // Filtered applicants based on search & quick status filter
  const displayedApplicants = useMemo(() => {
    let list = [...retreatRegistrations];

    if (filterType === 'APPROVED') {
      list = list.filter(r => (r.interviewStatus || r.status || '').toLowerCase().includes('approved'));
    } else if (filterType === 'NEEDS_PAYPAL') {
      list = list.filter(r => checkRequiresPayment(r) && !(r.paypalLink || '').trim());
    } else if (filterType === 'UNSENT_ACCEPTED') {
      list = list.filter(r => !r.sentEmails?.application_accepted?.sent);
    } else if (filterType === 'UNSENT_WELCOME') {
      list = list.filter(r => !r.sentEmails?.welcome?.sent);
    } else if (filterType === 'UNSENT_COMPLETION') {
      list = list.filter(r => !r.sentEmails?.completion?.sent);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.firstName && r.firstName.toLowerCase().includes(q)) ||
        (r.lastName && r.lastName.toLowerCase().includes(q)) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.academicRole && r.academicRole.toLowerCase().includes(q))
      );
    }

    return list;
  }, [retreatRegistrations, filterType, searchQuery]);

  // Toggle single selection
  const handleToggleSelect = (id) => {
    const next = new Set(selectedApplicantIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedApplicantIds(next);
  };

  // Select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedApplicantIds.size === displayedApplicants.length) {
      setSelectedApplicantIds(new Set());
    } else {
      setSelectedApplicantIds(new Set(displayedApplicants.map(d => d.id)));
    }
  };

  // Update participant paypalLink inline & persist
  const handlePaypalLinkChange = (participantId, link) => {
    const updated = registrations.map(r => {
      if (r.id === participantId) {
        return { ...r, paypalLink: link };
      }
      return r;
    });
    setRegistrations(updated);
  };

  const handleSavePaypalLink = async (participantId, link) => {
    const trimmed = (link || '').trim();
    const updated = registrations.map(r => {
      if (r.id === participantId) {
        return { ...r, paypalLink: trimmed };
      }
      return r;
    });
    setRegistrations(updated);
    localStorage.setItem('sky_registrations', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'registrations', participantId), {
          paypalLink: trimmed,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        logDatabaseOperation(0, 1, 0);
      } catch (err) {
        console.warn("Firestore PayPal link update error:", err);
      }
    }

    setSavedPaypalLinks(prev => ({ ...prev, [participantId]: true }));
    setTimeout(() => {
      setSavedPaypalLinks(prev => ({ ...prev, [participantId]: false }));
    }, 2000);
  };

  // Toggle Payment Status for paid / free tiers
  const handleTogglePaymentStatus = async (participantId, isPaid) => {
    const updated = registrations.map(r => {
      if (r.id === participantId) {
        return {
          ...r,
          isPaid,
          paymentStatus: isPaid ? 'Paid' : 'Unpaid',
          paidAt: isPaid ? new Date().toISOString() : null
        };
      }
      return r;
    });
    setRegistrations(updated);
    localStorage.setItem('sky_registrations', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'registrations', participantId), {
          isPaid,
          paymentStatus: isPaid ? 'Paid' : 'Unpaid',
          paidAt: isPaid ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        logDatabaseOperation(0, 1, 0);
      } catch (err) {
        console.warn("Firestore payment status update error:", err);
      }
    }

    showToast('success', `Payment status updated to ${isPaid ? 'Paid' : 'Unpaid'}`);
  };

  // Send Single Email
  const handleSendSingle = async (templateKey, participant) => {
    const senderEmail = currentUser?.email || 'skyatuiuc@gmail.com';
    const result = await sendSingleEmail(templateKey, participant, activeRetreat, emailSettings, senderEmail);

    // Update sentEmails timestamp on participant in state & DB
    const stateKey = templateKey === 'application_accepted' ? 'application_accepted' : templateKey;
    const nowIso = new Date().toISOString();

    const updated = registrations.map(r => {
      if (r.id === participant.id) {
        const sentEmails = { ...(r.sentEmails || {}) };
        sentEmails[stateKey] = {
          sent: true,
          sentAt: nowIso,
          sentBy: senderEmail
        };
        return { ...r, sentEmails };
      }
      return r;
    });

    setRegistrations(updated);
    localStorage.setItem('sky_registrations', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'registrations', participant.id), {
          [`sentEmails.${stateKey}`]: {
            sent: true,
            sentAt: nowIso,
            sentBy: senderEmail
          }
        }, { merge: true });
        logDatabaseOperation(0, 1, 0);
      } catch (err) {
        console.warn("Firestore sentEmails update error:", err);
      }
    }

    const emailSubject = result?.subject || result?.payload?.subject || EMAIL_TEMPLATES[templateKey]?.subject || 'Notification';
    showToast('success', `✓ Email "${emailSubject}" sent to ${participant.firstName || participant.name || participant.email}!`);
  };

  // Send Batch Emails
  const handleSendBatch = async () => {
    if (selectedApplicantIds.size === 0) return;
    const targets = displayedApplicants.filter(a => selectedApplicantIds.has(a.id));

    // Validate PayPal links for paying participants if template is acceptance
    if (batchTemplateKey === 'application_accepted') {
      const missingPaypal = targets.filter(p => checkRequiresPayment(p) && !(p.paypalLink || '').trim());
      if (missingPaypal.length > 0) {
        showToast(
          'error', 
          `Cannot batch send: ${missingPaypal.length} paying participant(s) do not have a PayPal invoice link. Please add PayPal links or deselect them.`
        );
        return;
      }
    }

    const tplName = EMAIL_TEMPLATES[batchTemplateKey]?.name || batchTemplateKey;
    if (!window.confirm(`Are you sure you want to dispatch "${tplName}" to ${targets.length} selected applicants from skyatuiuc@gmail.com?`)) {
      return;
    }

    setIsBatchSending(true);
    setBatchProgress({ current: 0, total: targets.length, recipient: '' });

    const senderEmail = currentUser?.email || 'skyatuiuc@gmail.com';
    const stateKey = batchTemplateKey === 'application_accepted' ? 'application_accepted' : batchTemplateKey;
    const nowIso = new Date().toISOString();

    const results = await sendBatchEmails(
      batchTemplateKey, 
      targets, 
      activeRetreat, 
      emailSettings, 
      senderEmail,
      (current, total, participant) => {
        setBatchProgress({
          current,
          total,
          recipient: participant.name || participant.email
        });
      }
    );

    // Update state for successful recipients
    const successfulIds = new Set(results.successes.map(s => s.participant.id));
    const updated = registrations.map(r => {
      if (successfulIds.has(r.id)) {
        const sentEmails = { ...(r.sentEmails || {}) };
        sentEmails[stateKey] = {
          sent: true,
          sentAt: nowIso,
          sentBy: senderEmail
        };
        return { ...r, sentEmails };
      }
      return r;
    });

    setRegistrations(updated);
    localStorage.setItem('sky_registrations', JSON.stringify(updated));

    setIsBatchSending(false);
    setBatchProgress(null);
    setSelectedApplicantIds(new Set());

    if (results.failures.length > 0) {
      showToast('error', `Sent ${results.successes.length} emails. ${results.failures.length} failed.`);
    } else {
      showToast('success', `🎉 Successfully dispatched ${results.successes.length} "${tplName}" emails!`);
    }
  };

  // Helper to render sent status pill + send button for a specific column
  const renderEmailActionCell = (participant, templateKey, _columnTitle) => {
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
          onClick={() => {
            setPreviewModalConfig({
              templateKey,
              participant
            });
          }}
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
  };

  const isWebhookConfigured = Boolean(
    emailSettings.webhookUrl && 
    emailSettings.webhookUrl.startsWith('https://script.google.com/macros/s/') && 
    !emailSettings.webhookUrl.includes('EXAMPLE')
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Toast Notification */}
      {toastMessage.text && (
        <div 
          className="animate-fade-in"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: toastMessage.type === 'error' ? '#FEF2F2' : toastMessage.type === 'info' ? '#EFF6FF' : '#DCFCE7',
            border: toastMessage.type === 'error' ? '1px solid #F87171' : toastMessage.type === 'info' ? '1px solid #93C5FD' : '1px solid #86EFAC',
            color: toastMessage.type === 'error' ? '#DC2626' : toastMessage.type === 'info' ? '#1D4ED8' : '#166534',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Webhook Setup Warning Banner */}
      {!isWebhookConfigured && (
        <div 
          className="animate-fade-in"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--sky-sun-light)',
            border: '1px solid rgba(250, 188, 29, 0.4)',
            color: '#B45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={22} color="#B45309" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--text-main)' }}>Gmail Webhook Connector Required (One-Time Setup):</strong>
              <div style={{ fontSize: '0.82rem', marginTop: '2px', color: '#B45309' }}>
                To send emails from <strong>skyatuiuc@gmail.com</strong>, deploy the Google Apps Script Web App and paste your Web App URL.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowSettingsModal(true)}
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Settings size={14} /> Open Setup & Script
          </button>
        </div>
      )}

      {/* TOP HEADER CONTROLS: RETREAT SELECTOR, SETTINGS TRIGGER & SENDER BADGE */}
      <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          
          {/* Active Retreat Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 250px' }}>
            <Calendar size={22} color="var(--sky-blue)" />
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                Target Active Retreat
              </label>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {activeRetreat?.title || 'No Retreat Selected'}
              </div>
            </div>
          </div>

          {/* Central Sender Identity Badge & Settings Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              background: '#F8FAFC',
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Mail size={16} color="var(--sky-blue)" />
              <div style={{ fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Central Sender:</span>
                <strong style={{ color: 'var(--sky-blue)' }}>skyatuiuc@gmail.com</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowSettingsModal(true)}
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title="Configure retreat links, survey URL, and Apps Script Webhook"
            >
              <Settings size={15} /> Email Settings & Links
            </button>
          </div>

        </div>

      </div>

      {/* FILTER & BATCH ACTION TOOLBAR */}
      <div className="glass-card" style={{ padding: '1.25rem', background: '#FFFFFF', boxShadow: 'var(--shadow-sm)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 260px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search applicant by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                background: '#FFFFFF',
                border: '1px solid rgba(35, 39, 95, 0.15)',
                color: 'var(--text-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Applicants ({retreatRegistrations.length})</option>
              <option value="APPROVED">Approved Only</option>
              <option value="NEEDS_PAYPAL">Missing PayPal Link</option>
              <option value="UNSENT_ACCEPTED">Unsent Acceptance</option>
              <option value="UNSENT_WELCOME">Unsent Welcome</option>
              <option value="UNSENT_COMPLETION">Unsent Completion</option>
            </select>
          </div>

          {/* Batch Actions Bar (Enabled when items selected) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: selectedApplicantIds.size > 0 ? 'var(--sky-blue)' : 'var(--text-muted)', fontWeight: 700 }}>
              {selectedApplicantIds.size} Selected
            </span>

            <select
              value={batchTemplateKey}
              onChange={(e) => setBatchTemplateKey(e.target.value)}
              disabled={selectedApplicantIds.size === 0 || isBatchSending}
              style={{
                padding: '0.45rem 0.75rem',
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                opacity: selectedApplicantIds.size === 0 ? 0.6 : 1
              }}
            >
              <option value="application_received">Template: Application Received</option>
              <option value="application_accepted">Template: Acceptance (Auto Standard/PayPal)</option>
              <option value="reminder">Template: Registration Reminder</option>
              <option value="welcome">Template: Welcome & Details</option>
              <option value="completion">Template: Retreat Completion</option>
            </select>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSendBatch}
              disabled={selectedApplicantIds.size === 0 || isBatchSending}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                opacity: selectedApplicantIds.size === 0 ? 0.6 : 1
              }}
            >
              <Send size={13} />
              {isBatchSending 
                ? `Sending (${batchProgress?.current}/${batchProgress?.total})...` 
                : `Send to ${selectedApplicantIds.size} Selected`}
            </button>
          </div>

        </div>

      </div>

      {/* =========================================================================
          AUTO EMAIL DISPATCH TABLE (RESPONSIVE DOSSIER + EMAIL COLUMNS)
          ========================================================================= */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '0', 
          overflowX: 'auto', 
          WebkitOverflowScrolling: 'touch', 
          borderRadius: 'var(--radius-md)', 
          width: '100%',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        
        {displayedApplicants.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '1050px', width: '100%' }}>
            
            {/* Table Header Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '45px minmax(200px, 1.8fr) 100px 120px minmax(170px, 1.5fr) 115px 125px 115px 115px 115px',
              padding: '0.85rem 1.25rem',
              background: '#F8FAFC',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              alignItems: 'center'
            }}>
              <div style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedApplicantIds.size === displayedApplicants.length && displayedApplicants.length > 0}
                  onChange={handleToggleSelectAll}
                  style={{ cursor: 'pointer' }}
                  title="Select All"
                />
              </div>
              <div>Applicant Dossier</div>
              <div>App Status</div>
              <div>Fee</div>
              <div>PayPal Invoice Link</div>
              <div>App Received</div>
              <div>Acceptance (Auto)</div>
              <div>Reminder</div>
              <div>Welcome</div>
              <div>Completion</div>
            </div>

            {/* Applicant Rows */}
            {displayedApplicants.map(applicant => {
              const isSelected = selectedApplicantIds.has(applicant.id);
              const initial = (applicant.firstName?.[0] || applicant.name?.[0] || 'U').toUpperCase();
              const isApproved = (applicant.interviewStatus || applicant.status || '').toLowerCase().includes('approved');
              const feeInfo = parseFeeAndPayment(applicant);
              const isPaypalSaved = savedPaypalLinks[applicant.id];

              return (
                <div
                  key={applicant.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '45px minmax(200px, 1.8fr) 100px 120px minmax(170px, 1.5fr) 115px 125px 115px 115px 115px',
                    padding: '0.85rem 1.25rem',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(35, 39, 95, 0.06)',
                    background: isSelected ? 'var(--sky-blue-subtle)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {/* Select Checkbox */}
                  <div style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(applicant.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>

                  {/* Column 1: Avatar, Name, Email, Details Modal Trigger */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, paddingRight: '0.5rem' }}>
                    <div 
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--sky-blue-light)',
                        color: 'var(--sky-blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}
                    >
                      {initial}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setInspectParticipant(applicant)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--text-main)',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="Click to view full application dossier"
                        >
                          <span style={{ textDecoration: 'underline dotted rgba(35, 39, 95, 0.4)' }}>
                            {applicant.firstName ? `${applicant.firstName} ${applicant.lastName || ''}`.trim() : (applicant.name || applicant.email)}
                          </span>
                          <Info size={12} color="var(--text-muted)" />
                        </button>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {applicant.email} • {applicant.academicRole || 'Participant'}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Application Status */}
                  <div>
                    <span 
                      className="badge" 
                      style={{
                        background: isApproved ? '#DCFCE7' : '#FEF3C7',
                        color: isApproved ? '#166534' : '#B45309',
                        border: isApproved ? '1px solid #86EFAC' : '1px solid #FCD34D',
                        fontSize: '0.72rem',
                        fontWeight: 700
                      }}
                    >
                      {applicant.interviewStatus || applicant.status || 'Pending'}
                    </span>
                  </div>

                  {/* Column 3: Fee Amount & Super Admin Paid Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 700 }}>
                      {feeInfo.amount === 0 ? 'Free ($0)' : feeInfo.formattedFee}
                    </div>

                    {feeInfo.amount > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleTogglePaymentStatus(applicant.id, !feeInfo.isPaid)}
                        className="badge"
                        style={{
                          background: feeInfo.isPaid ? '#DCFCE7' : '#FFEDD5',
                          color: feeInfo.isPaid ? '#166534' : '#C2410C',
                          border: feeInfo.isPaid ? '1px solid #86EFAC' : '1px solid #FDBA74',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease'
                        }}
                        title={feeInfo.isPaid ? "Paid (Click to mark Unpaid)" : "Unpaid (Click to mark Paid)"}
                      >
                        {feeInfo.isPaid ? <Check size={10} /> : <CreditCard size={10} />}
                        {feeInfo.isPaid ? 'Paid' : 'Unpaid'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Fully Funded
                      </span>
                    )}
                  </div>

                  {/* Column 4: Dedicated PayPal Invoice Link Input */}
                  <div style={{ position: 'relative', paddingRight: '0.75rem' }}>
                    {feeInfo.requiresPayment ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="text"
                          value={applicant.paypalLink || ''}
                          onChange={(e) => handlePaypalLinkChange(applicant.id, e.target.value)}
                          onBlur={(e) => handleSavePaypalLink(applicant.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSavePaypalLink(applicant.id, e.currentTarget.value);
                            }
                          }}
                          placeholder="https://paypal.me/..."
                          style={{
                            width: '100%',
                            padding: '0.35rem 0.55rem',
                            background: '#FFFFFF',
                            border: !(applicant.paypalLink || '').trim() 
                              ? '1.5px solid #EF4444' 
                              : '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            outline: 'none'
                          }}
                          title="Enter custom PayPal invoice link for this participant"
                        />
                        {isPaypalSaved && (
                          <span style={{ color: '#16A34A', fontSize: '0.7rem', fontWeight: 700 }}>
                            <Check size={14} />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: feeInfo.isPaid && feeInfo.amount > 0 ? '#16A34A' : 'var(--text-muted)', fontStyle: 'italic' }}>
                        {feeInfo.amount === 0 ? 'N/A (Fully Funded)' : '✓ N/A (Paid)'}
                      </span>
                    )}
                  </div>

                  {/* Column 5: App Received Email Action */}
                  <div>
                    {renderEmailActionCell(applicant, 'application_received', 'App Received')}
                  </div>

                  {/* Column 6: Acceptance Email Action (Intelligently detects Standard vs PayPal) */}
                  <div>
                    {renderEmailActionCell(applicant, 'application_accepted', 'Acceptance')}
                  </div>

                  {/* Column 7: Reminder Email Action */}
                  <div>
                    {renderEmailActionCell(applicant, 'reminder', 'Reminder')}
                  </div>

                  {/* Column 8: Welcome Email Action */}
                  <div>
                    {renderEmailActionCell(applicant, 'welcome', 'Welcome')}
                  </div>

                  {/* Column 9: Completion Email Action */}
                  <div>
                    {renderEmailActionCell(applicant, 'completion', 'Completion')}
                  </div>

                </div>
              );
            })}

          </div>
        ) : (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Mail size={36} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              No applicants found matching this filter
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              {searchQuery ? 'Try clearing your search query filter above.' : 'Applicants for the selected retreat will appear here.'}
            </div>
          </div>
        )}

      </div>

      {/* Email Preview & Confirmation Modal */}
      {previewModalConfig && (
        <EmailPreviewModal
          templateKey={previewModalConfig.templateKey}
          participant={previewModalConfig.participant}
          retreat={activeRetreat}
          emailSettings={emailSettings}
          onSend={handleSendSingle}
          onClose={() => setPreviewModalConfig(null)}
        />
      )}

      {/* Email Settings Modal */}
      {showSettingsModal && (
        <EmailSettingsModal
          emailSettings={emailSettings}
          isSuperAdmin={isSuperAdmin}
          onSave={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Participant Dossier Details Modal */}
      {inspectParticipant && (
        <ParticipantDetailsModal
          participant={inspectParticipant}
          groupName={inspectParticipant.assignedGroup}
          isVolunteer={false}
          onClose={() => setInspectParticipant(null)}
        />
      )}

    </div>
  );
}
