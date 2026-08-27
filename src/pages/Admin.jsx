import React, { useState, useEffect, useRef } from 'react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';
import { INITIAL_RETREATS } from '../data/retreatData';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { saveFlyerTemplateWithChunks, loadFlyerTemplateImage, deleteFlyerTemplateWithChunks } from '../services/flyerChunkService';
import { Link } from 'react-router-dom';
import { UserPlus, Trash2, Mail, CheckCircle2, AlertCircle, Database, Calendar, Plus, Server, HeartHandshake, ArrowRight, Activity, ExternalLink, Users, FileText, ShieldCheck, BarChart3, QrCode, Edit3, Save, X, Download, TrendingUp } from 'lucide-react';
import QRCode from 'qrcode';
import { logDatabaseOperation } from '../services/telemetryService';
import { getCampaignAnalyticsForDateRange } from '../services/campaignAnalyticsService';
import { SPARK_PLAN_QUOTAS, calculateDynamicStorageBytes, calculateDynamicEgress } from '../config/resourceLimits';
import ResourceUsageChart from '../components/ResourceUsageChart';
import GroupAssignmentTab from '../components/GroupAssignmentTab';
import AutoEmailDispatchTab from '../components/AutoEmailDispatchTab';
import { getDefaultActiveRetreatId } from '../utils/retreatUtils';

