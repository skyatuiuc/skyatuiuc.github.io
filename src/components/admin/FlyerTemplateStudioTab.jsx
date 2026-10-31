import React, { useState, useEffect, useRef } from 'react';
import { db, isFirebaseConfigured } from '../../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import QRCode from 'qrcode';
import { saveFlyerTemplateWithChunks, loadFlyerTemplateImage, deleteFlyerTemplateWithChunks } from '../../services/flyerChunkService';
import { useRoster } from '../../context/RosterContext';
import ColorPickerWithAlpha from './ColorPickerWithAlpha';
import { getRetreatLabel } from '../../models/retreat';
import { colorToQrHex, parsePixel } from '../../utils/graphicExportUtils';
import { Trash2, CheckCircle2, AlertCircle, FileText, QrCode, Edit3 } from 'lucide-react';

// Admin tab: flyer template studio (upload artwork, position the QR code and shortlink text)
export default function FlyerTemplateStudioTab({ setMessage }) {
  const { retreats } = useRoster();

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
  }, [tplImageBase64, editingTemplateId]);

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

    setQrX(parsePixel(tpl.qrBox?.x, 600));
    setQrY(parsePixel(tpl.qrBox?.y, 800));
    setQrSize(parsePixel(tpl.qrBox?.size, 150));
    setQrBgColor(tpl.qrBox?.bgColor || 'transparent');
    setQrFgColor(tpl.qrBox?.fgColor || '#161942');
    setQrHasShadow(tpl.qrBox?.hasShadow ?? false);
    setQrShadowColor(tpl.qrBox?.shadowColor || '#000000');

    setTextX(parsePixel(tpl.shortlinkText?.x, 600));
    setTextY(parsePixel(tpl.shortlinkText?.y, 890));
    setTextSize(parsePixel(tpl.shortlinkText?.fontSize, Math.round((tpl.height || 1600) * 0.04)));
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
        } catch (e) {
          console.warn("Firestore delete flyer template error:", e);
        }
      }

      setMessage({ type: 'success', text: `Deleted flyer template.` });
    }
  };

  return (
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
                  {getRetreatLabel(ret)}
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
                background: '#FFFFFF',
                containerType: 'inline-size',
                transform: `scale(${previewZoom}) translate(${previewPan.x / previewZoom}px, ${previewPan.y / previewZoom}px)`,
                transformOrigin: 'center center',
                transition: activeDragItem ? 'none' : 'transform 0.1s ease-out',
                userSelect: 'none',
                overflow: 'hidden'
              }}
            >
              {tplImageBase64 && (
                <img 
                  src={tplImageBase64} 
                  alt="Template Background" 
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'fill', 
                    pointerEvents: 'none',
                    display: 'block' 
                  }} 
                />
              )}

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
                      left: `${(parsePixel(qrX, tplWidth / 2) / tplWidth) * 100}%`,
                      top: `${(parsePixel(qrY, tplHeight / 2) / tplHeight) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${(parsePixel(qrSize, tplWidth * 0.125) / tplWidth) * 100}%`,
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
                      left: `${(parsePixel(textX, tplWidth / 2) / tplWidth) * 100}%`,
                      top: `${(parsePixel(textY, tplHeight * 0.55) / tplHeight) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      color: textColor || '#000000',
                      fontFamily: textFontFamily || "'Source Sans 3', sans-serif",
                      fontWeight: 800,
                      fontSize: `calc(${(parsePixel(textSize, Math.round(tplHeight * 0.035)) / tplWidth) * 100}cqw)`,
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
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  background: '#F1F5F9',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(tpl.thumbnailBase64 || tpl.bgImageUrl) ? (
                    <img 
                      src={tpl.thumbnailBase64 || tpl.bgImageUrl} 
                      alt={tpl.templateName} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                    />
                  ) : (
                    <FileText size={20} color="var(--text-muted)" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{tpl.templateName}</div>
                  <div style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: 600, marginTop: '0.15rem' }}>
                    Retreat: {(() => { const ret = retreats.find(r => r.id === tpl.retreatId); return ret ? getRetreatLabel(ret) : tpl.retreatTitle; })()}
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
  );
}
