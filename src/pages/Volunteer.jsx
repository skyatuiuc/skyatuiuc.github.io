import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';
import { db, isFirebaseConfigured } from '../firebase/config';
import { INITIAL_RETREATS } from '../data/retreatData';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { AlertTriangle, Calendar, UserCheck, CheckSquare, QrCode, Search, User, UserPlus, ChevronRight, Trash2, Download, Copy, Mail, Phone, FileText, CheckCircle2, X } from 'lucide-react';
import { logDatabaseOperation } from '../services/telemetryService';
import { loadFlyerTemplateImage } from '../services/flyerChunkService';
import { renderAndExportFlyer, calculateScaledDimensions, colorToQrHex } from '../utils/graphicExportUtils';
import QRCode from 'qrcode';
import AttendanceTab from '../components/AttendanceTab';
import { parseFeeAndPayment } from '../services/emailService';
import { getDefaultActiveRetreatId } from '../utils/retreatUtils';

export default function Volunteer() {
  const { currentUser, isAdmin, authorizedEmails } = useAuth();
  const isSuperAdmin = Boolean(isAdmin || (currentUser?.email && currentUser.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()));

  const [activeTab, setActiveTab] = useState('interviews'); // 'interviews' | 'attendance' | 'flyers'

  // Campaign Flyer Generator State
  const [campaignTagInput, setCampaignTagInput] = useState('demo');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [exportFormat, setExportFormat] = useState('png'); // 'png' | 'jpg'
  const [exportScale, setExportScale] = useState(1.0);
  const [jpegQuality, setJpegQuality] = useState(0.92);
  const [isExporting, setIsExporting] = useState(false);
  
  const [flyerTemplates, setFlyerTemplates] = useState(() => {
    const saved = localStorage.getItem('sky_flyer_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [tplFullImage, setTplFullImage] = useState(null);
  
  // Retreats state to populate retreat dropdown
  const [retreats, setRetreats] = useState(() => {
    const saved = localStorage.getItem('sky_retreat_history');
    return saved ? JSON.parse(saved) : INITIAL_RETREATS;
  });

  const [selectedRetreatId, setSelectedRetreatId] = useState(() => {
    const saved = localStorage.getItem('sky_active_retreat_id');
    return getDefaultActiveRetreatId(retreats, saved);
  });

  useEffect(() => {
    if (retreats.length > 0) {
      setSelectedRetreatId(prev => {
        if (prev && retreats.some(r => r.id === prev)) return prev;
        const saved = localStorage.getItem('sky_active_retreat_id');
        const def = getDefaultActiveRetreatId(retreats, saved);
        if (def) localStorage.setItem('sky_active_retreat_id', def);
        return def;
      });
    }
  }, [retreats]);

  const activeRetreat = retreats.find(r => r.id === selectedRetreatId) || (retreats.length > 0 ? retreats[0] : null);

  const [registrations, setRegistrations] = useState(() => {
    const saved = localStorage.getItem('sky_registrations');
    return saved ? JSON.parse(saved) : [];
  });

  // FILTERS & SEARCH STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Uncontacted' | 'Pending' | 'Approved' | 'Did Not Reply' | 'Rejected' | 'Withdrawn'
  const [claimFilter, setClaimFilter] = useState('All');   // 'All' | 'My Claims' | 'Unclaimed' | 'Claimed by Others'
  const [paymentFilter, setPaymentFilter] = useState('All'); // 'All' | 'Paid / Exempt' | 'Unpaid'
  const [iahvFilter, setIahvFilter] = useState('All');     // 'All' | 'Registered' | 'Not Registered'
  const [sortBy, setSortBy] = useState('newest');           // 'newest' | 'oldest' | 'name' | 'lastContacted'

  // INTERVIEW MODAL WORKBENCH STATE
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeNotes, setActiveNotes] = useState('');
  const [activeStatus, setActiveStatus] = useState('Uncontacted');
  const [activeIahv, setActiveIahv] = useState(false);
  const [activeLastContacted, setActiveLastContacted] = useState('');
  const [activeClaimedBy, setActiveClaimedBy] = useState('');
  const [showAppDetails, setShowAppDetails] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [copyNotice, setCopyNotice] = useState('');



  // Sync Super Admin Flyer Templates live from Firestore
  useEffect(() => {
    let unsubscribe = null;
    if (isFirebaseConfigured && db) {
      try {
        const tplRef = collection(db, 'flyer_templates');
        unsubscribe = onSnapshot(tplRef, (snapshot) => {
          const fetched = [];
          snapshot.forEach((d) => fetched.push({ id: d.id, ...d.data() }));
          setFlyerTemplates(fetched);
          localStorage.setItem('sky_flyer_templates', JSON.stringify(fetched));
        }, (err) => console.warn('Flyer templates sync notice:', err));
      } catch (e) {
        console.warn('Firestore flyer templates error:', e);
      }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);


  const parsePixelX = (val, fallback = 600) => {
    const num = parseFloat(val);
    return isNaN(num) ? fallback : num;
  };

  const parsePixelY = (val, fallback = 800) => {
    const num = parseFloat(val);
    return isNaN(num) ? fallback : num;
  };

  const parsePixelSize = (val, fallback = 4) => {
    const num = parseFloat(val);
    return isNaN(num) ? fallback : num;
  };

  // Live QR Code Generation & Background Image Preload Effect
  useEffect(() => {
    const activeTpl = flyerTemplates.find(t => t.id === selectedTemplateId);
    const cleanTag = (campaignTagInput || 'demo').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const shortUrl = `https://skyuiuc.org/${cleanTag}`;
    const qrFg = activeTpl?.qrBox?.fgColor || '#161942';
    const qrBgRaw = activeTpl?.qrBox?.bgColor;

    QRCode.toDataURL(shortUrl, { width: 360, margin: 0, color: { dark: colorToQrHex(qrFg, '#161942FF'), light: colorToQrHex(qrBgRaw, '#00000000') } })
      .then(url => setQrDataUrl(url))
      .catch(err => console.warn('QR Code error:', err));

    if (selectedTemplateId) {
      if (activeTpl?.thumbnailBase64) {
        setTplFullImage(activeTpl.thumbnailBase64);
      }
      if (isFirebaseConfigured && db) {
        loadFlyerTemplateImage(db, selectedTemplateId).then(fullImg => {
          if (fullImg) setTplFullImage(fullImg);
        });
      }
    } else {
      setTplFullImage(null);
    }
  }, [campaignTagInput, selectedTemplateId, flyerTemplates]);

  const downloadFlyerImage = async () => {
    const activeTemplate = flyerTemplates.find(t => t.id === selectedTemplateId);
    let highResBg = tplFullImage;
    if (activeTemplate && !highResBg && isFirebaseConfigured && db) {
      highResBg = await loadFlyerTemplateImage(db, selectedTemplateId);
    }
    const bgSource = highResBg || activeTemplate?.thumbnailBase64 || activeTemplate?.bgImageUrl;

    setIsExporting(true);
    try {
      await renderAndExportFlyer({
        activeTemplate,
        bgSource,
        campaignTag: campaignTagInput || 'demo',
        activeRetreat,
        scale: Number(exportScale) || 1.0,
        format: exportFormat,
        jpegQuality: Number(jpegQuality) || 0.92
      });
    } catch (err) {
      console.error("Flyer export failed:", err);
      alert("Failed to generate printable flyer. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Sync retreats from Firestore
  useEffect(() => {
    let unsubscribe = null;
    if (isFirebaseConfigured && db) {
      try {
        const retreatsRef = collection(db, 'retreat_history');
        unsubscribe = onSnapshot(retreatsRef, (snapshot) => {
          const fetched = [];
          snapshot.forEach((d) => fetched.push({ id: d.id, ...d.data() }));
          setRetreats(fetched);
          localStorage.setItem('sky_retreat_history', JSON.stringify(fetched));
        }, (err) => console.warn("Retreats sync notice:", err));
      } catch (e) {
        console.warn("Firestore retreats error:", e);
      }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Sync registrations live from Firestore
  useEffect(() => {
    let unsubscribe = null;
    if (isFirebaseConfigured && db) {
      try {
        const regRef = collection(db, 'registrations');
        unsubscribe = onSnapshot(regRef, (snapshot) => {
          const fetched = [];
          snapshot.forEach((d) => {
            fetched.push({ id: d.id, ...d.data() });
          });
          setRegistrations(fetched);
          localStorage.setItem('sky_registrations', JSON.stringify(fetched));
          setSyncError('');
          logDatabaseOperation(fetched.length, 0, 0);
        }, (err) => {
          console.warn("Registrations sync notice:", err);
          if (err.code === 'permission-denied') {
            setSyncError("Firestore permission restriction detected. Please verify Cloud Firestore Security Rules in Firebase Console.");
          }
        });
      } catch (e) {
        console.warn("Firestore registrations error:", e);
      }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Sync modal state when selectedApp changes
  useEffect(() => {
    if (selectedApp) {
      const currentDoc = registrations.find(r => r.id === selectedApp.id) || selectedApp;
      
      const currentStatus = currentDoc.interviewStatus || 
        (currentDoc.status === 'Approved' ? 'Approved' : currentDoc.status === 'Rejected' ? 'Rejected' : 'Uncontacted');

      setActiveStatus(currentStatus);
      setActiveNotes(currentDoc.interviewNotes || currentDoc.notes || '');
      setActiveIahv(Boolean(currentDoc.iahvRegistered));
      setActiveLastContacted(currentDoc.lastContactedDate || '');
      setActiveClaimedBy(currentDoc.claimedBy || '');
    }
  }, [selectedApp, registrations]);

  const updateRegistration = useCallback(async (id, updatedFields) => {
    const updated = registrations.map(reg => {
      if (reg.id === id) {
        return { ...reg, ...updatedFields };
      }
      return reg;
    });

    setRegistrations(updated);
    localStorage.setItem('sky_registrations', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'registrations', id), updatedFields, { merge: true });
        logDatabaseOperation(0, 1, 0);
      } catch (e) {
        console.warn('Firestore update registration error:', e);
      }
    }
  }, [registrations]);

  const deleteRegistration = async (id) => {
    if (!isSuperAdmin) {
      alert("Unauthorized: Only the Super Admin can delete retreat applications.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this registration record? This action cannot be undone.")) {
      const updated = registrations.filter(r => r.id !== id);
      setRegistrations(updated);
      localStorage.setItem('sky_registrations', JSON.stringify(updated));

      if (isFirebaseConfigured && db) {
        try {
          await deleteDoc(doc(db, 'registrations', id));
          logDatabaseOperation(0, 0, 1);
        } catch (err) {
          console.warn("Error deleting registration from Firestore:", err);
        }
      }
      if (selectedApp?.id === id) {
        setSelectedApp(null);
      }
    }
  };

  // Claiming Logic
  const handleClaim = (reg) => {
    const userEmail = currentUser?.email?.toLowerCase();
    if (!userEmail) return;

    if (reg.claimedBy && reg.claimedBy.toLowerCase() !== userEmail && !isSuperAdmin) {
      alert(`This application is already claimed by ${reg.claimedBy}. Only they or a Super Admin can unclaim it.`);
      return;
    }

    const updatedFields = {
      claimedBy: currentUser.email,
      claimedByName: currentUser.displayName || currentUser.email.split('@')[0]
    };

    updateRegistration(reg.id, updatedFields);
  };

  const handleUnclaim = (reg) => {
    const userEmail = currentUser?.email?.toLowerCase();
    if (!userEmail) return;

    if (reg.claimedBy && reg.claimedBy.toLowerCase() !== userEmail && !isSuperAdmin) {
      alert(`Only ${reg.claimedBy} or a Super Admin can unclaim this applicant.`);
      return;
    }

    const updatedFields = {
      claimedBy: null,
      claimedByName: null
    };

    updateRegistration(reg.id, updatedFields);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedApp(null);
      }
    };
    if (selectedApp) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedApp]);

  // Real-time Auto-Saving Handlers
  const handleStatusChange = (val) => {
    setActiveStatus(val);
    if (selectedApp) {
      const statusField = (val === 'Approved' || val === 'Rejected') ? val : 'Pending';
      updateRegistration(selectedApp.id, { interviewStatus: val, status: statusField });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleClaimChange = (val) => {
    setActiveClaimedBy(val);
    if (selectedApp) {
      updateRegistration(selectedApp.id, {
        claimedBy: val || null,
        claimedByName: val ? val.split('@')[0] : null
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleIahvToggle = () => {
    const nextVal = !activeIahv;
    setActiveIahv(nextVal);
    if (selectedApp) {
      updateRegistration(selectedApp.id, { iahvRegistered: nextVal });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleContactDateChange = (val) => {
    setActiveLastContacted(val);
    if (selectedApp) {
      updateRegistration(selectedApp.id, { lastContactedDate: val });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleLogContactToday = () => {
    const today = new Date().toISOString().split('T')[0];
    handleContactDateChange(today);
  };

  // Debounced auto-save for notes
  useEffect(() => {
    if (!selectedApp) return;
    const currentDoc = registrations.find(r => r.id === selectedApp.id) || selectedApp;
    const currentNotes = currentDoc.interviewNotes || currentDoc.notes || '';
    if (activeNotes !== currentNotes) {
      const timer = setTimeout(() => {
        updateRegistration(selectedApp.id, { interviewNotes: activeNotes });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeNotes, selectedApp, registrations, updateRegistration]);

  // Copy Email Roster Helper
  const handleCopyEmails = (listToCopy) => {
    const emails = listToCopy.map(r => r.email).filter(Boolean).join(', ');
    if (!emails) {
      alert("No email addresses found in current list.");
      return;
    }
    navigator.clipboard.writeText(emails);
    setCopyNotice(`Copied ${listToCopy.length} emails to clipboard!`);
    setTimeout(() => setCopyNotice(''), 3000);
  };

  // FILTERING AND SORTING ENGINE
  const userEmailLower = currentUser?.email?.toLowerCase() || '';

  const filteredRegistrations = registrations.filter(reg => {
    if (selectedRetreatId) {
      const matchRetreat = reg.retreatId === selectedRetreatId || reg.selectedRetreat === selectedRetreatId || (activeRetreat && (reg.retreatTitle === activeRetreat.title || reg.selectedRetreat === activeRetreat.title));
      if (!matchRetreat) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (reg.fullName || `${reg.firstName || ''} ${reg.lastName || ''}`).toLowerCase();
      const email = (reg.email || '').toLowerCase();
      const phone = (reg.phone || '').toLowerCase();
      const netId = (reg.netId || '').toLowerCase();

      if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !netId.includes(q)) {
        return false;
      }
    }

    const currentStatus = reg.interviewStatus || 
      (reg.status === 'Approved' ? 'Approved' : reg.status === 'Rejected' ? 'Rejected' : 'Uncontacted');
    
    if (statusFilter !== 'All' && currentStatus !== statusFilter) {
      return false;
    }

    const isClaimedByMe = reg.claimedBy && reg.claimedBy.toLowerCase() === userEmailLower;
    const isUnclaimed = !reg.claimedBy;
    const isClaimedByOther = reg.claimedBy && !isClaimedByMe;

    if (claimFilter === 'My Claims' && !isClaimedByMe) return false;
    if (claimFilter === 'Unclaimed' && !isUnclaimed) return false;
    if (claimFilter === 'Claimed by Others' && !isClaimedByOther) return false;

    const isFeeExempt = Number(reg.fee) === 0 || reg.fee === '0' || reg.paymentExempt;
    const currentPayment = reg.paymentStatus || (isFeeExempt ? 'Exempt' : 'Unpaid');

    if (paymentFilter === 'Paid / Exempt' && currentPayment !== 'Paid' && currentPayment !== 'Exempt') return false;
    if (paymentFilter === 'Unpaid' && currentPayment !== 'Unpaid') return false;

    const isIahv = Boolean(reg.iahvRegistered);
    if (iahvFilter === 'Registered' && !isIahv) return false;
    if (iahvFilter === 'Not Registered' && isIahv) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return (b.submittedAt || b.id).localeCompare(a.submittedAt || a.id);
    if (sortBy === 'oldest') return (a.submittedAt || a.id).localeCompare(b.submittedAt || b.id);
    if (sortBy === 'name') {
      const nameA = (a.fullName || `${a.firstName || ''} ${a.lastName || ''}`).toLowerCase();
      const nameB = (b.fullName || `${b.firstName || ''} ${b.lastName || ''}`).toLowerCase();
      return nameA.localeCompare(nameB);
    }
    if (sortBy === 'lastContacted') {
      const dateA = a.lastContactedDate || '0000-00-00';
      const dateB = b.lastContactedDate || '0000-00-00';
      return dateB.localeCompare(dateA);
    }
    return 0;
  });

  return (
    <div style={{ padding: '3rem 0 6rem 0' }}>
      <div className="container">
        
        {/* Volunteer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Participant Interview & Roster Portal</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Logged in as: <strong style={{ color: 'var(--sky-blue)' }}>{currentUser?.email}</strong>
              {isSuperAdmin && <span className="badge badge-sun" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>SUPER ADMIN</span>}
            </p>
          </div>
        </div>

        {/* Sync or Warning Banner */}
        {syncError && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#DC2626',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertTriangle size={20} />
            <span style={{ fontWeight: 600 }}>{syncError}</span>
          </div>
        )}

        {copyNotice && (
          <div style={{
            background: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#166534',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontWeight: 600
          }}>
            {copyNotice}
          </div>
        )}

        {/* TARGET ACTIVE RETREAT SELECTOR BAR */}
        {retreats.length > 0 && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calendar size={18} color="var(--sky-blue)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Target Retreat:
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {activeRetreat?.title || 'No Retreat Selected'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Switch Retreat:</label>
              <select
                value={selectedRetreatId}
                onChange={(e) => {
                  setSelectedRetreatId(e.target.value);
                  localStorage.setItem('sky_active_retreat_id', e.target.value);
                }}
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
                {retreats.map(ret => (
                  <option key={ret.id} value={ret.id}>
                    {ret.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* TABBED NAVIGATION BAR */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}>
          <button 
            onClick={() => setActiveTab('interviews')}
            style={{
              padding: '0.85rem 1.35rem',
              background: activeTab === 'interviews' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'interviews' ? '3px solid var(--sky-blue)' : '3px solid transparent',
              color: activeTab === 'interviews' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <UserCheck size={18} color={activeTab === 'interviews' ? 'var(--sky-blue)' : 'var(--text-muted)'} />
            Interview Workbench ({registrations.length})
          </button>

          <button 
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '0.85rem 1.35rem',
              background: activeTab === 'attendance' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'attendance' ? '3px solid #10B981' : '3px solid transparent',
              color: activeTab === 'attendance' ? '#10B981' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <CheckSquare size={18} color={activeTab === 'attendance' ? '#10B981' : 'var(--text-muted)'} />
            Retreat Attendance
          </button>

          <button 
            onClick={() => setActiveTab('flyers')}
            style={{
              padding: '0.85rem 1.35rem',
              background: activeTab === 'flyers' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'flyers' ? '3px solid var(--sky-sun)' : '3px solid transparent',
              color: activeTab === 'flyers' ? '#B45309' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <QrCode size={18} color={activeTab === 'flyers' ? '#B45309' : 'var(--text-muted)'} />
            Flyer & QR Studio
          </button>
        </div>

        {/* TAB 1: INTERVIEW WORKBENCH & DENSE APPLICATION ROSTER */}
        {activeTab === 'interviews' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* ADVANCED FILTERING & SEARCH TOOLBAR */}
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', background: '#FFFFFF', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                
                {/* Search Bar */}
                <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text"
                    placeholder="Search applicant name, email, phone, NetID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem 0.65rem 2.4rem',
                      background: '#FFFFFF',
                      border: '1px solid rgba(35, 39, 95, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '0.875rem'
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

                {/* Status Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    INTERVIEW STATUS
                  </label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.825rem' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Uncontacted">Uncontacted</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Did Not Reply">Did Not Reply</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>

                {/* Claim / Point of Contact Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    POINT OF CONTACT
                  </label>
                  <select 
                    value={claimFilter}
                    onChange={(e) => setClaimFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.825rem' }}
                  >
                    <option value="All">All Claim States</option>
                    <option value="My Claims">Claimed by Me</option>
                    <option value="Unclaimed">Unclaimed</option>
                    <option value="Claimed by Others">Claimed by Others</option>
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    PAYMENT STATUS
                  </label>
                  <select 
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.825rem' }}
                  >
                    <option value="All">All Payment States</option>
                    <option value="Paid / Exempt">Paid / Exempt ($0)</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                {/* IAHV Registration Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    IAHV REGISTRATION
                  </label>
                  <select 
                    value={iahvFilter}
                    onChange={(e) => setIahvFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.825rem' }}
                  >
                    <option value="All">All IAHV States</option>
                    <option value="Registered">Registered</option>
                    <option value="Not Registered">Not Registered</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    SORT BY
                  </label>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.825rem' }}
                  >
                    <option value="newest">Submission Date (Newest)</option>
                    <option value="oldest">Submission Date (Oldest)</option>
                    <option value="name">Applicant Name (A-Z)</option>
                    <option value="lastContacted">Last Contacted Date</option>
                  </select>
                </div>

              </div>
            </div>

            {/* CONCISE & DENSE PARTICIPANT ROSTER TABLE */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: '#F8FAFC' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Showing <span style={{ color: 'var(--sky-blue)' }}>{filteredRegistrations.length}</span> of {registrations.length} total applicant records
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <button 
                    onClick={() => handleCopyEmails(filteredRegistrations)}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Copy size={12} /> Copy {filteredRegistrations.length} Emails
                  </button>
                  <span>Click any applicant row to open interview dossier</span>
                </div>
              </div>

              {filteredRegistrations.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No applicant records found matching the selected filters.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>APPLICANT</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>INTERVIEW STATUS</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>POINT OF CONTACT</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>PAYMENT</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>IAHV REG</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>LAST CONTACT</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg) => {
                        const name = reg.fullName || `${reg.firstName || ''} ${reg.lastName || ''}`.trim() || 'Anonymous Student';
                        const email = reg.email || 'No Email';
                        const phone = reg.phone || reg.phoneNumber || 'N/A';

                        const rawStatus = reg.interviewStatus || reg.status || 'Uncontacted';
                        const status = rawStatus.toLowerCase().includes('approved') ? 'Approved'
                          : rawStatus.toLowerCase().includes('did not reply') ? 'Did Not Reply'
                          : rawStatus.toLowerCase().includes('pending') ? 'Pending'
                          : rawStatus.toLowerCase().includes('reject') ? 'Rejected'
                          : rawStatus.toLowerCase().includes('withdraw') ? 'Withdrawn'
                          : 'Uncontacted';

                        const isFeeExempt = Number(reg.fee) === 0 || reg.fee === '0' || reg.paymentExempt;
                        const payment = reg.paymentStatus || (isFeeExempt ? 'Exempt' : 'Unpaid');
                        const isIahv = Boolean(reg.iahvRegistered);

                        const isClaimedByMe = reg.claimedBy && reg.claimedBy.toLowerCase() === userEmailLower;

                        return (
                          <tr 
                            key={reg.id}
                            onClick={() => setSelectedApp(reg)}
                            style={{
                              borderBottom: '1px solid rgba(35, 39, 95, 0.06)',
                              cursor: 'pointer',
                              background: isClaimedByMe ? 'var(--sky-blue-subtle)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                            className="roster-row-hover"
                          >
                            {/* Applicant Name & Contact */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>{name}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.15rem' }}>
                                <span>{email}</span>
                                {phone !== 'N/A' && <span>• {phone}</span>}
                              </div>
                            </td>

                            {/* Interview Status Badge */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {status === 'Approved' && <span className="badge" style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>Approved</span>}
                              {status === 'Pending' && <span className="badge" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}>Pending</span>}
                              {status === 'Uncontacted' && <span className="badge" style={{ background: '#F1F5F9', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Uncontacted</span>}
                              {status === 'Did Not Reply' && <span className="badge" style={{ background: '#FFEDD5', color: '#C2410C', border: '1px solid #FDBA74' }}>Did Not Reply</span>}
                              {status === 'Rejected' && <span className="badge" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #F87171' }}>Rejected</span>}
                              {status === 'Withdrawn' && <span className="badge" style={{ background: '#F3E8FF', color: '#7E22CE', border: '1px solid #D8B4FE' }}>Withdrawn</span>}
                            </td>

                            {/* Point of Contact (Claimed/Unclaimed) */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {reg.claimedBy ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span className="badge badge-sky" style={{ fontSize: '0.72rem', gap: '0.3rem' }}>
                                    <User size={12} /> {isClaimedByMe ? 'You' : reg.claimedByName || reg.claimedBy.split('@')[0]}
                                  </span>
                                  {(isClaimedByMe || isSuperAdmin) && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleUnclaim(reg); }}
                                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }}
                                      title="Unclaim application"
                                    >
                                      Unclaim
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleClaim(reg); }}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', gap: '0.3rem' }}
                                >
                                  <UserPlus size={12} /> Claim
                                </button>
                              )}
                            </td>

                            {/* Payment Badge */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {payment === 'Paid' && <span style={{ color: '#16A34A', fontWeight: 600, fontSize: '0.8rem' }}>✓ Paid</span>}
                              {payment === 'Exempt' && <span style={{ color: 'var(--sky-blue)', fontWeight: 600, fontSize: '0.8rem' }}>✓ $0 Exempt</span>}
                              {payment === 'Unpaid' && <span style={{ color: '#B45309', fontWeight: 600, fontSize: '0.8rem' }}>⚠️ Unpaid</span>}
                            </td>

                            {/* IAHV Registered Badge */}
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {isIahv ? (
                                <span style={{ color: 'var(--sky-blue)', fontWeight: 600, fontSize: '0.8rem' }}>✓ IAHV Reg</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No</span>
                              )}
                            </td>

                            {/* Last Contacted Date */}
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {reg.lastContactedDate || 'Never'}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedApp(reg); }}
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', gap: '0.3rem' }}
                                >
                                  Interview Dossier <ChevronRight size={14} />
                                </button>
                                {isSuperAdmin && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); deleteRegistration(reg.id); }}
                                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '0.25rem' }}
                                    title="Delete record (Super Admin Only)"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: FLYER & QR OUTREACH STUDIO */}
        {activeTab === 'flyers' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* WORKBENCH CONTROLS & LIVE FLYER CANVAS PREVIEW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
              
              {/* Left Column: Shortcode Input & Channel Controls */}
              <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
                <div>
                  <span className="badge badge-sun" style={{ marginBottom: '0.5rem' }}>
                    <QrCode size={13} /> Campaign Shortlink Studio
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Generate Custom QR Flyer
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
                    Create custom trackable QR codes and shortlinks for flyers, Instagram, posters, or department emails.
                  </p>
                </div>

                {/* Active Retreat Target Display */}
                <div style={{ padding: '0.75rem 1rem', background: 'var(--sky-blue-subtle)', border: '1px solid rgba(31, 116, 241, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Target Retreat</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{activeRetreat?.title || 'General SKY Campaign'}</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--sky-blue)', marginBottom: '0.35rem' }}>
                    SELECT RETREAT FLYER TEMPLATE
                  </label>
                  {(() => {
                    const availableTemplates = flyerTemplates.filter(t => !t.retreatId || t.retreatId === selectedRetreatId);

                    return availableTemplates.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem', background: '#F8FAFC', borderRadius: '4px' }}>
                        No uploaded templates for this retreat yet. (Using Standard SKY Brand Template)
                      </div>
                    ) : (
                      <select 
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: '#FFFFFF',
                          border: '1.5px solid var(--sky-blue)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          fontWeight: 700
                        }}
                      >
                        <option value="">Default SKY Brand Template</option>
                        {availableTemplates.map(tpl => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.templateName}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    STEP 3: CAMPAIGN SHORTCODE / TAG *
                  </label>
                  <input 
                    type="text"
                    maxLength={32}
                    placeholder="e.g. insta, eceb, inews, quad-day"
                    value={campaignTagInput}
                    onChange={(e) => setCampaignTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 32))}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: '#FFFFFF',
                      border: campaignTagInput.length >= 32 ? '1.5px solid #EF4444' : '1px solid rgba(35, 39, 95, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '1rem',
                      fontWeight: 700
                    }}
                  />
                  {campaignTagInput.length >= 32 && (
                    <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                      Maximum 32 characters reached
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                    Destination URL: <strong style={{ color: 'var(--sky-blue)' }}>skyuiuc.org/{(campaignTagInput || 'demo').trim().toLowerCase()}</strong>
                  </span>
                </div>

                {/* Graphic Export & Scale Controls */}
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Export Graphic Settings
                    </label>
                    {(() => {
                      const activeTpl = flyerTemplates.find(t => t.id === selectedTemplateId);
                      const baseW = activeTpl?.width || 1200;
                      const baseH = activeTpl?.height || 1600;
                      const dims = calculateScaledDimensions(baseW, baseH, exportScale);
                      return (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sky-blue)', background: 'var(--sky-blue-subtle)', padding: '0.2rem 0.55rem', borderRadius: '12px', border: '1px solid rgba(31, 116, 241, 0.2)' }}>
                          {dims.width} × {dims.height} px ({exportScale}x)
                        </span>
                      );
                    })()}
                  </div>

                  {/* Format Toggle (PNG / JPG) */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      FILE FORMAT
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setExportFormat('png')}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: exportFormat === 'png' ? '1.5px solid var(--sky-blue)' : '1px solid var(--border-color)',
                          background: exportFormat === 'png' ? '#FFFFFF' : '#F1F5F9',
                          color: exportFormat === 'png' ? 'var(--sky-blue)' : 'var(--text-secondary)',
                          fontWeight: exportFormat === 'png' ? 800 : 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        PNG (Lossless)
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFormat('jpg')}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: exportFormat === 'jpg' ? '1.5px solid var(--sky-blue)' : '1px solid var(--border-color)',
                          background: exportFormat === 'jpg' ? '#FFFFFF' : '#F1F5F9',
                          color: exportFormat === 'jpg' ? 'var(--sky-blue)' : 'var(--text-secondary)',
                          fontWeight: exportFormat === 'jpg' ? 800 : 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        JPG (Print / Photo)
                      </button>
                    </div>
                  </div>

                  {/* Continuous Scale Slider & Number Input */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      <span>EXPORT SCALE</span>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>{exportScale}x</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input 
                          type="range" 
                          min="0.25" 
                          max="4.0" 
                          step="0.05"
                          value={exportScale} 
                          onChange={(e) => setExportScale(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--sky-blue)', margin: '4px 0 0 0' }} 
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0 2px' }}>
                          <span>0.25x</span>
                          <span>1x</span>
                          <span>2x</span>
                          <span>3x</span>
                          <span>4x</span>
                        </div>
                      </div>
                      <input 
                        type="number" 
                        min="0.25" 
                        max="4.0" 
                        step="0.05"
                        value={exportScale} 
                        onChange={(e) => setExportScale(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        onBlur={() => {
                          if (!exportScale || isNaN(exportScale) || exportScale < 0.25) setExportScale(0.25);
                          else if (exportScale > 4.0) setExportScale(4.0);
                        }}
                        style={{ 
                          width: '68px', 
                          padding: '0.35rem 0.5rem', 
                          background: '#FFFFFF', 
                          border: '1px solid var(--border-color)', 
                          color: 'var(--text-main)', 
                          borderRadius: '4px', 
                          textAlign: 'center', 
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }} 
                      />
                    </div>
                  </div>

                  {/* JPEG Quality Slider (Visible when JPG format is active) */}
                  {exportFormat === 'jpg' && (
                    <div style={{ paddingTop: '0.25rem', borderTop: '1px dashed var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        <span>JPEG QUALITY</span>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>{Math.round(jpegQuality * 100)}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0.50" 
                        max="1.0" 
                        step="0.01" 
                        value={jpegQuality} 
                        onChange={(e) => setJpegQuality(parseFloat(e.target.value))} 
                        style={{ width: '100%', accentColor: 'var(--sky-blue)' }} 
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <button 
                    onClick={downloadFlyerImage}
                    disabled={isExporting}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.85rem 1rem', gap: '0.5rem', fontSize: '0.9rem', opacity: isExporting ? 0.7 : 1 }}
                  >
                    <Download size={16} /> {isExporting ? 'Rendering High-Res Flyer...' : `Download Printable Flyer (${exportFormat.toUpperCase()} • ${exportScale}x)`}
                  </button>

                  <button 
                    onClick={() => {
                      const cleanTag = (campaignTagInput || 'demo').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                      navigator.clipboard.writeText(`https://skyuiuc.org/${cleanTag}`);
                      alert(`Copied link (https://skyuiuc.org/${cleanTag}) to clipboard!`);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.85rem 1rem', gap: '0.4rem', fontSize: '0.9rem' }}
                  >
                    <Copy size={16} /> Copy Link
                  </button>
                </div>

              </div>

              {/* Right Column: Live Interactive Printable Flyer Preview */}
              <div className="glass-card" style={{
                padding: '1.75rem',
                background: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: 'var(--shadow-md)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sky-blue)', letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' }}>
                  Live Printable Flyer Canvas Preview
                </div>

                {/* Printable Mini Flyer Card */}
                {(() => {
                  const activeTpl = flyerTemplates.find(t => t.id === selectedTemplateId);
                  const bgSource = tplFullImage || activeTpl?.thumbnailBase64 || activeTpl?.bgImageUrl;

                  if (activeTpl && bgSource) {
                    const tplW = activeTpl.width || 1200;
                    const tplH = activeTpl.height || 1600;

                    return (
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '360px',
                        aspectRatio: `${tplW} / ${tplH}`,
                        background: `url(${bgSource}) 0 0 / 100% 100% no-repeat`,
                        containerType: 'inline-size',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-md)'
                      }}>
                        {/* Overlay QR Code at exact pixel coordinates with custom colors & shadow */}
                        <div style={{
                          position: 'absolute',
                          left: `${(parsePixelX(activeTpl.qrBox?.x, tplW / 2) / tplW) * 100}%`,
                          top: `${(parsePixelY(activeTpl.qrBox?.y, tplH / 2) / tplH) * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${(parsePixelSize(activeTpl.qrBox?.size, tplW * 0.125) / tplW) * 100}%`,
                          aspectRatio: '1 / 1',
                          background: activeTpl.qrBox?.bgColor === 'transparent' ? 'none' : (activeTpl.qrBox?.bgColor || '#FFFFFF'),
                          boxShadow: (activeTpl.qrBox?.hasShadow && activeTpl.qrBox?.bgColor !== 'transparent') ? `0 4px 15px ${activeTpl.qrBox?.shadowColor || 'rgba(0,0,0,0.15)'}` : 'none',
                          filter: (activeTpl.qrBox?.hasShadow && activeTpl.qrBox?.bgColor === 'transparent') ? `drop-shadow(0 4px 8px ${activeTpl.qrBox?.shadowColor || 'rgba(0,0,0,0.15)'})` : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                        </div>

                        {/* Shortlink Text overlayed at exact pixel coordinates */}
                        <div style={{
                          position: 'absolute',
                          left: `${(parsePixelX(activeTpl.shortlinkText?.x, tplW / 2) / tplW) * 100}%`,
                          top: `${(parsePixelY(activeTpl.shortlinkText?.y, tplH * 0.55) / tplH) * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          color: activeTpl.shortlinkText?.color || '#1F74F1',
                          fontFamily: activeTpl.shortlinkText?.fontFamily || "'Source Sans 3', sans-serif",
                          fontWeight: 800,
                          fontSize: `calc(${(parsePixelSize(activeTpl.shortlinkText?.fontSize, Math.round(tplH * 0.035)) / tplW) * 100}cqw)`,
                          textShadow: activeTpl.shortlinkText?.hasShadow ? `0 2px 6px ${activeTpl.shortlinkText?.shadowColor || 'rgba(0,0,0,0.3)'}` : 'none',
                          whiteSpace: 'nowrap'
                        }}>
                          skyuiuc.org/{(campaignTagInput || 'demo').trim().toLowerCase()}
                        </div>
                      </div>
                    );
                  }

                  // Default SKY Brand Fallback Preview Card
                  return (
                    <div style={{
                      width: '100%',
                      maxWidth: '360px',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      <div style={{ background: 'var(--sky-blue)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/assets/logos/skyatuiuc_logos/skyatuiuc_custom_white.png" alt="SKY Logo" style={{ height: '28px', width: 'auto' }} />
                      </div>

                      <div style={{ padding: '1.25rem', textAlign: 'center' }}>
                        <h4 style={{ fontFamily: 'Merriweather, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                          {activeRetreat?.title || 'SKY Happiness Retreat'}
                        </h4>
                        
                        <div style={{ color: '#B45309', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                          {activeRetreat ? (activeRetreat.startDate && activeRetreat.endDate ? `${activeRetreat.startDate} to ${activeRetreat.endDate}` : 'Campus Retreat') : 'Campus Retreat'}
                        </div>

                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '1rem' }}>
                          Evidence-Based Breathwork, Sudarshan Kriya & Leadership Development
                        </p>

                        <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'inline-block', marginBottom: '0.75rem' }}>
                          {qrDataUrl ? (
                            <img src={qrDataUrl} alt="QR Code" style={{ width: '150px', height: '150px', display: 'block' }} />
                          ) : (
                            <div style={{ width: '150px', height: '150px', background: '#F1F5F9' }}></div>
                          )}
                        </div>

                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--sky-blue)' }}>
                          skyuiuc.org/{(campaignTagInput || 'demo').trim().toLowerCase()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Scan QR Code or type link to apply
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>

          </div>
        )}

        {/* TAB 3: RETREAT ATTENDANCE TRACKER */}
        {activeTab === 'attendance' && (
          <AttendanceTab
            activeRetreat={activeRetreat}
            registrations={registrations}
            authorizedEmails={authorizedEmails}
            currentUser={currentUser}
          />
        )}

      </div>

      {/* INTERVIEW WORKBENCH MODAL WINDOW */}
      {selectedApp && (
        <div 
          onClick={() => setSelectedApp(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(35, 39, 95, 0.45)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
            cursor: 'pointer'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-card modal-responsive-card animate-fade-in" 
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 'clamp(1rem, 4vw, 2.25rem)',
              border: '1px solid var(--border-color)',
              background: '#FFFFFF',
              boxShadow: 'var(--shadow-lg)',
              cursor: 'default'
            }}
          >
            
            {/* Consolidated Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                
                {/* Title, NetID & Academic Role Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.66rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {selectedApp.fullName || `${selectedApp.firstName || ''} ${selectedApp.lastName || ''}`.trim() || 'Applicant Dossier'}
                  </h2>
                  {selectedApp.netId && (
                    <span className="badge badge-sky" style={{ fontSize: '0.72rem' }}>
                      {selectedApp.netId}
                    </span>
                  )}
                  {selectedApp.academicRole && (
                    <span className="badge badge-earth" style={{ fontSize: '0.72rem' }}>
                      🎓 {selectedApp.academicRole}
                    </span>
                  )}
                </div>

                {/* Contact Links, Direct Call & Copy Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  
                  {/* Email, Direct Mail & Copy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <Mail size={14} color="var(--sky-blue)" />
                    <a href={`mailto:${selectedApp.email}`} style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}>
                      {selectedApp.email}
                    </a>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(selectedApp.email); alert(`Copied email (${selectedApp.email}) to clipboard!`); }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', gap: '0.2rem', marginLeft: '0.25rem' }}
                      title="Copy Email"
                    >
                      <Copy size={11} /> Copy
                    </button>
                  </div>

                  {/* Phone, Direct Call & Copy */}
                  {selectedApp.phone && selectedApp.phone !== 'N/A' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <Phone size={14} color="#16A34A" />
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{selectedApp.phone}</span>
                      
                      {/* Direct Call Button */}
                      <a 
                        href={`tel:${selectedApp.phone.replace(/[^0-9+]/g, '')}`} 
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', gap: '0.25rem', background: '#10B981', borderColor: '#10B981', color: '#FFF', marginLeft: '0.25rem' }}
                        title="Click to Call Participant Directly"
                      >
                        <Phone size={11} /> Call
                      </a>

                      {/* Copy Phone Button */}
                      <button 
                        onClick={() => { navigator.clipboard.writeText(selectedApp.phone); alert(`Copied phone (${selectedApp.phone}) to clipboard!`); }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem', gap: '0.2rem' }}
                        title="Copy Phone Number"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    </div>
                  )}

                  {/* Submission Date */}
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Submitted: {selectedApp.submittedAt ? new Date(selectedApp.submittedAt).toLocaleDateString() : 'Recent'}
                  </div>
                </div>

              </div>

              <button 
                onClick={() => setSelectedApp(null)}
                style={{ background: 'rgba(35, 39, 95, 0.06)', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* INTERVIEW CONTROL BENCH */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.75rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem'
            }}>
              
              {/* Interview Status Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  INTERVIEW STATUS
                </label>
                <select 
                  value={activeStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem' }}
                >
                  <option value="Uncontacted">Uncontacted</option>
                  <option value="Pending">Pending Interview</option>
                  <option value="Approved">Approved</option>
                  <option value="Did Not Reply">Did Not Reply</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>

              {/* Point of Contact / Claim Control */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PRIMARY POINT OF CONTACT
                </label>
                {isSuperAdmin ? (
                  <select 
                    value={activeClaimedBy}
                    onChange={(e) => handleClaimChange(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    <option value="">Unclaimed (No Contact)</option>
                    {authorizedEmails.map((email, idx) => (
                      <option key={idx} value={email}>{email}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={activeClaimedBy ? (activeClaimedBy.toLowerCase() === userEmailLower ? 'Claimed by You' : activeClaimedBy) : 'Unclaimed'} 
                      style={{ width: '100%', padding: '0.65rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                    {!activeClaimedBy && (
                      <button 
                        onClick={() => handleClaimChange(currentUser.email)} 
                        className="btn btn-sun btn-sm"
                      >
                        Claim
                      </button>
                    )}
                    {activeClaimedBy.toLowerCase() === userEmailLower && (
                      <button 
                        onClick={() => handleClaimChange('')} 
                        className="btn btn-secondary btn-sm"
                      >
                        Unclaim
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Fee Information (Super Admin Managed) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  FEE (SUPER ADMIN MANAGED)
                </label>
                {(() => {
                  const feeInfo = parseFeeAndPayment(selectedApp);
                  return (
                    <div style={{
                      padding: '0.65rem',
                      background: feeInfo.isPaid ? '#DCFCE7' : '#FFEDD5',
                      border: feeInfo.isPaid ? '1px solid #86EFAC' : '1px solid #FDBA74',
                      borderRadius: 'var(--radius-sm)',
                      color: feeInfo.isPaid ? '#166534' : '#C2410C',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {feeInfo.amount === 0 ? '✓ Free ($0 Tuition)' : feeInfo.isPaid ? `✓ ${feeInfo.formattedFee} Paid` : `⚠️ ${feeInfo.formattedFee} Unpaid`}
                    </div>
                  );
                })()}
              </div>

              {/* IAHV Registered Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  IAHV REGISTRATION
                </label>
                <button
                  type="button"
                  onClick={handleIahvToggle}
                  className={`btn ${activeIahv ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
                >
                  {activeIahv ? '✓ IAHV Registered' : 'Not Registered'}
                </button>
              </div>

            </div>

            {/* Quick Contact Date Logger & Notes Workbench */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  INTERVIEWER NOTES & LOGS
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Last Contacted:</span>
                  <input 
                    type="date"
                    value={activeLastContacted}
                    onChange={(e) => handleContactDateChange(e.target.value)}
                    style={{ padding: '0.3rem 0.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.78rem' }}
                  />
                  <button 
                    type="button"
                    onClick={handleLogContactToday}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    Log Contact Today
                  </button>
                </div>
              </div>

              <textarea 
                rows={4}
                placeholder="Record interview notes, phone impressions, scheduling notes, or participant comments (auto-saved as you type)..."
                value={activeNotes}
                onChange={(e) => setActiveNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: '#FFFFFF',
                  border: '1px solid rgba(35, 39, 95, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6
                }}
              />
            </div>

            {/* Participant Application Responses Accordion */}
            <div style={{ background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.75rem' }}>
              <button 
                onClick={() => setShowAppDetails(!showAppDetails)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <FileText size={18} color="var(--sky-blue)" /> Participant Application Responses
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--sky-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {showAppDetails ? '▲ Hide Application Answers' : '▼ View Application Answers'}
                </div>
              </button>

              {showAppDetails && (
                <div className="animate-fade-in" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                  
                  {/* Basic Metadata */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Email Address</span>
                      <strong style={{ color: 'var(--text-main)' }}>{selectedApp.email}</strong>
                    </div>
                    {selectedApp.phone && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Phone Number</span>
                        <strong style={{ color: 'var(--text-main)' }}>{selectedApp.phone}</strong>
                      </div>
                    )}
                    {selectedApp.academicRole && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Academic Role / Affiliation</span>
                        <strong style={{ color: 'var(--text-main)' }}>{selectedApp.academicRole}</strong>
                      </div>
                    )}
                    {selectedApp.isOver18 && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Age</span>
                        <strong style={{ color: 'var(--text-main)' }}>{selectedApp.isOver18 === 'Yes' ? '18 or older' : selectedApp.isOver18}</strong>
                      </div>
                    )}
                    {selectedApp.completedSkyBefore && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Completed SKY Course Before?</span>
                        <strong style={{ color: 'var(--text-main)' }}>{selectedApp.completedSkyBefore}</strong>
                      </div>
                    )}
                    {selectedApp.agreeToAll3Days && (
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Agreed to Full Attendance?</span>
                        <strong style={{ color: 'var(--text-main)' }}>{selectedApp.agreeToAll3Days}</strong>
                      </div>
                    )}
                  </div>

                  {/* Health Conditions */}
                  {((Array.isArray(selectedApp.healthConditions) && selectedApp.healthConditions.length > 0) || selectedApp.otherHealthConditions) && (
                    <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'var(--sky-sun-light)', border: '1px solid rgba(250, 188, 29, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: '#B45309', display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        Medical / Health Conditions Reported
                      </span>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0 }}>
                        {Array.isArray(selectedApp.healthConditions) ? selectedApp.healthConditions.join(', ') : selectedApp.healthConditions}
                        {selectedApp.otherHealthConditions ? ` (${selectedApp.otherHealthConditions})` : ''}
                      </p>
                    </div>
                  )}

                  {/* Food Allergies */}
                  {selectedApp.foodAllergies && (
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Dietary Restrictions / Food Allergies</span>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0 }}>{selectedApp.foodAllergies}</p>
                    </div>
                  )}

                  {/* Referral Source */}
                  {selectedApp.referralSource && (
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>How They Heard About SKY</span>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0 }}>{selectedApp.referralSource}</p>
                    </div>
                  )}

                  {/* Motivation / Additional Comments */}
                  {(selectedApp.motivation || selectedApp.comments || selectedApp.notes) && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Motivation & Additional Comments</span>
                      <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                        {selectedApp.motivation || selectedApp.comments || selectedApp.notes}
                      </p>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {saveSuccess ? (
                  <span style={{ color: '#16A34A', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={16} /> Changes Saved!
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                    Auto-saved in real time
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => deleteRegistration(selectedApp.id)}
                    style={{
                      padding: '0.5rem 0.9rem',
                      borderRadius: 'var(--radius-sm)',
                      background: '#FEF2F2',
                      border: '1px solid #F87171',
                      color: '#DC2626',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'var(--transition-fast)'
                    }}
                    title="Delete registration application (Super Admin only)"
                  >
                    <Trash2 size={14} /> Delete Application
                  </button>
                )}

                <button 
                  onClick={() => setSelectedApp(null)}
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  Done (Esc)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
