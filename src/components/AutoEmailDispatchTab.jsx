import React, { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from '../firebase/config';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';
import { useRoster } from '../context/RosterContext';
import { useApplicantFilters } from '../hooks/useApplicantFilters';
import ApplicantFilterBar from './ApplicantFilterBar';
import { getDisplayName, getGroupId, getGroupName } from '../models/applicant';
import { StatusBadge } from './ui/StatusBadge';
import {
  Mail,
  Send,
  Settings,
  Calendar,
  CreditCard,
  Info,
  Check,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink
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
import { useToast } from './ui/ToastProvider';
import { useConfirm } from './ui/ConfirmProvider';

// Admin tab: send templated emails (received / accepted / welcome / completion) to the active retreat
const DISPATCH_FACETS = ['search', 'statuses', 'claim', 'payment', 'iahv', 'email', 'role', 'sort'];

export default function AutoEmailDispatchTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const { activeRetreat, registrations, updateRegistration } = useRoster();

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

  const userEmailLower = (currentUser?.email || '').toLowerCase().trim();
  const { filters, setFilter, resetFilters, filtered: displayedApplicants, statusCounts, activeFilterCount } = useApplicantFilters(
    registrations,
    { userEmail: userEmailLower, retreat: activeRetreat }
  );

  const [selectedApplicantIds, setSelectedApplicantIds] = useState(new Set());
  const [batchTemplateKey, setBatchTemplateKey] = useState('application_accepted');
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // { current, total, recipient }

  // Modals State
  const [previewModalConfig, setPreviewModalConfig] = useState(null); // { templateKey, participant }
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inspectParticipant, setInspectParticipant] = useState(null);

  // PayPal Link saving indicators: { [participantId]: boolean }, and unsaved edits per row
  const [savedPaypalLinks, setSavedPaypalLinks] = useState({});
  const [paypalDrafts, setPaypalDrafts] = useState({});

  const isSuperAdmin = userEmailLower === ADMIN_EMAIL.toLowerCase();

  // Save updated email settings (Super Admin only)
  const handleSaveSettings = (newSettings) => {
    if (!isSuperAdmin) {
      toast.error('Unauthorized: Only the Super Admin can modify global email settings.');
      return;
    }
    setEmailSettings(newSettings);
    localStorage.setItem('sky_email_settings', JSON.stringify(newSettings));
    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'system_settings', 'email_config'), newSettings, { merge: true }).catch(console.warn);
    }
    toast.success('Email settings and template links saved to cloud!');
  };

  // Copy Email Roster Helper
  const handleCopyEmails = (listToCopy) => {
    const emails = listToCopy.map(r => r.email).filter(Boolean).join(', ');
    if (!emails) {
      toast.error("No email addresses found in current list.");
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(emails)
        .then(() => toast.success(`Copied ${listToCopy.length} emails to clipboard!`))
        .catch(() => toast.error("Clipboard permission denied."));
    } else {
      toast.info(`Emails ready: ${emails.substring(0, 30)}...`);
    }
  };

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

  // PayPal link: edited locally, saved on blur / Enter
  const handlePaypalLinkChange = (participantId, link) => {
    setPaypalDrafts(prev => ({ ...prev, [participantId]: link }));
  };

  const handleSavePaypalLink = async (participantId, link) => {
    const trimmed = (link || '').trim();
    const current = (registrations.find(r => r.id === participantId)?.paypalLink || '').trim();
    setPaypalDrafts(prev => {
      const next = { ...prev };
      delete next[participantId];
      return next;
    });
    if (trimmed === current) return;
    try {
      await updateRegistration(participantId, { paypalLink: trimmed });
      setSavedPaypalLinks(prev => ({ ...prev, [participantId]: true }));
      setTimeout(() => {
        setSavedPaypalLinks(prev => ({ ...prev, [participantId]: false }));
      }, 2000);
    } catch (err) {
      toast.error(`PayPal link not saved: ${err.code || err.message}`);
    }
  };

  // Toggle payment settlement for fee-paying roles
  const handleTogglePaymentStatus = async (participantId, isPaid) => {
    try {
      await updateRegistration(participantId, isPaid
        ? { paymentStatus: 'Paid', paidAt: new Date().toISOString() }
        : { paymentStatus: deleteField(), paidAt: deleteField() });
      toast.success(`Payment status updated to ${isPaid ? 'Paid' : 'Unpaid'}`);
    } catch (err) {
      toast.error(`Payment status not saved: ${err.code || err.message}`);
    }
  };

  // Send Single Email (emailService records the sent email on the registration)
  const handleSendSingle = async (templateKey, participant) => {
    const result = await sendSingleEmail(templateKey, participant, activeRetreat, emailSettings);
    const emailSubject = result?.subject || EMAIL_TEMPLATES[templateKey]?.subject || 'Notification';
    toast.success(`✓ Email "${emailSubject}" sent to ${getDisplayName(participant)}!`);
  };

  // Send Batch Emails
  const handleSendBatch = async () => {
    if (selectedApplicantIds.size === 0) return;
    const targets = displayedApplicants.filter(a => selectedApplicantIds.has(a.id));

    // Validate PayPal links for paying participants if template is acceptance
    if (batchTemplateKey === 'application_accepted') {
      const missingPaypal = targets.filter(p => checkRequiresPayment(p) && !(p.paypalLink || '').trim());
      if (missingPaypal.length > 0) {
        toast.error(`Cannot batch send: ${missingPaypal.length} paying participant(s) do not have a PayPal invoice link. Please add PayPal links or deselect them.`
        );
        return;
      }
    }

    const tplName = EMAIL_TEMPLATES[batchTemplateKey]?.name || batchTemplateKey;
    if (!(await confirm({
      title: `Send "${tplName}"?`,
      message: `${targets.length} email${targets.length === 1 ? '' : 's'} will be sent from skyatuiuc@gmail.com to:`,
      details: targets.map(t => `${getDisplayName(t)} (${t.email})`),
      confirmLabel: `Send ${targets.length}`
    }))) return;

    setIsBatchSending(true);
    setBatchProgress({ current: 0, total: targets.length, recipient: '' });

    const results = await sendBatchEmails(
      batchTemplateKey,
      targets,
      activeRetreat,
      emailSettings,
      (current, total, participant) => {
        setBatchProgress({ current, total, recipient: getDisplayName(participant) });
      }
    );

    setIsBatchSending(false);
    setBatchProgress(null);
    setSelectedApplicantIds(new Set());

    if (results.failures.length > 0) {
      toast.error(`Sent ${results.successes.length} emails. ${results.failures.length} failed.`);
    } else {
      toast.success(`🎉 Successfully dispatched ${results.successes.length} "${tplName}" emails!`);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 240px' }}>
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

          {/* IAHV Course Registration Link Badge */}
          {(() => {
            const activeIahvLink = emailSettings.registrationLink || emailSettings.defaultRegistrationLink || activeRetreat?.registrationLink;
            return (
              <div style={{
                background: activeIahvLink ? '#F0FDF4' : '#FFFBEB',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: activeIahvLink ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flex: '1 1 260px',
                minWidth: '220px'
              }}>
                <ExternalLink size={16} color={activeIahvLink ? '#16A34A' : '#D97706'} />
                <div style={{ fontSize: '0.78rem', minWidth: 0 }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>IAHV Course Reg Link:</span>
                  {activeIahvLink ? (
                    <a
                      href={activeIahvLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#16A34A',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '220px'
                      }}
                      title={activeIahvLink}
                    >
                      {activeIahvLink}
                    </a>
                  ) : (
                    <span style={{ color: '#D97706', fontWeight: 600, fontStyle: 'italic' }}>
                      Not configured (Click Email Settings)
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

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
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: '#FFFFFF', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        <ApplicantFilterBar
          facets={DISPATCH_FACETS}
          filters={filters}
          setFilter={setFilter}
          resetFilters={resetFilters}
          statusCounts={statusCounts}
          activeFilterCount={activeFilterCount}
          retreat={activeRetreat}
        />

        {/* Tier 2: Summary Count, Copy Emails & Batch Actions Bar */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          
          {/* Showing Count & Copy Emails */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Showing <span style={{ color: 'var(--sky-blue)' }}>{displayedApplicants.length}</span> of {registrations.length} applicant records
            </div>

            <button
              type="button"
              onClick={() => handleCopyEmails(displayedApplicants)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              title="Copy email addresses of all currently filtered applicants"
            >
              <Copy size={12} /> Copy {displayedApplicants.length} Emails
            </button>
          </div>

          {/* Batch Actions Selector & Trigger */}
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
              const initial = (applicant.firstName?.[0] || applicant.email?.[0] || 'U').toUpperCase();
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
                            {getDisplayName(applicant)}
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
                    <StatusBadge registration={applicant} />
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
                          value={paypalDrafts[applicant.id] ?? applicant.paypalLink ?? ''}
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
              {activeFilterCount > 0 ? 'Try clearing the filters above.' : 'Applicants for the selected retreat will appear here.'}
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
          groupName={getGroupName(getGroupId(inspectParticipant, activeRetreat), activeRetreat)}
          onClose={() => setInspectParticipant(null)}
        />
      )}

    </div>
  );
}