// Reusable Compact Color Selector with Opacity / Alpha Control & RGB Display
const ColorPickerWithAlpha = ({ label, value, onChange }) => {
  const parseColor = (val) => {
    if (!val || val === 'transparent') return { hex: '#000000', alpha: 0 };
    if (val.startsWith('rgba') || val.startsWith('rgb')) {
      const match = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
        return { hex: `#${r}${g}${b}`, alpha: a };
      }
    }
    if (val.startsWith('#')) {
      if (val.length === 9) { // #RRGGBBAA
        const hex = val.substring(0, 7);
        const aHex = val.substring(7, 9);
        const alpha = parseInt(aHex, 16) / 255;
        return { hex, alpha };
      }
      return { hex: val.substring(0, 7), alpha: 1 };
    }
    return { hex: '#1f74f1', alpha: 1 };
  };

  const { hex, alpha } = parseColor(value);

  const hexToRgba = (h, a) => {
    if (a === 0) return 'transparent';
    if (a === 1) return h;
    const r = parseInt(h.substring(1, 3), 16);
    const g = parseInt(h.substring(3, 5), 16);
    const b = parseInt(h.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  };

  const handleHexChange = (newHex) => {
    onChange(hexToRgba(newHex, alpha === 0 ? 1 : alpha));
  };

  const handleAlphaChange = (newAlpha) => {
    onChange(hexToRgba(hex, newAlpha));
  };

  const bgCheckerboard = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 700 }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#F8FAFC', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
          {/* Live Checkerboard Alpha Swatch & Native Color Wheel */}
          <div style={{
            position: 'relative',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            backgroundImage: bgCheckerboard,
            backgroundSize: '6px 6px',
            flexShrink: 0
          }}>
            <div style={{ position: 'absolute', inset: 0, background: value || 'transparent' }} />
            <input 
              type="color" 
              value={hex} 
              onChange={(e) => handleHexChange(e.target.value)} 
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
            />
          </div>

          {/* RGB Hex Code Text Box */}
          <input 
            type="text" 
            placeholder="#RGB"
            value={alpha === 0 ? 'transparent' : hex.toUpperCase()} 
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val.toLowerCase() === 'transparent') {
                onChange('transparent');
              } else if (val.startsWith('#')) {
                handleHexChange(val);
              } else {
                handleHexChange(`#${val}`);
              }
            }} 
            style={{ flex: 1, minWidth: 0, padding: '0.2rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '3px', color: 'var(--text-main)', fontSize: '0.72rem', fontFamily: 'monospace' }} 
          />

          {/* Clear / Transparent Quick Toggle */}
          <button 
            type="button" 
            onClick={() => onChange(alpha === 0 ? hex : 'transparent')} 
            style={{ padding: '0.2rem 0.4rem', fontSize: '0.68rem', background: alpha === 0 ? 'var(--sky-blue)' : 'rgba(35, 39, 95, 0.08)', color: alpha === 0 ? '#FFFFFF' : 'var(--text-main)', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
          >
            {alpha === 0 ? 'Opaque' : 'Clear'}
          </button>
        </div>
        
        {/* Opacity / Alpha Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: '40px', fontWeight: 600, flexShrink: 0 }}>Opacity:</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={alpha} 
            onChange={(e) => handleAlphaChange(parseFloat(e.target.value))} 
            style={{ flex: 1, minWidth: 0, height: '4px' }} 
          />
          <span style={{ fontSize: '0.68rem', color: 'var(--sky-blue)', width: '28px', textAlign: 'right', fontWeight: 700, flexShrink: 0 }}>
            {Math.round(alpha * 100)}%
          </span>
        </div>

      </div>
    </div>
  );
};

export default function Admin() {
  const { currentUser, authorizedEmails, addVolunteerEmail, removeVolunteerEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('volunteers'); // 'volunteers' | 'retreats' | 'usage' | 'applications'
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Retreat history state
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

  // Registrations state
  const [registrations, setRegistrations] = useState(() => {
    const saved = localStorage.getItem('sky_registrations');
    return saved ? JSON.parse(saved) : [];
  });

  // Server-Verified Document Counts
  const [serverCounts, setServerCounts] = useState({
    registrations: 0,
    retreats: 0,
    volunteers: 0,
    lastVerified: null
  });

  // Monthly Bucket Daily Audit Logs & Historical Trends State
  const [todayAudit, setTodayAudit] = useState({ reads: 0, writes: 0, deletes: 0, lastUpdated: null });
  const [historicalAuditLogs, setHistoricalAuditLogs] = useState([]);
  const [dateRangeDays, setDateRangeDays] = useState(14);

  // Flyer Template Manager State
  const [flyerTemplates, setFlyerTemplates] = useState(() => {
    const saved = localStorage.getItem('sky_flyer_templates');
    return saved ? JSON.parse(saved) : [];
  });

  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [tplRetreatId, setTplRetreatId] = useState('');
  const [tplTitle, setTplTitle] = useState('');
  const [tplImageBase64, setTplImageBase64] = useState('');
  const [tplWidth, setTplWidth] = useState(1200);
  const [tplHeight, setTplHeight] = useState(1600);
  
  const [flyerStudioMessage, setFlyerStudioMessage] = useState({ type: '', text: '' });
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');

  // Zero-Read Local Backup Exporters (Uses already-synced React in-memory state, 0 Firestore reads consumed)
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFullBackupJson = () => {
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.email || 'Super Admin',
        description: 'SKY at UIUC Complete Database Backup',
        version: '1.0.0'
      },
      collections: {
        retreat_history: retreats || [],
        registrations: registrations || [],
        authorized_volunteers: authorizedEmails || [],
        flyer_templates: flyerTemplates || []
      },
      counts: {
        retreats: (retreats || []).length,
        registrations: (registrations || []).length,
        volunteers: (authorizedEmails || []).length,
        flyerTemplates: (flyerTemplates || []).length
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `skyatuiuc_full_backup_${today}.json`);
    setBackupSuccessMsg(`Full backup (${(registrations || []).length} registrations, ${(retreats || []).length} retreats) downloaded successfully!`);
    setTimeout(() => setBackupSuccessMsg(''), 6000);
  };

  const handleExportRegistrationsCsv = () => {
    const today = new Date().toISOString().split('T')[0];
    if (!registrations || registrations.length === 0) {
      alert("No registrations available in local cache to export.");
      return;
    }

    const headers = [
      "ID", "Retreat ID", "Retreat Title", "Full Name", "Email", "Phone", "NetID",
      "Academic Role", "Fee Tier", "Payment Status", "Attendance Status", "Check-ins Count",
      "Food Allergies", "Health Conditions", "Orientation Notes", "Created At"
    ];

    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '""';
      const str = Array.isArray(val) ? val.join('; ') : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = registrations.map(r => [
      escapeCsv(r.id),
      escapeCsv(r.retreatId),
      escapeCsv(r.retreatTitle),
      escapeCsv(r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim()),
      escapeCsv(r.email),
      escapeCsv(r.phone),
      escapeCsv(r.netId || r.universityId),
      escapeCsv(r.academicRole),
      escapeCsv(r.feeTier),
      escapeCsv(r.paymentStatus),
      escapeCsv(r.attendanceStatus),
      escapeCsv(r.checkIns ? (Array.isArray(r.checkIns) ? r.checkIns.length : Object.keys(r.checkIns).length) : 0),
      escapeCsv(r.foodAllergies),
      escapeCsv(r.healthConditions),
      escapeCsv(r.notes || r.orientationNotes || r.interviewNotes),
      escapeCsv(r.createdAt || r.registeredAt)
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `skyatuiuc_registrations_${today}.csv`);
    setBackupSuccessMsg(`Exported ${registrations.length} registrations to CSV successfully!`);
    setTimeout(() => setBackupSuccessMsg(''), 6000);
  };

  const handleExportRetreatsJson = () => {
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      exportedAt: new Date().toISOString(),
      retreats: retreats || []
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `skyatuiuc_retreats_${today}.json`);
    setBackupSuccessMsg(`Exported ${(retreats || []).length} retreat records to JSON successfully!`);
    setTimeout(() => setBackupSuccessMsg(''), 6000);
  };

  // Helper to convert any color string (Hex, RGBA, transparent) into 8-digit #RRGGBBAA for QRCode library
  const colorToQrHex = (col, fallback = '#161942FF') => {
    if (!col || col === 'transparent') return '#00000000';
    if (col.startsWith('#')) {
      if (col.length === 7) return `${col}FF`;
      if (col.length === 9) return col;
      if (col.length === 4) {
        const r = col[1], g = col[2], b = col[3];
        return `#${r}${r}${g}${g}${b}${b}FF`;
      }
    }
    if (col.startsWith('rgba') || col.startsWith('rgb')) {
      const match = col.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        const aFloat = match[4] !== undefined ? parseFloat(match[4]) : 1;
        const a = Math.round(aFloat * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}${a}`;
      }
    }
    return fallback;
  };

  // Dynamic Pixel Coordinate & Styling Controls (Exact Pixel Values)
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

  const [qrX, setQrX] = useState(600);
  const [qrY, setQrY] = useState(800);
  const [qrSize, setQrSize] = useState(150);
  const [qrBgColor, setQrBgColor] = useState('transparent');
  const [qrFgColor, setQrFgColor] = useState('#161942');
  const [qrHasShadow, setQrHasShadow] = useState(false);
  const [qrShadowColor, setQrShadowColor] = useState('#000000');
  
  const [textX, setTextX] = useState(600);
  const [textY, setTextY] = useState(890);
  const [textSize, setTextSize] = useState(64); // Default 4% of 1600 image height = 64px
  const [textColor, setTextColor] = useState('#000000'); // Black default
  const [textFontFamily, setTextFontFamily] = useState("'Source Sans 3', sans-serif");
  const [textHasShadow, setTextHasShadow] = useState(false); // No shadow default
  const [textShadowColor, setTextShadowColor] = useState('#000000');
  const [adminDummyQrUrl, setAdminDummyQrUrl] = useState('');

  // Interactive Live Preview Card State: Zoom, Pan & Drag-and-Drop
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [activeDragItem, setActiveDragItem] = useState(null); // 'qr' | 'text' | 'pan' | null
  const previewCardRef = useRef(null);
  const previewViewportRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, initialElemX: 0, initialElemY: 0 });

  // Admin Studio Dummy QR Code Preview Generator
  useEffect(() => {
    const dummyUrl = 'https://skyuiuc.org/demo';
    QRCode.toDataURL(dummyUrl, {
      width: 360,
      margin: 0,
      color: {
        dark: colorToQrHex(qrFgColor, '#161942FF'),
        light: colorToQrHex(qrBgColor, '#00000000')
      }
    })
    .then(url => setAdminDummyQrUrl(url))
    .catch(err => console.warn('Admin QR preview error:', err));
  }, [qrFgColor, qrBgColor]);

  // Non-passive Mouse Wheel Listener for Low-Sensitivity Focal Point Cursor Zoom (Prevents Page Scroll)
  useEffect(() => {
    const container = previewViewportRef.current;
    if (!container) return;

    const handleNonPassiveWheel = (e) => {
      e.preventDefault(); // Stop window scrolling completely!

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - (rect.left + rect.width / 2);
      const mouseY = e.clientY - (rect.top + rect.height / 2);

      // Low sensitivity zoom multiplier (smooth 8% steps)
      const delta = e.deltaY < 0 ? 1.08 : 0.92;

      setPreviewZoom((currentZoom) => {
        const newZoom = Math.max(0.5, Math.min(4.0, parseFloat((currentZoom * delta).toFixed(3))));
        const scaleRatio = newZoom / currentZoom;

        setPreviewPan((currentPan) => ({
          x: mouseX - (mouseX - currentPan.x) * scaleRatio,
          y: mouseY - (mouseY - currentPan.y) * scaleRatio
        }));

        return newZoom;
      });
    };

    container.addEventListener('wheel', handleNonPassiveWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleNonPassiveWheel);
    };
  }, [tplImageBase64, activeTab, editingTemplateId]);

  // Drag-and-Drop for QR Box & Text, and Canvas Panning
  const handlePreviewMouseDown = (e, itemType) => {
    e.stopPropagation();
    setActiveDragItem(itemType);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialElemX: itemType === 'qr' ? qrX : itemType === 'text' ? textX : previewPan.x,
      initialElemY: itemType === 'qr' ? qrY : itemType === 'text' ? textY : previewPan.y
    };
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!activeDragItem) return;

      if (activeDragItem === 'pan') {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        setPreviewPan({
          x: dragStartRef.current.initialElemX + dx,
          y: dragStartRef.current.initialElemY + dy
        });
        return;
      }

      if (!previewCardRef.current) return;
      const rect = previewCardRef.current.getBoundingClientRect();

      // Pointer location relative to preview container
      const relativeX = (e.clientX - rect.left) / rect.width;
      const relativeY = (e.clientY - rect.top) / rect.height;

      const newX = Math.max(0, Math.min(tplWidth, Math.round(relativeX * tplWidth)));
      const newY = Math.max(0, Math.min(tplHeight, Math.round(relativeY * tplHeight)));

      if (activeDragItem === 'qr') {
        setQrX(newX);
        setQrY(newY);
      } else if (activeDragItem === 'text') {
        setTextX(newX);
        setTextY(newY);
      }
    };

    const handleGlobalMouseUp = () => {
      if (activeDragItem) setActiveDragItem(null);
    };

    if (activeDragItem) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeDragItem, tplWidth, tplHeight]);

  // Campaign Scan & Conversion Analytics Dashboard State
  const defaultCampEnd = new Date().toISOString().split('T')[0];
  const defaultCampStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [campStartDate, setCampStartDate] = useState(defaultCampStart);
  const [campEndDate, setCampEndDate] = useState(defaultCampEnd);
  const [campDailyMetrics, setCampDailyMetrics] = useState([]);
  const [campTagTotals, setCampTagTotals] = useState([]);
  const [campGrandScans, setCampGrandScans] = useState(0);
  const [campGrandConversions, setCampGrandConversions] = useState(0);
  const [hoveredCampDay, setHoveredCampDay] = useState(null);
  const [compareMetric, setCompareMetric] = useState('scans'); // 'scans' | 'conversions'

  // Fetch campaign analytics for date range (1-2 reads per month)
  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      const data = await getCampaignAnalyticsForDateRange(campStartDate, campEndDate);
      if (isMounted) {
        setCampDailyMetrics(data.dailyMetrics);
        setCampTagTotals(data.tagTotals);
        setCampGrandScans(data.grandTotalScans);
        setCampGrandConversions(data.grandTotalConversions);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, [campStartDate, campEndDate, activeTab]);

  // Retreat Form & Edit State
  const [editingRetreatId, setEditingRetreatId] = useState(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [teachers, setTeachers] = useState('');
  const [courses, setCourses] = useState('SKY Breath Meditation');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [fridayTime, setFridayTime] = useState('');
  const [saturdayTime, setSaturdayTime] = useState('');
  const [sundayTime, setSundayTime] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const currentYearMonth = todayStr.substring(0, 7); // YYYY-MM
  const currentDayKey = todayStr.substring(8, 10);   // DD

  // Fetch server-verified document counts
  const fetchServerVerifiedCounts = async () => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const regCountSnap = await getCountFromServer(collection(db, 'registrations'));
      const retCountSnap = await getCountFromServer(collection(db, 'retreat_history'));
      const volCountSnap = await getCountFromServer(collection(db, 'authorized_volunteers'));

      setServerCounts({
        registrations: regCountSnap.data().count,
        retreats: retCountSnap.data().count,
        volunteers: volCountSnap.data().count,
        lastVerified: new Date().toLocaleTimeString()
      });

      logDatabaseOperation(3, 0, 0);
    } catch (err) {
      console.warn("Server count verification notice:", err);
    }
  };

  // Real-time listener for Monthly Bucket Audit Logs (daily_audit_logs/{YYYY-MM})
  // Maximum 1-2 Document Reads Total for entire 30-day historical chart!
  useEffect(() => {
    let unsubscribeCurrent = null;
    let unsubscribePrev = null;

    if (isFirebaseConfigured && db) {
      try {
        // Calculate current and previous month string IDs
        const currentMonthRef = doc(db, 'daily_audit_logs', currentYearMonth);
        
        const prevMonthDate = new Date();
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevYearMonth = prevMonthDate.toISOString().split('T')[0].substring(0, 7);
        const prevMonthRef = doc(db, 'daily_audit_logs', prevYearMonth);

        let currentLogs = {};
        let prevLogs = {};

        const mergeAndFormatLogs = () => {
          const combinedDaily = [];

          // Process previous month logs
          if (prevLogs.days) {
            Object.entries(prevLogs.days).forEach(([day, metrics]) => {
              combinedDaily.push({
                id: `${prevYearMonth}-${day}`,
                date: `${prevYearMonth}-${day}`,
                reads: Number(metrics.reads) || 0,
                writes: Number(metrics.writes) || 0,
                deletes: Number(metrics.deletes) || 0
              });
            });
          }

          // Process current month logs
          if (currentLogs.days) {
            Object.entries(currentLogs.days).forEach(([day, metrics]) => {
              combinedDaily.push({
                id: `${currentYearMonth}-${day}`,
                date: `${currentYearMonth}-${day}`,
                reads: Number(metrics.reads) || 0,
                writes: Number(metrics.writes) || 0,
                deletes: Number(metrics.deletes) || 0
              });

              // Extract today's audit counter if matching currentDayKey
              if (day === currentDayKey) {
                setTodayAudit({
                  reads: Number(metrics.reads) || 0,
                  writes: Number(metrics.writes) || 0,
                  deletes: Number(metrics.deletes) || 0,
                  lastUpdated: currentLogs.lastUpdated ? new Date(currentLogs.lastUpdated).toLocaleTimeString() : 'Just now'
                });
              }
            });
          }

          setHistoricalAuditLogs(combinedDaily);
        };

        // Subscriptions to current & previous monthly bucket documents (1-2 reads max)
        unsubscribeCurrent = onSnapshot(currentMonthRef, (snap) => {
          if (snap.exists()) {
            currentLogs = snap.data();
          } else {
            currentLogs = {};
          }
          mergeAndFormatLogs();
        }, (err) => console.warn("Current month bucket sync notice:", err));

        unsubscribePrev = onSnapshot(prevMonthRef, (snap) => {
          if (snap.exists()) {
            prevLogs = snap.data();
          } else {
            prevLogs = {};
          }
          mergeAndFormatLogs();
        }, (err) => console.warn("Previous month bucket sync notice:", err));

      } catch (err) {
        console.warn("Monthly bucket listener setup notice:", err);
      }
    }

    return () => {
      if (unsubscribeCurrent) unsubscribeCurrent();
      if (unsubscribePrev) unsubscribePrev();
    };
  }, [currentYearMonth, currentDayKey]);

  useEffect(() => {
    fetchServerVerifiedCounts();
  }, []);

  // Sync retreats from Firestore
  useEffect(() => {
    let unsubscribe = null;
    if (isFirebaseConfigured && db) {
      try {
        const retreatsRef = collection(db, 'retreat_history');
        unsubscribe = onSnapshot(retreatsRef, (snapshot) => {
          const fetched = [];
          snapshot.forEach((d) => {
            fetched.push({ id: d.id, ...d.data() });
          });
          if (fetched.length >= 0) {
            setRetreats(fetched);
            localStorage.setItem('sky_retreat_history', JSON.stringify(fetched));
          }
        }, (err) => console.warn("Retreat sync notice:", err));
      } catch (e) {
        console.warn("Firestore retreats setup notice:", e);
      }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Sync flyer templates live from Firestore
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
        }, (err) => console.warn("Flyer templates sync notice:", err));
      } catch (e) {
        console.warn("Firestore flyer templates error:", e);
      }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target.result;
      const img = new Image();
      img.onload = () => {
        // Read actual natural image dimensions to preserve exact aspect ratio and 100% original resolution
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        setTplImageBase64(rawBase64);
        setTplWidth(width);
        setTplHeight(height);

        // Apply image-dimension relative defaults on upload (for new templates)
        if (!editingTemplateId) {
          const smallerDim = Math.min(width, height);

          // QR Code size = 12.5% of smaller dimension
          const defaultQrSize = Math.round(smallerDim * 0.125);
          // Text size = 4% of image height
          const defaultTextSize = Math.max(1, Math.round(height * 0.04));

          // Middle of flyer
          const defaultQrX = Math.round(width / 2);
          const defaultQrY = Math.round(height / 2);

          // Text right below QR code
          const defaultTextX = Math.round(width / 2);
          const defaultTextY = Math.round(defaultQrY + (defaultQrSize / 2) + defaultTextSize + 10);

          setQrSize(defaultQrSize);
          setQrX(defaultQrX);
          setQrY(defaultQrY);
          setTextSize(defaultTextSize);
          setTextX(defaultTextX);
          setTextY(defaultTextY);
          setQrBgColor('transparent');
          setQrHasShadow(false);
          setQrShadowColor('#000000');
          setTextColor('#000000'); // Black text default
          setTextHasShadow(false); // No shadow default
        }
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditTemplate = async (tpl) => {
    setEditingTemplateId(tpl.id);
    setTplRetreatId(tpl.retreatId);
    setTplTitle(tpl.templateName);
    setTplWidth(tpl.width || 1200);
    setTplHeight(tpl.height || 1600);

    if (tpl.thumbnailBase64) {
      setTplImageBase64(tpl.thumbnailBase64);
    }

    if (isFirebaseConfigured && db) {
      const fullImage = await loadFlyerTemplateImage(db, tpl.id);
      if (fullImage) {
        setTplImageBase64(fullImage);
      }
    }

    setQrX(parsePixelX(tpl.qrBox?.x, 600));
    setQrY(parsePixelY(tpl.qrBox?.y, 800));
    setQrSize(parsePixelSize(tpl.qrBox?.size, 150));
    setQrBgColor(tpl.qrBox?.bgColor || 'transparent');
    setQrFgColor(tpl.qrBox?.fgColor || '#161942');
    setQrHasShadow(tpl.qrBox?.hasShadow ?? false);
    setQrShadowColor(tpl.qrBox?.shadowColor || '#000000');

    setTextX(parsePixelX(tpl.shortlinkText?.x, 600));
    setTextY(parsePixelY(tpl.shortlinkText?.y, 890));
    setTextSize(parsePixelSize(tpl.shortlinkText?.fontSize, Math.round((tpl.height || 1600) * 0.04)));
    setTextColor(tpl.shortlinkText?.color || '#000000');
    setTextFontFamily(tpl.shortlinkText?.fontFamily || "'Source Sans 3', sans-serif");
    setTextHasShadow(tpl.shortlinkText?.hasShadow ?? false);
    setTextShadowColor(tpl.shortlinkText?.shadowColor || '#000000');
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setTplTitle('');
    setTplImageBase64('');
    setTplWidth(1200);
    setTplHeight(1600);
    setQrX(600);
    setQrY(800);
    setQrSize(150);
    setQrBgColor('transparent');
    setQrFgColor('#161942');
    setQrHasShadow(false);
    setQrShadowColor('#000000');

    setTextX(600);
    setTextY(890);
    setTextSize(64); // 4% of 1600 = 64px
    setTextColor('#000000');
    setTextFontFamily("'Source Sans 3', sans-serif");
    setTextHasShadow(false);
    setTextShadowColor('#000000');
  };

  const handleSaveFlyerTemplate = async (e) => {
    e.preventDefault();
    if (!tplRetreatId) {
      alert("Please select a retreat to associate this flyer template with.");
      return;
    }
    if (!tplImageBase64) {
      alert("Please upload a flyer background image.");
      return;
    }
    if (!tplTitle.trim()) {
      alert("Please enter a template title.");
      return;
    }

    const selectedRetreat = retreats.find(r => r.id === tplRetreatId);
    const templateId = editingTemplateId || `tpl_${tplRetreatId}_${Date.now()}`;

    const templateMetadata = {
      id: templateId,
      retreatId: tplRetreatId,
      retreatTitle: selectedRetreat?.title || 'SKY Retreat',
      templateName: tplTitle.trim(),
      width: Number(tplWidth),
      height: Number(tplHeight),
      qrBox: { 
        x: Number(qrX), 
        y: Number(qrY), 
        size: Number(qrSize),
        bgColor: qrBgColor,
        fgColor: qrFgColor,
        hasShadow: Boolean(qrHasShadow),
        shadowColor: qrShadowColor
      },
      shortlinkText: { 
        x: Number(textX), 
        y: Number(textY), 
        fontSize: Number(textSize), 
        color: textColor,
        fontFamily: textFontFamily,
        hasShadow: Boolean(textHasShadow),
        shadowColor: textShadowColor
      },
      updatedAt: new Date().toISOString(),
      createdAt: editingTemplateId ? (flyerTemplates.find(t => t.id === editingTemplateId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    let savedParentRecord = { ...templateMetadata };

    if (isFirebaseConfigured && db) {
      try {
        const chunkResult = await saveFlyerTemplateWithChunks(db, templateMetadata, tplImageBase64);
        savedParentRecord = { 
          ...templateMetadata, 
          thumbnailBase64: chunkResult.thumbnailBase64, 
          chunkCount: chunkResult.chunkCount 
        };
        logDatabaseOperation(0, chunkResult.chunkCount + 1, 0);
      } catch (err) {
        console.warn("Firestore flyer template save error:", err);
      }
    }

    const filtered = flyerTemplates.filter(t => t.id !== templateId);
    const updated = [savedParentRecord, ...filtered];
    setFlyerTemplates(updated);
    localStorage.setItem('sky_flyer_templates', JSON.stringify(updated));

    // Stay on the current flyer template edit view and display saved indicator
    setEditingTemplateId(templateId);
    setFlyerStudioMessage({ type: 'success', text: `✨ Flyer template "${templateMetadata.templateName}" saved successfully!` });

    // Auto dismiss message indicator after 3.5 seconds
    setTimeout(() => {
      setFlyerStudioMessage({ type: '', text: '' });
    }, 3500);
  };

  const handleDeleteFlyerTemplate = async (id, tplName) => {
    if (window.confirm(`Delete flyer template "${tplName}"?`)) {
      const updated = flyerTemplates.filter(t => t.id !== id);
      setFlyerTemplates(updated);
      localStorage.setItem('sky_flyer_templates', JSON.stringify(updated));

      if (isFirebaseConfigured && db) {
        try {
          await deleteFlyerTemplateWithChunks(db, id);
          logDatabaseOperation(0, 0, 1);
        } catch (e) {
          console.warn("Firestore delete flyer template error:", e);
        }
      }

      setMessage({ type: 'success', text: `Deleted flyer template.` });
    }
  };

  // Sync registrations from Firestore
  useEffect(() => {
    let unsubscribe = null;
    if (isFirebaseConfigured && db) {
      try {
        const regRef = collection(db, 'registrations');
        unsubscribe = onSnapshot(regRef, (snapshot) => {
          const fetched = [];
          snapshot.forEach((d) => fetched.push({ id: d.id, ...d.data() }));
          setRegistrations(fetched);
          localStorage.setItem('sky_registrations', JSON.stringify(fetched));
          logDatabaseOperation(fetched.length, 0, 0);
        }, (err) => console.warn("Registrations metric sync notice:", err));
      } catch (e) {
        console.warn("Firestore registrations notice:", e);
      }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleAddVolunteer = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!newEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address.' });
      return;
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    if (authorizedEmails.includes(cleanEmail)) {
      setMessage({ type: 'error', text: `Email ${cleanEmail} is already authorized.` });
      return;
    }

    const success = await addVolunteerEmail(cleanEmail);
    if (success) {
      setMessage({ type: 'success', text: `Successfully authorized volunteer: ${cleanEmail}` });
      setNewEmail('');
      fetchServerVerifiedCounts();
    } else {
      setMessage({ type: 'error', text: 'Failed to authorize email.' });
    }
  };

  const handleRemoveVolunteer = async (emailToRemove) => {
    if (emailToRemove.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setMessage({ type: 'error', text: 'Cannot revoke Super Admin privileges.' });
      return;
    }

    if (window.confirm(`Are you sure you want to revoke volunteer access for ${emailToRemove}?`)) {
      const success = await removeVolunteerEmail(emailToRemove);
      if (success) {
        setMessage({ type: 'success', text: `Revoked access for ${emailToRemove}` });
        logDatabaseOperation(0, 0, 1);
        fetchServerVerifiedCounts();
      }
    }
  };

  const handleStartEditRetreat = (ret) => {
    setEditingRetreatId(ret.id);
    setTitle(ret.title || '');
    setStartDate(ret.startDate || '');
    setEndDate(ret.endDate || '');
    setTeachers(ret.teachers || '');
    setCourses(ret.courses || 'SKY Breath Meditation');
    setLocation(ret.location || '');
    setAddress(ret.address || '');
    setFridayTime(ret.fridayTime || ret.day1Time || '');
    setSaturdayTime(ret.saturdayTime || ret.day2Time || '');
    setSundayTime(ret.sundayTime || ret.day3Time || '');
    setMessage({ type: 'info', text: `Editing retreat record: ${ret.title}` });
  };

  const handleCancelEditRetreat = () => {
    setEditingRetreatId(null);
    setTitle('');
    setStartDate('');
    setEndDate('');
    setTeachers('');
    setCourses('SKY Breath Meditation');
    setLocation('');
    setAddress('');
    setFridayTime('');
    setSaturdayTime('');
    setSundayTime('');
  };

  const handleSaveRetreat = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate || !location.trim()) {
      setMessage({ type: 'error', text: 'Please fill in Title, Start Date, End Date, and Location.' });
      return;
    }

    if (editingRetreatId) {
      const existing = retreats.find(r => r.id === editingRetreatId) || {};
      const updatedRetreat = {
        ...existing,
        id: editingRetreatId,
        title: title.trim(),
        startDate,
        endDate,
        teachers: teachers.trim() || 'SKY Certified Teachers',
        courses: courses.trim() || 'SKY Breath Meditation',
        location: location.trim(),
        address: address.trim(),
        fridayTime: fridayTime.trim(),
        saturdayTime: saturdayTime.trim(),
        sundayTime: sundayTime.trim(),
        updatedAt: new Date().toISOString()
      };

      const updated = retreats.map(r => r.id === editingRetreatId ? updatedRetreat : r);
      setRetreats(updated);
      localStorage.setItem('sky_retreat_history', JSON.stringify(updated));

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'retreat_history', editingRetreatId), updatedRetreat, { merge: true });
          logDatabaseOperation(0, 1, 0);
        } catch (err) {
          console.warn("Firestore retreat update error:", err);
        }
      }

      handleCancelEditRetreat();
      setMessage({ type: 'success', text: `Successfully updated retreat: ${updatedRetreat.title}` });
      fetchServerVerifiedCounts();
    } else {
      const retreatId = `retreat-${Date.now()}`;
      const newRetreat = {
        id: retreatId,
        title: title.trim(),
        startDate,
        endDate,
        teachers: teachers.trim() || 'SKY Certified Teachers',
        courses: courses.trim() || 'SKY Breath Meditation',
        location: location.trim(),
        address: address.trim(),
        fridayTime: fridayTime.trim(),
        saturdayTime: saturdayTime.trim(),
        sundayTime: sundayTime.trim(),
        createdAt: new Date().toISOString()
      };

      const updated = [newRetreat, ...retreats];
      setRetreats(updated);
      localStorage.setItem('sky_retreat_history', JSON.stringify(updated));

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, 'retreat_history', retreatId), newRetreat);
          logDatabaseOperation(0, 1, 0);
        } catch (err) {
          console.warn("Firestore retreat save error:", err);
        }
      }

      handleCancelEditRetreat();
      setMessage({ type: 'success', text: `Successfully created retreat: ${newRetreat.title}` });
      fetchServerVerifiedCounts();
    }
  };

  const handleDeleteRetreat = async (id, retreatTitle) => {
    if (window.confirm(`Delete retreat record "${retreatTitle}"?`)) {
      if (editingRetreatId === id) {
        handleCancelEditRetreat();
      }
      const updated = retreats.filter(r => r.id !== id);
      setRetreats(updated);
      localStorage.setItem('sky_retreat_history', JSON.stringify(updated));

      if (isFirebaseConfigured && db) {
        try {
          await deleteDoc(doc(db, 'retreat_history', id));
          logDatabaseOperation(0, 0, 1);
        } catch (e) {
          console.warn("Firestore delete retreat error:", e);
        }
      }
      setMessage({ type: 'success', text: `Deleted retreat record.` });
      fetchServerVerifiedCounts();
    }
  };

  // DYNAMIC RESOURCE COMPUTATION ENGINE
  const dynamicStorage = calculateDynamicStorageBytes(registrations, retreats, authorizedEmails, serverCounts);
  
  const verifiedDailyReads = todayAudit.reads;
  const readsPercentage = ((verifiedDailyReads / SPARK_PLAN_QUOTAS.DAILY_READS_LIMIT) * 100).toFixed(2);

  const verifiedDailyWrites = todayAudit.writes;
  const writesPercentage = ((verifiedDailyWrites / SPARK_PLAN_QUOTAS.DAILY_WRITES_LIMIT) * 100).toFixed(2);

  const verifiedDailyDeletes = todayAudit.deletes;
  const deletesPercentage = ((verifiedDailyDeletes / SPARK_PLAN_QUOTAS.DAILY_DELETES_LIMIT) * 100).toFixed(2);

  const dynamicEgress = calculateDynamicEgress(verifiedDailyReads, dynamicStorage.avgRegDocBytes);

  return (
    <div style={{ padding: '3.5rem 0 6rem 0' }}>
      <div className="container">
        
        {/* Admin Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 800, lineHeight: 1.25, color: 'var(--text-main)' }}>UIUC Campus Administration & Monitoring</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
              Authenticated Super Admin: <strong style={{ color: 'var(--sky-blue)' }}>{currentUser?.email}</strong>
            </p>
          </div>

          <Link to="/volunteer" className="btn btn-primary" style={{ padding: '0.8rem 1.35rem', whiteSpace: 'nowrap' }}>
            <HeartHandshake size={18} /> Open Volunteer Portal <ArrowRight size={16} />
          </Link>
        </div>

        {/* Status Message Alert */}
        {message.text && (
          <div style={{
            background: message.type === 'success' ? '#DCFCE7' : '#FEF2F2',
            border: `1px solid ${message.type === 'success' ? '#86EFAC' : '#F87171'}`,
            color: message.type === 'success' ? '#166534' : '#DC2626',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span style={{ fontWeight: 600 }}>{message.text}</span>
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
          marginBottom: '2.5rem',
          overflowX: 'auto',
          paddingBottom: '0.35rem',
          WebkitOverflowScrolling: 'touch'
        }}>
          <button 
            onClick={() => setActiveTab('volunteers')}
            style={{
              padding: '0.8rem 1.25rem',
              background: activeTab === 'volunteers' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'volunteers' ? '3px solid var(--sky-blue)' : '3px solid transparent',
              color: activeTab === 'volunteers' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <UserPlus size={18} color={activeTab === 'volunteers' ? 'var(--sky-blue)' : 'var(--text-muted)'} />
            Volunteer Access ({authorizedEmails.length})
          </button>

          <button 
            onClick={() => setActiveTab('retreats')}
            style={{
              padding: '0.8rem 1.25rem',
              background: activeTab === 'retreats' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'retreats' ? '3px solid var(--sky-sun)' : '3px solid transparent',
              color: activeTab === 'retreats' ? '#B45309' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <Calendar size={18} color={activeTab === 'retreats' ? '#B45309' : 'var(--text-muted)'} />
            Retreat Management ({retreats.length})
          </button>

          <button 
            onClick={() => setActiveTab('groups')}
            style={{
              padding: '0.8rem 1.25rem',
              background: activeTab === 'groups' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'groups' ? '3px solid var(--sky-blue)' : '3px solid transparent',
              color: activeTab === 'groups' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <Users size={18} color={activeTab === 'groups' ? 'var(--sky-blue)' : 'var(--text-muted)'} />
            Group Assignments
          </button>

          <button 
            onClick={() => setActiveTab('emails')}
            style={{
              padding: '0.8rem 1.25rem',
              background: activeTab === 'emails' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'emails' ? '3px solid var(--sky-blue)' : '3px solid transparent',
              color: activeTab === 'emails' ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <Mail size={18} color={activeTab === 'emails' ? 'var(--sky-blue)' : 'var(--text-muted)'} />
            Auto Email Dispatch
          </button>

          <button 
            onClick={() => setActiveTab('flyer_templates')}
            style={{
              padding: '0.8rem 1.25rem',
              background: activeTab === 'flyer_templates' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'flyer_templates' ? '3px solid var(--illini-orange)' : '3px solid transparent',
              color: activeTab === 'flyer_templates' ? '#C2410C' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <FileText size={18} color={activeTab === 'flyer_templates' ? '#C2410C' : 'var(--text-muted)'} />
            Flyer Templates ({flyerTemplates.length})
          </button>

          <button 
            onClick={() => setActiveTab('campaign_analytics')}
            style={{
              padding: '0.8rem 1.25rem',
              background: activeTab === 'campaign_analytics' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'campaign_analytics' ? '3px solid var(--sky-sun)' : '3px solid transparent',
              color: activeTab === 'campaign_analytics' ? '#B45309' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <BarChart3 size={18} color={activeTab === 'campaign_analytics' ? '#B45309' : 'var(--text-muted)'} />
            Campaign Scan Analytics
          </button>

          <button 
            onClick={() => setActiveTab('usage')}
            style={{
              padding: '0.8rem 1.25rem',
              background: activeTab === 'usage' ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: activeTab === 'usage' ? '3px solid #10B981' : '3px solid transparent',
              color: activeTab === 'usage' ? '#166534' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            <Activity size={18} color={activeTab === 'usage' ? '#10B981' : 'var(--text-muted)'} />
            Cloud Usage & Limits
          </button>
        </div>

        {/* TAB 1: VOLUNTEER ACCESS MANAGEMENT */}
        {activeTab === 'volunteers' && (
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
        )}

        {/* TAB 1: SCHEDULE RETREATS & RETREAT HISTORY */}
        {activeTab === 'retreats' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem' }}>
            
            <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Calendar size={22} color="var(--sky-blue)" />
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    {editingRetreatId ? 'Edit Retreat Record' : 'Create New Retreat Record'}
                  </h2>
                </div>
                {editingRetreatId && (
                  <span className="badge badge-sun" style={{ fontSize: '0.7rem' }}>
                    <Edit3 size={12} style={{ display: 'inline', marginRight: '3px' }} /> EDITING MODE
                  </span>
                )}
              </div>

              {editingRetreatId && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--sky-sun-light)',
                  border: '1px solid rgba(250, 188, 29, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Editing: <strong style={{ color: 'var(--text-main)' }}>{title || 'Selected Retreat'}</strong></span>
                  <button 
                    type="button" 
                    onClick={handleCancelEditRetreat} 
                    style={{ background: 'none', border: 'none', color: '#B45309', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    Reset to Create New
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveRetreat} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>RETREAT TITLE *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. SKY Happiness Retreat | Fall 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>START DATE *</label>
                    <input 
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>END DATE *</label>
                    <input 
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>TEACHERS / INSTRUCTORS</label>
                    <input 
                      type="text"
                      placeholder="Facilitators"
                      value={teachers}
                      onChange={(e) => setTeachers(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>VENUE & ROOM #</label>
                    <input 
                      type="text"
                      placeholder="e.g. Sidney Lu Mechanical Engineering Building, Room 2100"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>STREET ADDRESS (OPTIONAL)</label>
                  <input 
                    type="text"
                    placeholder="e.g. 1206 W Green St, Urbana, IL 61801"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>COURSE / WORKSHOP TYPE</label>
                  <input 
                    type="text"
                    placeholder="e.g. SKY Breath Meditation"
                    value={courses}
                    onChange={(e) => setCourses(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Session Timings Configuration */}
                <div style={{
                  background: 'var(--sky-blue-subtle)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(31, 116, 241, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🕒 Daily Session Timings (Used in Cards & Email Templates)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAY 1 (FRIDAY) TIME</label>
                      <input 
                        type="text"
                        placeholder="6:30 PM – 9:30 PM"
                        value={fridayTime}
                        onChange={(e) => setFridayTime(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAY 2 (SATURDAY) TIME</label>
                      <input 
                        type="text"
                        placeholder="10:00 AM – 2:00 PM"
                        value={saturdayTime}
                        onChange={(e) => setSaturdayTime(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>DAY 3 (SUNDAY) TIME</label>
                      <input 
                        type="text"
                        placeholder="10:00 AM – 2:00 PM"
                        value={sundayTime}
                        onChange={(e) => setSundayTime(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>

                {editingRetreatId ? (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      onClick={handleCancelEditRetreat} 
                      className="btn btn-secondary" 
                      style={{ flex: 1, padding: '0.85rem', gap: '0.4rem' }}
                    >
                      <X size={16} /> Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-sun" 
                      style={{ flex: 2, padding: '0.85rem', gap: '0.4rem' }}
                    >
                      <Save size={16} /> Save Changes
                    </button>
                  </div>
                ) : (
                  <button type="submit" className="btn btn-sun" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}>
                    <Plus size={16} /> Create Retreat Record
                  </button>
                )}
              </form>
            </div>

            <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
                MANAGED RETREAT RECORDS ({retreats.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto' }}>
                {retreats.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 1rem' }}>
                    No retreat records found. Use the form to create your first retreat.
                  </div>
                ) : (
                  retreats.map((ret) => {
                    const isUpcoming = ret.endDate >= todayStr;
                    const isCurrentlyEditing = editingRetreatId === ret.id;
                    return (
                      <div key={ret.id} style={{
                        padding: '1rem 1.15rem',
                        background: isCurrentlyEditing ? 'var(--sky-sun-light)' : '#F8FAFC',
                        borderRadius: 'var(--radius-sm)',
                        border: isCurrentlyEditing 
                          ? '1px solid var(--sky-sun)' 
                          : (isUpcoming ? '1px solid var(--sky-blue)' : '1px solid var(--border-color)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'var(--transition-fast)'
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{ret.title}</span>
                            <span className={`badge ${isUpcoming ? 'badge-sky' : 'badge-earth'}`} style={{ fontSize: '0.65rem' }}>
                              {isUpcoming ? 'UPCOMING' : 'PAST'}
                            </span>
                            {isCurrentlyEditing && (
                              <span className="badge badge-sun" style={{ fontSize: '0.65rem' }}>EDITING</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span>📅 {ret.startDate} to {ret.endDate}</span>
                            <span>•</span>
                            <span>📍 {ret.location || 'UIUC Campus'}{ret.address ? ` (${ret.address})` : ''}</span>
                          </div>
                          {ret.teachers && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              Instructors: {ret.teachers}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                          <button 
                            onClick={() => handleStartEditRetreat(ret)}
                            style={{
                              background: isCurrentlyEditing ? 'var(--sky-sun-light)' : '#FFFFFF',
                              border: isCurrentlyEditing ? '1px solid var(--sky-sun)' : '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              color: isCurrentlyEditing ? '#B45309' : 'var(--text-main)',
                              cursor: 'pointer',
                              padding: '0.35rem 0.65rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'var(--transition-fast)'
                            }}
                            title="Edit Retreat Data"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteRetreat(ret.id, ret.title)}
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #F87171',
                              borderRadius: 'var(--radius-sm)',
                              color: '#DC2626',
                              cursor: 'pointer',
                              padding: '0.35rem 0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'var(--transition-fast)'
                            }}
                            title="Delete Retreat"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: RETREAT PARTICIPANT GROUP ASSIGNMENTS */}
        {activeTab === 'groups' && (
          <GroupAssignmentTab
            retreats={retreats}
            registrations={registrations}
            setRegistrations={setRegistrations}
            authorizedEmails={authorizedEmails}
            selectedRetreatId={selectedRetreatId}
            onSaveRetreat={async (retreatId, updatedFields) => {
              const updated = retreats.map(r => r.id === retreatId ? { ...r, ...updatedFields } : r);
              setRetreats(updated);
              localStorage.setItem('sky_retreat_history', JSON.stringify(updated));
              if (isFirebaseConfigured && db) {
                try {
                  await setDoc(doc(db, 'retreat_history', retreatId), updatedFields, { merge: true });
                  logDatabaseOperation(0, 1, 0);
                } catch (err) {
                  console.warn("Retreat save error:", err);
                }
              }
            }}
          />
        )}

        {/* TAB 2.2: AUTO EMAIL DISPATCH TAB */}
        {activeTab === 'emails' && (
          <AutoEmailDispatchTab
            retreats={retreats}
            registrations={registrations}
            setRegistrations={setRegistrations}
            currentUser={currentUser}
            selectedRetreatId={selectedRetreatId}
          />
        )}

        {/* TAB 2.5: RETREAT & FLYER TEMPLATE MANAGER WITH VISUAL POSITION EDITOR */}
        {activeTab === 'flyer_templates' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
              
              {/* Left Column: Form & Interactive Sliders */}
              <form onSubmit={handleSaveFlyerTemplate} className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
                <div>
                  <span className="badge badge-sun" style={{ marginBottom: '0.5rem' }}>
                    <FileText size={13} /> Retreat Flyer Template Studio
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Upload & Configure Retreat Flyer
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Upload a flyer background image (Canva PNG/JPG) and visually position the QR code and shortlink text. Templates are strictly locked to the selected retreat.
                  </p>
                </div>

                {/* Retreat Selection Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--sky-blue)', marginBottom: '0.35rem' }}>
                    SELECT ASSOCIATED RETREAT *
                  </label>
                  <select 
                    required
                    value={tplRetreatId}
                    onChange={(e) => setTplRetreatId(e.target.value)}
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
                    <option value="">Select Retreat Target...</option>
                    {retreats.map(ret => (
                      <option key={ret.id} value={ret.id}>
                        {ret.title} ({ret.startDate} to {ret.endDate})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>TEMPLATE TITLE *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. ECEB Bulletin Board Poster"
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Image Upload Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    UPLOAD CANVA FLYER IMAGE (JPG / PNG RECOMMENDED) *
                  </label>
                  <div style={{ fontSize: '0.72rem', color: '#B45309', marginBottom: '0.45rem', opacity: 0.9 }}>
                    Tip: Compressed JPG or WebP formats are recommended to save storage space and load faster.
                  </div>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                </div>

                {/* Warning Banner when No Flyer Image Uploaded Yet */}
                {!tplImageBase64 && (
                  <div style={{ background: 'var(--sky-sun-light)', border: '1px solid rgba(250, 188, 29, 0.4)', color: '#B45309', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>Upload a flyer background image above to unlock position, font & styling controls.</span>
                  </div>
                )}

                {/* Fieldset disabling all sliders, inputs, and pickers until a flyer is uploaded */}
                <fieldset disabled={!tplImageBase64} style={{ border: 'none', padding: 0, margin: 0, opacity: tplImageBase64 ? 1 : 0.4, pointerEvents: tplImageBase64 ? 'auto' : 'none', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* QR Code Pixel Position & Appearance Styling Controls */}
                  <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--sky-blue)', marginBottom: '0.75rem' }}>
                      📐 QR CODE POSITION & CUSTOM APPEARANCE ({tplWidth}x{tplHeight}px)
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          <span>Horizontal X (0 - {tplWidth}px)</span> <strong>{qrX || 0} px</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="range" min="0" max={tplWidth} value={qrX || 0} onChange={(e) => setQrX(e.target.value)} style={{ flex: 1 }} />
                          <input type="number" min="0" max={tplWidth} value={qrX} onChange={(e) => setQrX(e.target.value)} onBlur={() => { if (qrX === '' || isNaN(qrX)) setQrX(0); }} style={{ width: '70px', padding: '0.25rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          <span>Vertical Y (0 - {tplHeight}px)</span> <strong>{qrY || 0} px</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="range" min="0" max={tplHeight} value={qrY || 0} onChange={(e) => setQrY(e.target.value)} style={{ flex: 1 }} />
                          <input type="number" min="0" max={tplHeight} value={qrY} onChange={(e) => setQrY(e.target.value)} onBlur={() => { if (qrY === '' || isNaN(qrY)) setQrY(0); }} style={{ width: '70px', padding: '0.25rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          <span>QR Code Size (10 - {Math.min(tplWidth, tplHeight)}px)</span> <strong>{qrSize || 0} px</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="range" min="10" max={Math.min(tplWidth, tplHeight)} value={qrSize || 10} onChange={(e) => setQrSize(e.target.value)} style={{ flex: 1 }} />
                          <input type="number" min="10" max={Math.min(tplWidth, tplHeight)} value={qrSize} onChange={(e) => setQrSize(e.target.value)} onBlur={() => { if (qrSize === '' || isNaN(qrSize)) setQrSize(10); }} style={{ width: '70px', padding: '0.25rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                        </div>
                      </div>

                      {/* QR Code Foreground & Background Colors */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem', width: '100%' }}>
                        <ColorPickerWithAlpha 
                          label="QR BG COLOR" 
                          value={qrBgColor} 
                          onChange={setQrBgColor} 
                        />
                        <ColorPickerWithAlpha 
                          label="QR CODE COLOR" 
                          value={qrFgColor} 
                          onChange={setQrFgColor} 
                        />
                      </div>

                      {/* Togglable QR Drop Shadow Effect */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#FFFFFF', padding: '0.65rem 0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={qrHasShadow} 
                            onChange={(e) => setQrHasShadow(e.target.checked)} 
                          />
                          Enable QR Code Drop Shadow Effect
                        </label>

                        {qrHasShadow && (
                          <div style={{ marginTop: '0.2rem' }}>
                            <ColorPickerWithAlpha 
                              label="QR SHADOW COLOR" 
                              value={qrShadowColor} 
                              onChange={setQrShadowColor} 
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Shortlink Text Position, Configurable Font Size, Font Picker & Togglable Shadow */}
                  <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#B45309', marginBottom: '0.75rem' }}>
                      ✏️ SHORTLINK TEXT POSITION, FONT & EFFECTS
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          <span>Text Horizontal X (0 - {tplWidth}px)</span> <strong>{textX || 0} px</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="range" min="0" max={tplWidth} value={textX || 0} onChange={(e) => setTextX(e.target.value)} style={{ flex: 1 }} />
                          <input type="number" min="0" max={tplWidth} value={textX} onChange={(e) => setTextX(e.target.value)} onBlur={() => { if (textX === '' || isNaN(textX)) setTextX(0); }} style={{ width: '70px', padding: '0.25rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                          <span>Text Vertical Y (0 - {tplHeight}px)</span> <strong>{textY || 0} px</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="range" min="0" max={tplHeight} value={textY || 0} onChange={(e) => setTextY(e.target.value)} style={{ flex: 1 }} />
                          <input type="number" min="0" max={tplHeight} value={textY} onChange={(e) => setTextY(e.target.value)} onBlur={() => { if (textY === '' || isNaN(textY)) setTextY(0); }} style={{ width: '70px', padding: '0.25rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }} />
                        </div>
                      </div>

                      {/* Font Size & Font Family */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 700 }}>
                            FONT SIZE (px)
                          </label>
                          <input 
                            type="number" 
                            step="any"
                            min="0" 
                            value={textSize} 
                            onChange={(e) => setTextSize(e.target.value)} 
                            onBlur={() => { if (textSize === '' || isNaN(textSize)) setTextSize(0); }}
                            style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '0.85rem' }} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 700 }}>FONT FAMILY</label>
                          <select 
                            value={textFontFamily}
                            onChange={(e) => setTextFontFamily(e.target.value)}
                            style={{ width: '100%', padding: '0.45rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontSize: '0.8rem' }}
                          >
                            <option value="'Source Sans 3', sans-serif">Source Sans 3</option>
                            <option value="'Merriweather', serif">Merriweather Serif</option>
                            <option value="'Inter', sans-serif">Inter</option>
                            <option value="'Roboto', sans-serif">Roboto</option>
                            <option value="'Montserrat', sans-serif">Montserrat</option>
                            <option value="'Courier New', monospace">Monospace</option>
                          </select>
                        </div>
                      </div>

                      {/* Text Color */}
                      <div style={{ marginTop: '0.25rem', width: '100%' }}>
                        <ColorPickerWithAlpha 
                          label="TEXT COLOR (Default Blue)" 
                          value={textColor} 
                          onChange={setTextColor} 
                        />
                      </div>

                      {/* Togglable Drop Shadow Effect */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#FFFFFF', padding: '0.65rem 0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={textHasShadow} 
                            onChange={(e) => setTextHasShadow(e.target.checked)} 
                          />
                          Enable Text Drop Shadow Effect
                        </label>

                        {textHasShadow && (
                          <div style={{ marginTop: '0.2rem' }}>
                            <ColorPickerWithAlpha 
                              label="TEXT SHADOW COLOR" 
                              value={textShadowColor} 
                              onChange={setTextShadowColor} 
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </fieldset>

                {/* Saved Pop-Up Toast Indicator */}
                {flyerStudioMessage.text && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: flyerStudioMessage.type === 'success' ? '#DCFCE7' : '#FEF2F2',
                    color: flyerStudioMessage.type === 'success' ? '#166534' : '#DC2626',
                    border: flyerStudioMessage.type === 'success' ? '1px solid #86EFAC' : '1px solid #F87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <CheckCircle2 size={18} />
                    {flyerStudioMessage.text}
                  </div>
                )}

                {/* Submit / Update Button */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700 }}>
                    {editingTemplateId ? 'Update Flyer Template' : 'Save Retreat Flyer Template'}
                  </button>

                  {editingTemplateId && (
                    <button type="button" onClick={handleCancelEdit} className="btn btn-secondary" style={{ padding: '0.85rem' }}>
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {/* Right Column: Live Interactive Visual Position Editor Preview */}
              <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'sticky', top: '90px', alignSelf: 'start', zIndex: 20, width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-md)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sky-blue)', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Live Admin Position Adjuster Preview ({tplWidth}x{tplHeight}px Canvas)
                </div>

                {/* Zoom & Pan Control Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', background: '#F8FAFC', padding: '0.3rem 0.6rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                  <button 
                    type="button" 
                    onClick={() => setPreviewZoom(z => Math.min(4, parseFloat((z + 0.2).toFixed(1))))}
                    title="Zoom In"
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0.3rem', fontWeight: 700 }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--sky-blue)', fontWeight: 700, fontFamily: 'monospace', minWidth: '40px' }}>
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setPreviewZoom(z => Math.max(0.5, parseFloat((z - 0.2).toFixed(1))))}
                    title="Zoom Out"
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0.3rem', fontWeight: 700 }}
                  >
                    -
                  </button>
                  <div style={{ width: '1px', height: '12px', background: 'var(--border-color)', margin: '0 0.2rem' }} />
                  <button 
                    type="button" 
                    onClick={() => { setPreviewZoom(1); setPreviewPan({ x: 0, y: 0 }); }}
                    title="Reset Zoom & Pan"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Reset
                  </button>
                </div>

                {/* Helpful Instruction Tip */}
                {tplImageBase64 && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    💡 Scroll wheel to zoom | Drag QR code or text to position
                  </div>
                )}

                {/* Outer Zoom/Pan Viewport */}
                <div 
                  ref={previewViewportRef}
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    overflow: 'hidden',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: '#F8FAFC',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: activeDragItem === 'pan' ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={(e) => handlePreviewMouseDown(e, 'pan')}
                >
                  <div 
                    ref={previewCardRef}
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: `${tplWidth} / ${tplHeight}`,
                      background: tplImageBase64 ? `url(${tplImageBase64}) 0 0 / 100% 100% no-repeat` : '#FFFFFF',
                      containerType: 'inline-size',
                      transform: `scale(${previewZoom}) translate(${previewPan.x / previewZoom}px, ${previewPan.y / previewZoom}px)`,
                      transformOrigin: 'center center',
                      transition: activeDragItem ? 'none' : 'transform 0.1s ease-out',
                      userSelect: 'none'
                    }}
                  >
                    
                    {!tplImageBase64 ? (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>
                        <FileText size={36} color="var(--sky-blue)" style={{ marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.85rem' }}>Upload a flyer background image to preview live QR code and text placement</span>
                      </div>
                    ) : (
                      <>
                        {/* Interactive Drag & Drop QR Code Box */}
                        <div 
                          onMouseDown={(e) => handlePreviewMouseDown(e, 'qr')}
                          title="Drag to position QR Code"
                          style={{
                            position: 'absolute',
                            left: `${(parsePixelX(qrX, tplWidth / 2) / tplWidth) * 100}%`,
                            top: `${(parsePixelY(qrY, tplHeight / 2) / tplHeight) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            width: `${(parsePixelSize(qrSize, tplWidth * 0.125) / tplWidth) * 100}%`,
                            aspectRatio: '1 / 1',
                            background: qrBgColor === 'transparent' ? 'none' : (qrBgColor || '#FFFFFF'),
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: (qrHasShadow && qrBgColor !== 'transparent') ? `0 4px 15px ${qrShadowColor || 'rgba(0,0,0,0.15)'}` : 'none',
                            filter: (qrHasShadow && qrBgColor === 'transparent') ? `drop-shadow(0 4px 8px ${qrShadowColor || 'rgba(0,0,0,0.15)'})` : 'none',
                            outline: activeDragItem === 'qr' ? '2px solid var(--sky-blue)' : '1px dashed rgba(35,39,95,0.3)',
                            cursor: 'move',
                            pointerEvents: 'auto',
                            boxSizing: 'border-box',
                            zIndex: 10
                          }}
                        >
                          {adminDummyQrUrl ? (
                            <img 
                              src={adminDummyQrUrl} 
                              alt="Dummy QR Code (skyuiuc.org)" 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'contain',
                                pointerEvents: 'none'
                              }} 
                            />
                          ) : (
                            <>
                              <QrCode size={24} color={qrFgColor || '#161942'} style={{ pointerEvents: 'none' }} />
                              <span style={{ fontSize: '0.55rem', fontWeight: 800, color: qrFgColor || '#161942', marginTop: '2px', pointerEvents: 'none' }}>QR CODE</span>
                            </>
                          )}
                        </div>

                        {/* Interactive Drag & Drop Shortlink Text */}
                        <div 
                          onMouseDown={(e) => handlePreviewMouseDown(e, 'text')}
                          title="Drag to position Shortlink Text"
                          style={{
                            position: 'absolute',
                            left: `${(parsePixelX(textX, tplWidth / 2) / tplWidth) * 100}%`,
                            top: `${(parsePixelY(textY, tplHeight * 0.55) / tplHeight) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            color: textColor || '#000000',
                            fontFamily: textFontFamily || "'Source Sans 3', sans-serif",
                            fontWeight: 800,
                            fontSize: `calc(${(parsePixelSize(textSize, Math.round(tplHeight * 0.035)) / tplWidth) * 100}cqw)`,
                            textShadow: textHasShadow ? `0 2px 6px ${textShadowColor || 'rgba(0,0,0,0.2)'}` : 'none',
                            whiteSpace: 'nowrap',
                            outline: activeDragItem === 'text' ? '2px solid var(--sky-sun)' : '1px dashed rgba(35,39,95,0.3)',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            cursor: 'move',
                            pointerEvents: 'auto',
                            zIndex: 10
                          }}
                        >
                          skyuiuc.org/demo
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Active Retreat: <strong style={{ color: 'var(--text-main)' }}>{retreats.find(r => r.id === tplRetreatId)?.title || 'None Selected'}</strong>
                </div>
              </div>

            </div>

            {/* SAVED RETREAT FLYER TEMPLATES ROSTER */}
            <div className="glass-card" style={{ padding: '1.75rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="var(--sky-blue)" /> Configured Retreat Flyer Templates ({flyerTemplates.length})
              </h3>

              {flyerTemplates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', background: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
                  No flyer templates created yet. Use the editor above to upload background images and configure QR code positioning per retreat.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {flyerTemplates.map((tpl) => (
                    <div key={tpl.id} style={{
                      background: '#F8FAFC',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '70px',
                        height: '90px',
                        background: tpl.thumbnailBase64 ? `url(${tpl.thumbnailBase64}) center/cover no-repeat` : (tpl.bgImageUrl ? `url(${tpl.bgImageUrl}) center/cover no-repeat` : '#FFFFFF'),
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        flexShrink: 0
                      }}></div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{tpl.templateName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 600, marginTop: '0.15rem' }}>
                          Retreat: {tpl.retreatTitle}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          QR: {tpl.qrBox?.x}px, {tpl.qrBox?.y}px | Text: {tpl.shortlinkText?.x || 600}px, {tpl.shortlinkText?.y || 1450}px
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleStartEditTemplate(tpl)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.2rem' }}
                          title="Edit Template"
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteFlyerTemplate(tpl.id, tpl.templateName)}
                          style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '0.4rem' }}
                          title="Delete Flyer Template"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2.8: CAMPAIGN SCAN & REGISTRATION REFERRAL ANALYTICS DASHBOARD */}
        {activeTab === 'campaign_analytics' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Top Metric Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total QR Code Scans
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <QrCode size={26} color="var(--sky-blue)" />
                  {campGrandScans}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Selected date range total
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Referral Registrations
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={26} color="#16A34A" />
                  {campGrandConversions}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Applications from QR codes
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Overall Conversion Rate
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={26} color="#B45309" />
                  {campGrandScans > 0 ? ((campGrandConversions / campGrandScans) * 100).toFixed(1) : '0.0'}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Registrations per scan ratio
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7E22CE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Top Outreach Channel
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {campTagTotals[0] ? `#${campTagTotals[0].tag}` : 'None Yet'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  {campTagTotals[0] ? `${campTagTotals[0].totalScans} scans • ${campTagTotals[0].totalConversions} registered` : 'Create shortcodes in Volunteer Portal'}
                </div>
              </div>
            </div>

            {/* DYNAMIC HISTORIC GRAPH & DATE RANGE PICKERS */}
            <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={20} color="var(--sky-blue)" /> Dynamic Day-by-Day Scan & Conversion Trends
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Track daily poster scans vs application completions over any custom historical window.
                  </p>
                </div>

                {/* Date Filter & Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {[7, 14, 30, 90].map(days => {
                      const startStr = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                      const endStr = new Date().toISOString().split('T')[0];
                      const isSelected = campStartDate === startStr && campEndDate === endStr;
                      return (
                        <button
                          key={days}
                          onClick={() => { setCampStartDate(startStr); setCampEndDate(endStr); }}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid var(--sky-blue)' : '1px solid var(--border-color)',
                            background: isSelected ? 'var(--sky-blue-subtle)' : '#F8FAFC',
                            color: isSelected ? 'var(--sky-blue)' : 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {days}D
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <Calendar size={14} color="var(--sky-blue)" />
                    <input 
                      type="date" 
                      value={campStartDate} 
                      onChange={(e) => setCampStartDate(e.target.value)} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none' }} 
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to</span>
                    <input 
                      type="date" 
                      value={campEndDate} 
                      onChange={(e) => setCampEndDate(e.target.value)} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none' }} 
                    />
                  </div>
                </div>
              </div>

              {/* Day-by-Day Graph Area */}
              {campDailyMetrics.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No QR scans recorded for the selected date timeframe.
                </div>
              ) : (
                <div>
                  {/* Hover Tooltip Indicator */}
                  <div style={{ height: '24px', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    {hoveredCampDay ? (
                      <span>
                        📅 <strong>{hoveredCampDay.date}</strong>: <span style={{ color: 'var(--sky-blue)' }}>{hoveredCampDay.scans} Scans</span> • <span style={{ color: '#16A34A' }}>{hoveredCampDay.conversions} Registered</span> ({hoveredCampDay.scans > 0 ? ((hoveredCampDay.conversions / hoveredCampDay.scans) * 100).toFixed(1) : 0}% conversion)
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Hover over graph bars to inspect daily scans and referral registrations</span>
                    )}
                  </div>

                  {/* Dual Bar Chart (Scans & Conversions) */}
                  <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                    <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {/* Gridlines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => (
                        <line
                          key={idx}
                          x1="0"
                          y1={200 * (1 - pct)}
                          x2="100%"
                          y2={200 * (1 - pct)}
                          stroke="rgba(35, 39, 95, 0.08)"
                          strokeDasharray="4 4"
                        />
                      ))}

                      {/* Render Dual Bars per Day */}
                      {(() => {
                        const maxVal = Math.max(5, ...campDailyMetrics.map(m => Math.max(m.scans, m.conversions)));
                        return campDailyMetrics.map((item, idx) => {
                          const scanHeight = Math.max(4, (item.scans / maxVal) * 180);
                          const convHeight = Math.max(0, (item.conversions / maxVal) * 180);
                          const xPct = (idx / (campDailyMetrics.length - 1 || 1)) * 90 + 5;
                          const barWidthPct = Math.min(4, 70 / campDailyMetrics.length);

                          return (
                            <g 
                              key={item.date} 
                              onMouseEnter={() => setHoveredCampDay(item)}
                              onMouseLeave={() => setHoveredCampDay(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              {/* Scan Bar (Blue) */}
                              <rect
                                x={`${xPct - barWidthPct}%`}
                                y={200 - scanHeight}
                                width={`${barWidthPct}%`}
                                height={scanHeight}
                                rx="2"
                                fill={hoveredCampDay?.date === item.date ? '#1F74F1' : '#60A5FA'}
                                opacity={0.85}
                              />
                              {/* Conversion Bar (Green) */}
                              {convHeight > 0 && (
                                <rect
                                  x={`${xPct}%`}
                                  y={200 - convHeight}
                                  width={`${barWidthPct}%`}
                                  height={convHeight}
                                  rx="2"
                                  fill={hoveredCampDay?.date === item.date ? '#16A34A' : '#34D399'}
                                />
                              )}
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>

                  {/* Legend & X-Axis Labels */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{campDailyMetrics[0]?.date}</span>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--sky-blue)', fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', background: 'var(--sky-blue)', borderRadius: '2px' }} /> Daily Scans
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16A34A', fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', background: '#16A34A', borderRadius: '2px' }} /> Referral Registrations
                      </span>
                    </div>
                    <span>{campDailyMetrics[campDailyMetrics.length - 1]?.date}</span>
                  </div>
                </div>
              )}
            </div>

            {/* CAMPAIGN SHORTCODE OUTREACH PERFORMANCE ROSTER & MULTI-CHANNEL COMPARATIVE GRAPH */}
            <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <QrCode size={20} color="var(--sky-blue)" /> Campaign Outreach Channel Performance ({campTagTotals.length})
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    Aggregated scan & registration conversion rates, plus side-by-side day-by-day channel performance trends.
                  </p>
                </div>

                {/* Metric Selector for Channel Comparison */}
                <div style={{ display: 'flex', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setCompareMetric('scans')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: compareMetric === 'scans' ? 'var(--sky-blue)' : 'transparent',
                      color: compareMetric === 'scans' ? '#FFFFFF' : 'var(--text-main)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Compare Daily Scans
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMetric('conversions')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: compareMetric === 'conversions' ? '#10B981' : 'transparent',
                      color: compareMetric === 'conversions' ? '#FFFFFF' : 'var(--text-main)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Compare Registrations
                  </button>
                </div>
              </div>

              {/* MULTI-CHANNEL COMPARATIVE DAY-BY-DAY GRAPH */}
              {campDailyMetrics.length > 0 && campTagTotals.length > 0 && (
                <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    📈 Channel Performance Trends Over Time ({compareMetric === 'scans' ? 'Daily Scans' : 'Daily Referral Registrations'})
                  </div>

                  {/* Channel Badges Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
                    {campTagTotals.map((camp, idx) => {
                      const colors = ['#1F74F1', '#B45309', '#166534', '#7E22CE', '#DB2777', '#0891B2', '#C2410C'];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={camp.tag} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#FFFFFF', padding: '0.25rem 0.55rem', borderRadius: '15px', border: `1px solid ${color}44` }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>#{camp.tag}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Multi-Channel Graph SVG with Connected Trendlines */}
                  <div style={{ width: '100%', height: '180px', position: 'relative' }}>
                    <svg viewBox="0 0 1000 180" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {[0, 0.33, 0.66, 1].map((pct, idx) => (
                        <line
                          key={idx}
                          x1="0"
                          y1={160 * (1 - pct)}
                          x2="1000"
                          y2={160 * (1 - pct)}
                          stroke="rgba(35, 39, 95, 0.08)"
                          strokeDasharray="4 4"
                        />
                      ))}

                      {(() => {
                        const colors = ['#1F74F1', '#B45309', '#166534', '#7E22CE', '#DB2777', '#0891B2', '#C2410C'];
                        let maxChannelVal = 5;
                        campDailyMetrics.forEach(d => {
                          if (d.channels) {
                            Object.values(d.channels).forEach(c => {
                              const val = compareMetric === 'scans' ? (c.scans || 0) : (c.conversions || 0);
                              if (val > maxChannelVal) maxChannelVal = val;
                            });
                          }
                        });

                        return campTagTotals.map((camp, tagIdx) => {
                          const color = colors[tagIdx % colors.length];
                          const points = campDailyMetrics.map((dayItem, dayIdx) => {
                            const val = compareMetric === 'scans'
                              ? (dayItem.channels?.[camp.tag]?.scans || 0)
                              : (dayItem.channels?.[camp.tag]?.conversions || 0);
                            const xPx = (dayIdx / (campDailyMetrics.length - 1 || 1)) * 900 + 50;
                            const yPx = 160 - Math.max(0, (val / maxChannelVal) * 140);
                            return { xPx, yPx, val, date: dayItem.date };
                          });

                          const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.xPx.toFixed(1)} ${pt.yPx.toFixed(1)}`).join(' ');

                          return (
                            <g key={camp.tag}>
                              <path
                                d={pathD}
                                fill="none"
                                stroke={color}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.95}
                              />
                              {points.map((pt, i) => (
                                <circle
                                  key={i}
                                  cx={pt.xPx.toFixed(1)}
                                  cy={pt.yPx.toFixed(1)}
                                  r={pt.val > 0 ? "5" : "2.5"}
                                  fill={color}
                                  stroke="#FFFFFF"
                                  strokeWidth="2"
                                >
                                  <title>{`#${camp.tag} (${pt.date}): ${pt.val} ${compareMetric}`}</title>
                                </circle>
                              ))}
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                </div>
              )}

              {campTagTotals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', background: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
                  No campaign scan data recorded for this date timeframe.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: '#F8FAFC' }}>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>CAMPAIGN TAG</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>SCANS</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>REGISTRATIONS</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>CONVERSION %</th>
                        <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>LAST SCANNED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campTagTotals.map((camp) => {
                        const convRate = camp.totalScans > 0 ? ((camp.totalConversions / camp.totalScans) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={camp.tag} style={{ borderBottom: '1px solid rgba(35, 39, 95, 0.06)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#B45309' }}>
                              #{camp.tag}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--sky-blue)', textAlign: 'center' }}>
                              {camp.totalScans}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#16A34A', textAlign: 'center' }}>
                              {camp.totalConversions}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                              <span className="badge badge-sun" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                {convRate}%
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              {camp.lastScannedAt ? new Date(camp.lastScannedAt).toLocaleString() : 'N/A'}
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

        {/* TAB 3: VISUAL CLOUD USAGE & INTERACTIVE TREND CHARTS */}
        {activeTab === 'usage' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Visual Quotas Progress Bar Container */}
            <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Resource Consumption & Free Quotas
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Real-time atomic counters and free Spark Plan quota thresholds.
                  </p>
                </div>

                <a 
                  href="https://console.firebase.google.com/project/skyatuiuc-web/usage" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.5rem' }}
                >
                  <ExternalLink size={15} /> Open Firebase Usage Console ↗
                </a>
              </div>

              {/* Progress Bar 1: Firestore Database Storage */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={16} color="var(--sky-blue)" /> Cloud Firestore Storage
                  </span>
                  <span style={{ color: 'var(--sky-blue)' }}>{dynamicStorage.formattedStorage} / {dynamicStorage.formattedLimit} ({dynamicStorage.percentageOfLimit}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(1, Math.min(100, Number(dynamicStorage.percentageOfLimit)))}%`, height: '100%', background: 'linear-gradient(90deg, #1F74F1, #10B981)', borderRadius: '5px', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>

              {/* Progress Bar 2: Daily Document Reads */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={16} color="#B45309" /> Document Reads
                  </span>
                  <span style={{ color: '#B45309' }}>{verifiedDailyReads} / 50,000 daily ({readsPercentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(1, Math.min(100, Number(readsPercentage)))}%`, height: '100%', background: 'linear-gradient(90deg, #FABC1D, #10B981)', borderRadius: '5px', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>

              {/* Progress Bar 3: Daily Document Writes */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Server size={16} color="#16A34A" /> Document Writes
                  </span>
                  <span style={{ color: '#16A34A' }}>{verifiedDailyWrites} / 20,000 daily ({writesPercentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(1, Math.min(100, Number(writesPercentage)))}%`, height: '100%', background: '#10B981', borderRadius: '5px', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>

              {/* Progress Bar 4: Daily Document Deletes */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trash2 size={16} color="#DC2626" /> Document Deletes
                  </span>
                  <span style={{ color: '#DC2626' }}>{verifiedDailyDeletes} / 20,000 daily ({deletesPercentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(1, Math.min(100, Number(deletesPercentage)))}%`, height: '100%', background: '#EF4444', borderRadius: '5px', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>

              {/* Progress Bar 5: Outbound Network Egress Bandwidth */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} color="#166534" /> Outbound Egress Bandwidth
                  </span>
                  <span style={{ color: '#166534' }}>{dynamicEgress.formattedMonthlyEgress} / {dynamicEgress.formattedMonthlyLimit} monthly ({dynamicEgress.percentageOfLimit}%)</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(1, Math.min(100, Number(dynamicEgress.percentageOfLimit)))}%`, height: '100%', background: '#7FA842', borderRadius: '5px', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>

            </div>

            {/* LOCAL DATABASE BACKUP & DATA PORTABILITY CARD */}
            <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShieldCheck size={22} color="#16A34A" />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Database Backup & Data Export
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '680px', lineHeight: 1.5 }}>
                    Download complete copies of your retreat details, registrations, and system configurations directly to your local computer for safe keeping and analysis.
                  </p>
                </div>

                {backupSuccessMsg && (
                  <div style={{ background: '#DCFCE7', color: '#166534', padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #86EFAC' }}>
                    <CheckCircle2 size={16} /> {backupSuccessMsg}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                {/* Full Snapshot Button */}
                <button
                  type="button"
                  onClick={handleExportFullBackupJson}
                  className="btn"
                  style={{
                    background: 'var(--sky-blue-subtle)',
                    border: '1px solid rgba(31, 116, 241, 0.3)',
                    color: 'var(--text-main)',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--sky-blue)' }}>
                    <Download size={18} /> Full System Snapshot (.JSON)
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Includes all {registrations.length} registrations, {retreats.length} retreats, volunteers & flyer templates.
                  </span>
                </button>

                {/* Registrations CSV Button */}
                <button
                  type="button"
                  onClick={handleExportRegistrationsCsv}
                  className="btn"
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: '#B45309' }}>
                    <FileText size={18} /> Registrations & Roster (.CSV)
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Excel / Google Sheets format with names, contact info, fees, and attendance.
                  </span>
                </button>

                {/* Retreats JSON Button */}
                <button
                  type="button"
                  onClick={handleExportRetreatsJson}
                  className="btn"
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--sky-blue)' }}>
                    <Calendar size={18} /> Retreat History (.JSON)
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Dates, times, venues, instructors, and group configurations.
                  </span>
                </button>
              </div>
            </div>

            {/* INTERACTIVE MONTHLY BUCKET RESOURCE TREND CHART */}
            <ResourceUsageChart 
              logs={historicalAuditLogs}
              dateRangeDays={dateRangeDays}
              onRangeChange={(days) => setDateRangeDays(days)}
            />

          </div>
        )}

      </div>
    </div>
  );
}
