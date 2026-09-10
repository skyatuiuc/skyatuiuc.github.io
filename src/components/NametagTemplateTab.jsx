import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase/config';
import {
  Tag,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Type,
  RefreshCw
} from 'lucide-react';
import {
  saveNametagTemplateWithChunks,
  loadNametagTemplateImage,
  deleteNametagTemplateWithChunks,
  getNametagTemplates
} from '../services/nametagChunkService';
import { drawFittedTextOnCanvas } from '../utils/nametagPdfUtils';

// Helper: ColorPicker with Alpha
function ColorPickerWithAlpha({ label, value, onChange }) {
  const parseColor = (val) => {
    if (!val || val === 'transparent') return { hex: '#000000', alpha: 0 };
    if (val.startsWith('rgba') || val.startsWith('rgb')) {
      const match = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
      if (match) {
        const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
        const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
        return { hex: `#${r}${g}${b}`, alpha: a };
      }
    }
    if (val.startsWith('#')) {
      if (val.length === 9) {
        const hex = val.substring(0, 7);
        const aHex = val.substring(7, 9);
        const alpha = parseInt(aHex, 16) / 255;
        return { hex, alpha };
      }
      return { hex: val.substring(0, 7), alpha: 1 };
    }
    return { hex: '#161942', alpha: 1 };
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

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 700 }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#F8FAFC', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="color"
            value={hex}
            onChange={(e) => handleHexChange(e.target.value)}
            style={{ width: '28px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0, background: 'none' }}
          />
          <input
            type="text"
            value={hex.toUpperCase()}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) handleHexChange(val);
            }}
            style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.78rem', fontFamily: 'monospace', border: '1px solid var(--border-color)', borderRadius: '3px', color: 'var(--text-main)', background: '#FFFFFF' }}
          />
          <div style={{ width: '22px', height: '22px', borderRadius: '3px', border: '1px solid var(--border-color)', background: value }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ minWidth: '45px' }}>Opacity:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={alpha}
            onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--sky-blue)' }}
          />
          <span style={{ minWidth: '32px', textAlign: 'right', fontFamily: 'monospace' }}>
            {Math.round(alpha * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NametagTemplateTab() {
  // Saved templates from Firestore
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [studioToast, setStudioToast] = useState({ type: '', text: '' });

  // Form Fields
  const [title, setTitle] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [naturalWidth, setNaturalWidth] = useState(1800);
  const [naturalHeight, setNaturalHeight] = useState(1200);
  const [aspectRatio, setAspectRatio] = useState(1.5);

  // Physical Print Footprint
  const [footprintUnit, setFootprintUnit] = useState('in'); // 'in' | 'cm' | 'mm'
  const [footprintWidth, setFootprintWidth] = useState(3.0);
  const [footprintHeight, setFootprintHeight] = useState(2.0);

  // Text Box 1: First Name
  const [firstNameBox, setFirstNameBox] = useState({
    centerX: 900,
    centerY: 500,
    width: 1400,
    height: 350,
    maxFontSize: 80,
    fontFamily: "'Source Sans 3', sans-serif",
    color: '#161942',
    bold: true,
    hasShadow: false,
    shadowColor: 'rgba(0,0,0,0.3)',
    textAlign: 'center'
  });

  // Text Box 2: Team Name
  const [teamNameBox, setTeamNameBox] = useState({
    centerX: 900,
    centerY: 850,
    width: 1200,
    height: 200,
    maxFontSize: 44,
    fontFamily: "'Source Sans 3', sans-serif",
    color: '#D97706',
    bold: true,
    hasShadow: false,
    shadowColor: 'rgba(0,0,0,0.25)',
    textAlign: 'center'
  });

  // Preview & Canvas State
  const [showGuides, setShowGuides] = useState(true);
  const [sampleDataPreset, setSampleDataPreset] = useState('short'); // 'short' | 'long' | 'multi' | 'custom'
  const [customFirstName, setCustomFirstName] = useState('');
  const [customTeamName, setCustomTeamName] = useState('');
  const [activeDragBox, setActiveDragBox] = useState(null); // 'firstName' | 'teamName' | null
  const [dragStart, setDragStart] = useState(null);

  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const cachedBgImageRef = useRef(null);

  const showToast = (type, text) => {
    setStudioToast({ type, text });
    setTimeout(() => setStudioToast({ type: '', text: '' }), 4000);
  };

  // 1. Fetch saved templates on mount
  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const list = await getNametagTemplates(db);
      setTemplates(list);
    } catch (err) {
      console.warn("Failed to load nametag templates:", err);
      showToast('error', 'Failed to load templates from Firestore.');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 2. Handle Image Upload & Aspect Ratio Locking
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload a valid image file (PNG, JPG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 1800;
        const h = img.naturalHeight || 1200;
        const ratio = parseFloat((w / h).toFixed(4));

        setNaturalWidth(w);
        setNaturalHeight(h);
        setAspectRatio(ratio);
        setImageBase64(dataUrl);
        cachedBgImageRef.current = img;

        // Default 3.0 in footprint, aspect ratio locked
        const defW = 3.0;
        const defH = parseFloat((defW / ratio).toFixed(3));
        setFootprintWidth(defW);
        setFootprintHeight(defH);

        // Intelligently center text boxes within new image bounds
        setFirstNameBox(prev => ({
          ...prev,
          centerX: Math.round(w / 2),
          centerY: Math.round(h * 0.42),
          width: Math.round(w * 0.78),
          height: Math.round(h * 0.30),
          maxFontSize: Math.round(h * 0.08)
        }));

        setTeamNameBox(prev => ({
          ...prev,
          centerX: Math.round(w / 2),
          centerY: Math.round(h * 0.72),
          width: Math.round(w * 0.70),
          height: Math.round(h * 0.18),
          maxFontSize: Math.round(h * 0.045)
        }));

        showToast('success', `Image loaded (${w}×${h}px, Aspect Ratio ${ratio}:1)`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // 3. Aspect Ratio Locked Footprint Handlers
  const handleFootprintWidthChange = (newW) => {
    const w = parseFloat(newW);
    setFootprintWidth(newW);
    if (!isNaN(w) && w > 0 && aspectRatio > 0) {
      setFootprintHeight(parseFloat((w / aspectRatio).toFixed(3)));
    }
  };

  const handleFootprintHeightChange = (newH) => {
    const h = parseFloat(newH);
    setFootprintHeight(newH);
    if (!isNaN(h) && h > 0 && aspectRatio > 0) {
      setFootprintWidth(parseFloat((h * aspectRatio).toFixed(3)));
    }
  };

  // 4. Sample Text Resolution
  const getSampleText = useCallback(() => {
    if (sampleDataPreset === 'short') {
      return { first: 'John D.', team: 'Team Alpha' };
    }
    if (sampleDataPreset === 'long') {
      return { first: 'Christopher Alexander', team: 'The Grounding Warriors' };
    }
    if (sampleDataPreset === 'multi') {
      return { first: 'Mary-Jane Watson', team: 'Inner Peace Explorers' };
    }
    return {
      first: customFirstName.trim() || 'Sample Attendee',
      team: customTeamName.trim() || 'Team Phoenix'
    };
  }, [sampleDataPreset, customFirstName, customTeamName]);

  // 5. Draw Canvas Preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = naturalWidth;
    canvas.height = naturalHeight;

    // Draw background image or placeholder pattern
    if (cachedBgImageRef.current && imageBase64) {
      ctx.drawImage(cachedBgImageRef.current, 0, 0, naturalWidth, naturalHeight);
    } else {
      // Placeholder background
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(0, 0, naturalWidth, naturalHeight);
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Upload nametag background image to preview', naturalWidth / 2, naturalHeight / 2);
    }

    const { first, team } = getSampleText();

    // Draw First Name Text
    if (first && firstNameBox) {
      drawFittedTextOnCanvas(ctx, first, firstNameBox);
    }

    // Draw Team Name Text
    if (team && teamNameBox) {
      drawFittedTextOnCanvas(ctx, team, teamNameBox);
    }

    // Overlay Guides
    if (showGuides) {
      // 1. First Name Guides (Sky Blue #0284C7)
      const fnCenterX = Number(firstNameBox.centerX) || 0;
      const fnCenterY = Number(firstNameBox.centerY) || 0;
      const fnWidth = Math.max(10, Number(firstNameBox.width) || 100);
      const fnHeight = Math.max(10, Number(firstNameBox.height) || 50);
      const fnLeft = fnCenterX - (fnWidth / 2);
      const fnTop = fnCenterY - (fnHeight / 2);

      ctx.save();
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = Math.max(2, Math.round(naturalWidth * 0.002));
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(fnLeft, fnTop, fnWidth, fnHeight);

      // Crosshair
      const chLen = Math.max(12, Math.round(naturalWidth * 0.015));
      ctx.beginPath();
      ctx.moveTo(fnCenterX - chLen, fnCenterY);
      ctx.lineTo(fnCenterX + chLen, fnCenterY);
      ctx.moveTo(fnCenterX, fnCenterY - chLen);
      ctx.lineTo(fnCenterX, fnCenterY + chLen);
      ctx.stroke();

      // Dimension Badge
      ctx.setLineDash([]);
      ctx.fillStyle = '#0284C7';
      const badgeText = `First Name Box: ${fnWidth} × ${fnHeight} px`;
      ctx.font = `bold ${Math.max(12, Math.round(naturalWidth * 0.014))}px sans-serif`;
      const badgeW = ctx.measureText(badgeText).width + 16;
      ctx.fillRect(fnLeft, Math.max(0, fnTop - 24), badgeW, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, fnLeft + 8, Math.max(11, fnTop - 13));
      ctx.restore();

      // 2. Team Name Guides (Sun Gold #D97706)
      const tmCenterX = Number(teamNameBox.centerX) || 0;
      const tmCenterY = Number(teamNameBox.centerY) || 0;
      const tmWidth = Math.max(10, Number(teamNameBox.width) || 100);
      const tmHeight = Math.max(10, Number(teamNameBox.height) || 50);
      const tmLeft = tmCenterX - (tmWidth / 2);
      const tmTop = tmCenterY - (tmHeight / 2);

      ctx.save();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = Math.max(2, Math.round(naturalWidth * 0.002));
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(tmLeft, tmTop, tmWidth, tmHeight);

      // Crosshair
      ctx.beginPath();
      ctx.moveTo(tmCenterX - chLen, tmCenterY);
      ctx.lineTo(tmCenterX + chLen, tmCenterY);
      ctx.moveTo(tmCenterX, tmCenterY - chLen);
      ctx.lineTo(tmCenterX, tmCenterY + chLen);
      ctx.stroke();

      // Dimension Badge
      ctx.setLineDash([]);
      ctx.fillStyle = '#D97706';
      const tmBadgeText = `Team Name Box: ${tmWidth} × ${tmHeight} px`;
      ctx.font = `bold ${Math.max(12, Math.round(naturalWidth * 0.014))}px sans-serif`;
      const tmBadgeW = ctx.measureText(tmBadgeText).width + 16;
      ctx.fillRect(tmLeft, Math.max(0, tmTop - 24), tmBadgeW, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(tmBadgeText, tmLeft + 8, Math.max(11, tmTop - 13));
      ctx.restore();
    }
  }, [
    naturalWidth,
    naturalHeight,
    imageBase64,
    firstNameBox,
    teamNameBox,
    showGuides,
    getSampleText
  ]);

  // 6. Interactive Drag on Canvas
  const handleCanvasMouseDown = (e) => {
    if (!showGuides || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check hit in First Name Box
    const fnLeft = firstNameBox.centerX - (firstNameBox.width / 2);
    const fnTop = firstNameBox.centerY - (firstNameBox.height / 2);
    if (
      clickX >= fnLeft && clickX <= fnLeft + firstNameBox.width &&
      clickY >= fnTop && clickY <= fnTop + firstNameBox.height
    ) {
      setActiveDragBox('firstName');
      setDragStart({ x: clickX - firstNameBox.centerX, y: clickY - firstNameBox.centerY });
      return;
    }

    // Check hit in Team Name Box
    const tmLeft = teamNameBox.centerX - (teamNameBox.width / 2);
    const tmTop = teamNameBox.centerY - (teamNameBox.height / 2);
    if (
      clickX >= tmLeft && clickX <= tmLeft + teamNameBox.width &&
      clickY >= tmTop && clickY <= tmTop + teamNameBox.height
    ) {
      setActiveDragBox('teamName');
      setDragStart({ x: clickX - teamNameBox.centerX, y: clickY - teamNameBox.centerY });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!activeDragBox || !dragStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const newCenterX = Math.round(Math.max(0, Math.min(naturalWidth, currentX - dragStart.x)));
    const newCenterY = Math.round(Math.max(0, Math.min(naturalHeight, currentY - dragStart.y)));

    if (activeDragBox === 'firstName') {
      setFirstNameBox(prev => ({ ...prev, centerX: newCenterX, centerY: newCenterY }));
    } else if (activeDragBox === 'teamName') {
      setTeamNameBox(prev => ({ ...prev, centerX: newCenterX, centerY: newCenterY }));
    }
  };

  const handleCanvasMouseUp = () => {
    setActiveDragBox(null);
    setDragStart(null);
  };

  // 7. Save / Update Template
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('error', 'Please enter a template title.');
      return;
    }
    if (!imageBase64) {
      showToast('error', 'Please upload a background image for this template.');
      return;
    }

    setIsSaving(true);
    try {
      const templateId = editingTemplateId || `tpl_nametag_${Date.now()}`;
      const metadata = {
        id: templateId,
        title: title.trim(),
        width: naturalWidth,
        height: naturalHeight,
        aspectRatio: parseFloat((naturalWidth / naturalHeight).toFixed(4)),
        physicalDimensions: {
          unit: footprintUnit,
          width: parseFloat(footprintWidth) || 3.0,
          height: parseFloat(footprintHeight) || 2.0
        },
        firstNameBox: {
          ...firstNameBox,
          centerX: Number(firstNameBox.centerX),
          centerY: Number(firstNameBox.centerY),
          width: Number(firstNameBox.width),
          height: Number(firstNameBox.height),
          maxFontSize: Number(firstNameBox.maxFontSize)
        },
        teamNameBox: {
          ...teamNameBox,
          centerX: Number(teamNameBox.centerX),
          centerY: Number(teamNameBox.centerY),
          width: Number(teamNameBox.width),
          height: Number(teamNameBox.height),
          maxFontSize: Number(teamNameBox.maxFontSize)
        },
        createdAt: editingTemplateId ? (templates.find(t => t.id === editingTemplateId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await saveNametagTemplateWithChunks(db, metadata, imageBase64);
      showToast('success', editingTemplateId ? 'Template updated successfully!' : 'Nametag template saved!');

      // Reset form
      handleCancelEdit();
      await fetchTemplates();
    } catch (err) {
      console.error("Error saving nametag template:", err);
      showToast('error', 'Failed to save template: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // 8. Load Template for Editing
  const handleStartEdit = async (template) => {
    setEditingTemplateId(template.id);
    setTitle(template.title || '');
    setNaturalWidth(template.width || 1800);
    setNaturalHeight(template.height || 1200);
    setAspectRatio(template.aspectRatio || 1.5);

    if (template.physicalDimensions) {
      setFootprintUnit(template.physicalDimensions.unit || 'in');
      setFootprintWidth(template.physicalDimensions.width || 3.0);
      setFootprintHeight(template.physicalDimensions.height || 2.0);
    }

    if (template.firstNameBox) {
      setFirstNameBox(template.firstNameBox);
    }
    if (template.teamNameBox) {
      setTeamNameBox(template.teamNameBox);
    }

    // Fetch full image chunks
    showToast('info', 'Loading high-resolution template artwork...');
    try {
      const fullImg = await loadNametagTemplateImage(db, template.id);
      if (fullImg) {
        setImageBase64(fullImg);
        const img = new Image();
        img.onload = () => {
          cachedBgImageRef.current = img;
        };
        img.src = fullImg;
        showToast('success', 'Template ready for editing.');
      } else if (template.thumbnailBase64) {
        setImageBase64(template.thumbnailBase64);
      }
    } catch (err) {
      console.warn("Failed to load full image for editing:", err);
      showToast('error', 'Could not load full template image.');
    }

    // Scroll editor into view
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setTitle('');
    setImageBase64('');
    cachedBgImageRef.current = null;
    setFootprintWidth(3.0);
    setFootprintHeight(2.0);
  };

  // 9. Delete Template
  const handleDeleteTemplate = async (templateId, templateTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete template "${templateTitle}"?`)) {
      return;
    }

    try {
      await deleteNametagTemplateWithChunks(db, templateId);
      showToast('success', `Deleted "${templateTitle}"`);
      if (editingTemplateId === templateId) {
        handleCancelEdit();
      }
      await fetchTemplates();
    } catch (err) {
      console.error("Error deleting template:", err);
      showToast('error', 'Failed to delete template.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

      {/* HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.08) 0%, rgba(2, 132, 199, 0.05) 100%)',
        padding: '1.5rem 1.75rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(2, 132, 199, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge" style={{ background: '#0284C7', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Tag size={13} /> Global Studio
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Retreat-Independent Universal Templates
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Automated Nametag Template Studio
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.35rem', maxWidth: '680px' }}>
            Design reusable nametag backgrounds and calibrate dynamic text bounding boxes for First Name and Team Name. Saved templates are available across all retreats for duplex PDF printing.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchTemplates}
            disabled={isLoadingTemplates}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} className={isLoadingTemplates ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* TOAST MESSAGE */}
      {studioToast.text && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem',
          fontWeight: 700,
          background: studioToast.type === 'error' ? '#FEF2F2' : '#DCFCE7',
          color: studioToast.type === 'error' ? '#DC2626' : '#166534',
          border: studioToast.type === 'error' ? '1px solid #F87171' : '1px solid #86EFAC',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {studioToast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {studioToast.text}
        </div>
      )}

      {/* MAIN TWO-COLUMN STUDIO EDITOR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '2rem',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: FORM CONTROLS */}
        <form
          onSubmit={handleSaveTemplate}
          className="glass-card"
          style={{
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            background: '#FFFFFF',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {editingTemplateId ? 'Edit Nametag Template' : 'Configure New Nametag Template'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Upload Canva artwork, set physical dimensions, and configure text boxes.
            </p>
          </div>

          {/* Template Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              TEMPLATE TITLE *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Universal Floral SKY Nametag"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                background: '#FFFFFF'
              }}
            />
          </div>

          {/* Background Artwork Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              BACKGROUND ARTWORK (PNG, JPG, WebP) *
            </label>
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              textAlign: 'center',
              background: '#F8FAFC',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <Upload size={28} color="var(--sky-blue)" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sky-blue)' }}>
                {imageBase64 ? 'Click or drop to replace image' : 'Click to upload nametag artwork'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                High-resolution PNG or JPG exported from Canva (e.g. 1800×1200 px)
              </div>
            </div>

            {imageBase64 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>📐 Natural: <strong>{naturalWidth} × {naturalHeight} px</strong></span>
                <span>⚖️ Ratio: <strong>{aspectRatio}:1</strong></span>
              </div>
            )}
          </div>

          {/* Physical Print Footprint & Aspect Ratio Locking */}
          <div style={{
            background: '#F8FAFC',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--sky-blue)', margin: 0 }}>
                PHYSICAL PRINT FOOTPRINT
              </label>
              <span className="badge badge-sun" style={{ fontSize: '0.7rem' }}>
                Aspect Ratio Locked ({aspectRatio}:1)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  UNIT
                </label>
                <select
                  value={footprintUnit}
                  onChange={(e) => setFootprintUnit(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
                >
                  <option value="in">Inches (in)</option>
                  <option value="cm">Centimeters (cm)</option>
                  <option value="mm">Millimeters (mm)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  WIDTH ({footprintUnit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="20"
                  value={footprintWidth}
                  onChange={(e) => handleFootprintWidthChange(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  HEIGHT ({footprintUnit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="20"
                  value={footprintHeight}
                  onChange={(e) => handleFootprintHeightChange(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Standard badge sizes: 3.0 × 2.0 in (Horizontal) or 3.5 × 2.25 in. Width and Height stay proportional automatically.
            </div>
          </div>

          {/* TEXT BOX 1: FIRST NAME CONFIGURATION */}
          <fieldset style={{
            border: '1.5px solid rgba(2, 132, 199, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            background: '#FFFFFF'
          }}>
            <legend style={{ padding: '0 0.5rem', fontSize: '0.82rem', fontWeight: 800, color: '#0284C7', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Type size={14} /> Text Box 1: Participant First Name
            </legend>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* Sliders & Direct Inputs: Center Coordinates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>CENTER X</span>
                    <span>{firstNameBox.centerX || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max={naturalWidth}
                      value={Number(firstNameBox.centerX) || 0}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, centerX: parseInt(e.target.value, 10) || 0 })}
                      style={{ flex: 1, accentColor: '#0284C7' }}
                    />
                    <input
                      type="number"
                      min="0"
                      max={naturalWidth}
                      value={firstNameBox.centerX ?? ''}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, centerX: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(firstNameBox.centerX, 10);
                        setFirstNameBox({ ...firstNameBox, centerX: isNaN(val) ? Math.round(naturalWidth / 2) : Math.max(0, Math.min(naturalWidth, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>CENTER Y</span>
                    <span>{firstNameBox.centerY || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max={naturalHeight}
                      value={Number(firstNameBox.centerY) || 0}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, centerY: parseInt(e.target.value, 10) || 0 })}
                      style={{ flex: 1, accentColor: '#0284C7' }}
                    />
                    <input
                      type="number"
                      min="0"
                      max={naturalHeight}
                      value={firstNameBox.centerY ?? ''}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, centerY: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(firstNameBox.centerY, 10);
                        setFirstNameBox({ ...firstNameBox, centerY: isNaN(val) ? Math.round(naturalHeight / 2) : Math.max(0, Math.min(naturalHeight, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sliders & Direct Inputs: Bounding Box Width & Height */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>BOX WIDTH</span>
                    <span>{firstNameBox.width || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="20"
                      max={naturalWidth}
                      value={Number(firstNameBox.width) || 20}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, width: parseInt(e.target.value, 10) || 20 })}
                      style={{ flex: 1, accentColor: '#0284C7' }}
                    />
                    <input
                      type="number"
                      min="10"
                      max={naturalWidth}
                      value={firstNameBox.width ?? ''}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, width: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(firstNameBox.width, 10);
                        setFirstNameBox({ ...firstNameBox, width: isNaN(val) ? 200 : Math.max(10, Math.min(naturalWidth, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>BOX HEIGHT</span>
                    <span>{firstNameBox.height || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="20"
                      max={naturalHeight}
                      value={Number(firstNameBox.height) || 20}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, height: parseInt(e.target.value, 10) || 20 })}
                      style={{ flex: 1, accentColor: '#0284C7' }}
                    />
                    <input
                      type="number"
                      min="10"
                      max={naturalHeight}
                      value={firstNameBox.height ?? ''}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, height: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(firstNameBox.height, 10);
                        setFirstNameBox({ ...firstNameBox, height: isNaN(val) ? 100 : Math.max(10, Math.min(naturalHeight, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Max Font Size & Family */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>MAX FONT SIZE</span>
                    <span>{firstNameBox.maxFontSize || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      value={Number(firstNameBox.maxFontSize) || 10}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, maxFontSize: parseInt(e.target.value, 10) || 10 })}
                      style={{ flex: 1, accentColor: '#0284C7' }}
                    />
                    <input
                      type="number"
                      min="8"
                      max="500"
                      value={firstNameBox.maxFontSize ?? ''}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, maxFontSize: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(firstNameBox.maxFontSize, 10);
                        setFirstNameBox({ ...firstNameBox, maxFontSize: isNaN(val) ? 48 : Math.max(8, val) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    FONT FAMILY
                  </label>
                  <select
                    value={firstNameBox.fontFamily}
                    onChange={(e) => setFirstNameBox({ ...firstNameBox, fontFamily: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: '#FFFFFF' }}
                  >
                    <option value="'Source Sans 3', sans-serif">Source Sans 3 (Standard)</option>
                    <option value="'Inter', sans-serif">Inter Sans</option>
                    <option value="'Montserrat', sans-serif">Montserrat Bold</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Merriweather', serif">Merriweather Serif</option>
                    <option value="'Courier New', monospace">Courier Monospace</option>
                  </select>
                </div>
              </div>

              {/* Text Align, Bold & Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    TEXT ALIGNMENT
                  </label>
                  <select
                    value={firstNameBox.textAlign || 'center'}
                    onChange={(e) => setFirstNameBox({ ...firstNameBox, textAlign: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: '#FFFFFF' }}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div style={{ paddingTop: '1.1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={firstNameBox.bold !== false}
                      onChange={(e) => setFirstNameBox({ ...firstNameBox, bold: e.target.checked })}
                    />
                    Bold Weight
                  </label>
                </div>
              </div>

              {/* Color Picker */}
              <ColorPickerWithAlpha
                label="FIRST NAME COLOR"
                value={firstNameBox.color}
                onChange={(c) => setFirstNameBox({ ...firstNameBox, color: c })}
              />

              {/* Shadow Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={firstNameBox.hasShadow || false}
                    onChange={(e) => setFirstNameBox({ ...firstNameBox, hasShadow: e.target.checked })}
                  />
                  Enable Drop Shadow
                </label>
                {firstNameBox.hasShadow && (
                  <ColorPickerWithAlpha
                    label="SHADOW COLOR"
                    value={firstNameBox.shadowColor || 'rgba(0,0,0,0.3)'}
                    onChange={(c) => setFirstNameBox({ ...firstNameBox, shadowColor: c })}
                  />
                )}
              </div>

            </div>
          </fieldset>

          {/* TEXT BOX 2: TEAM NAME CONFIGURATION */}
          <fieldset style={{
            border: '1.5px solid rgba(217, 119, 6, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            background: '#FFFFFF'
          }}>
            <legend style={{ padding: '0 0.5rem', fontSize: '0.82rem', fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Layers size={14} /> Text Box 2: Team / Group Name
            </legend>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* Sliders & Direct Inputs: Center Coordinates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>CENTER X</span>
                    <span>{teamNameBox.centerX || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max={naturalWidth}
                      value={Number(teamNameBox.centerX) || 0}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, centerX: parseInt(e.target.value, 10) || 0 })}
                      style={{ flex: 1, accentColor: '#D97706' }}
                    />
                    <input
                      type="number"
                      min="0"
                      max={naturalWidth}
                      value={teamNameBox.centerX ?? ''}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, centerX: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(teamNameBox.centerX, 10);
                        setTeamNameBox({ ...teamNameBox, centerX: isNaN(val) ? Math.round(naturalWidth / 2) : Math.max(0, Math.min(naturalWidth, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>CENTER Y</span>
                    <span>{teamNameBox.centerY || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max={naturalHeight}
                      value={Number(teamNameBox.centerY) || 0}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, centerY: parseInt(e.target.value, 10) || 0 })}
                      style={{ flex: 1, accentColor: '#D97706' }}
                    />
                    <input
                      type="number"
                      min="0"
                      max={naturalHeight}
                      value={teamNameBox.centerY ?? ''}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, centerY: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(teamNameBox.centerY, 10);
                        setTeamNameBox({ ...teamNameBox, centerY: isNaN(val) ? Math.round(naturalHeight / 2) : Math.max(0, Math.min(naturalHeight, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sliders & Direct Inputs: Bounding Box Width & Height */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>BOX WIDTH</span>
                    <span>{teamNameBox.width || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="20"
                      max={naturalWidth}
                      value={Number(teamNameBox.width) || 20}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, width: parseInt(e.target.value, 10) || 20 })}
                      style={{ flex: 1, accentColor: '#D97706' }}
                    />
                    <input
                      type="number"
                      min="10"
                      max={naturalWidth}
                      value={teamNameBox.width ?? ''}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, width: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(teamNameBox.width, 10);
                        setTeamNameBox({ ...teamNameBox, width: isNaN(val) ? 200 : Math.max(10, Math.min(naturalWidth, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>BOX HEIGHT</span>
                    <span>{teamNameBox.height || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="20"
                      max={naturalHeight}
                      value={Number(teamNameBox.height) || 20}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, height: parseInt(e.target.value, 10) || 20 })}
                      style={{ flex: 1, accentColor: '#D97706' }}
                    />
                    <input
                      type="number"
                      min="10"
                      max={naturalHeight}
                      value={teamNameBox.height ?? ''}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, height: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(teamNameBox.height, 10);
                        setTeamNameBox({ ...teamNameBox, height: isNaN(val) ? 80 : Math.max(10, Math.min(naturalHeight, val)) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Max Font Size & Family */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>MAX FONT SIZE</span>
                    <span>{teamNameBox.maxFontSize || 0} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={Number(teamNameBox.maxFontSize) || 10}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, maxFontSize: parseInt(e.target.value, 10) || 10 })}
                      style={{ flex: 1, accentColor: '#D97706' }}
                    />
                    <input
                      type="number"
                      min="8"
                      max="300"
                      value={teamNameBox.maxFontSize ?? ''}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, maxFontSize: e.target.value })}
                      onBlur={() => {
                        const val = parseInt(teamNameBox.maxFontSize, 10);
                        setTeamNameBox({ ...teamNameBox, maxFontSize: isNaN(val) ? 44 : Math.max(8, val) });
                      }}
                      style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    FONT FAMILY
                  </label>
                  <select
                    value={teamNameBox.fontFamily}
                    onChange={(e) => setTeamNameBox({ ...teamNameBox, fontFamily: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: '#FFFFFF' }}
                  >
                    <option value="'Source Sans 3', sans-serif">Source Sans 3 (Standard)</option>
                    <option value="'Inter', sans-serif">Inter Sans</option>
                    <option value="'Montserrat', sans-serif">Montserrat Bold</option>
                    <option value="'Roboto', sans-serif">Roboto</option>
                    <option value="'Merriweather', serif">Merriweather Serif</option>
                    <option value="'Courier New', monospace">Courier Monospace</option>
                  </select>
                </div>
              </div>

              {/* Text Align, Bold & Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    TEXT ALIGNMENT
                  </label>
                  <select
                    value={teamNameBox.textAlign || 'center'}
                    onChange={(e) => setTeamNameBox({ ...teamNameBox, textAlign: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: '#FFFFFF' }}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div style={{ paddingTop: '1.1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={teamNameBox.bold !== false}
                      onChange={(e) => setTeamNameBox({ ...teamNameBox, bold: e.target.checked })}
                    />
                    Bold Weight
                  </label>
                </div>
              </div>

              {/* Color Picker */}
              <ColorPickerWithAlpha
                label="TEAM NAME COLOR"
                value={teamNameBox.color}
                onChange={(c) => setTeamNameBox({ ...teamNameBox, color: c })}
              />

              {/* Shadow Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={teamNameBox.hasShadow || false}
                    onChange={(e) => setTeamNameBox({ ...teamNameBox, hasShadow: e.target.checked })}
                  />
                  Enable Drop Shadow
                </label>
                {teamNameBox.hasShadow && (
                  <ColorPickerWithAlpha
                    label="SHADOW COLOR"
                    value={teamNameBox.shadowColor || 'rgba(0,0,0,0.25)'}
                    onChange={(c) => setTeamNameBox({ ...teamNameBox, shadowColor: c })}
                  />
                )}
              </div>

            </div>
          </fieldset>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {isSaving ? 'Saving Template Chunks...' : (editingTemplateId ? 'Update Nametag Template' : 'Save Nametag Template')}
            </button>

            {editingTemplateId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-secondary"
                style={{ padding: '0.85rem' }}
              >
                Cancel
              </button>
            )}
          </div>

        </form>

        {/* RIGHT COLUMN: LIVE INTERACTIVE CANVAS PREVIEW */}
        <div
          className="glass-card"
          style={{
            padding: '1.5rem',
            background: '#FFFFFF',
            boxShadow: 'var(--shadow-md)',
            position: 'sticky',
            top: '85px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {/* Preview Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Studio Canvas Preview
              </span>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {naturalWidth} × {naturalHeight} px ({footprintWidth} × {footprintHeight} {footprintUnit})
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowGuides(!showGuides)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Toggle bounding box guides and crosshairs"
              >
                {showGuides ? <EyeOff size={14} /> : <Eye size={14} />}
                {showGuides ? 'Hide Guides' : 'Show Guides'}
              </button>
            </div>
          </div>

          {/* Sample Data Switcher */}
          <div style={{ background: '#F8FAFC', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              SAMPLE DATA PREVIEWS (AUTO-DOWNSCALING TEST)
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSampleDataPreset('short')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  borderRadius: '3px',
                  border: '1px solid var(--border-color)',
                  background: sampleDataPreset === 'short' ? '#0284C7' : '#FFFFFF',
                  color: sampleDataPreset === 'short' ? '#FFFFFF' : 'var(--text-main)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Short: "John D."
              </button>

              <button
                type="button"
                onClick={() => setSampleDataPreset('long')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  borderRadius: '3px',
                  border: '1px solid var(--border-color)',
                  background: sampleDataPreset === 'long' ? '#0284C7' : '#FFFFFF',
                  color: sampleDataPreset === 'long' ? '#FFFFFF' : 'var(--text-main)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Long: "Christopher Alexander"
              </button>

              <button
                type="button"
                onClick={() => setSampleDataPreset('multi')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  borderRadius: '3px',
                  border: '1px solid var(--border-color)',
                  background: sampleDataPreset === 'multi' ? '#0284C7' : '#FFFFFF',
                  color: sampleDataPreset === 'multi' ? '#FFFFFF' : 'var(--text-main)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Multi-Word: "Mary-Jane Watson"
              </button>

              <button
                type="button"
                onClick={() => setSampleDataPreset('custom')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  borderRadius: '3px',
                  border: '1px solid var(--border-color)',
                  background: sampleDataPreset === 'custom' ? '#0284C7' : '#FFFFFF',
                  color: sampleDataPreset === 'custom' ? '#FFFFFF' : 'var(--text-main)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Custom...
              </button>
            </div>

            {sampleDataPreset === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Custom First Name"
                  value={customFirstName}
                  onChange={(e) => setCustomFirstName(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '3px', border: '1px solid var(--border-color)' }}
                />
                <input
                  type="text"
                  placeholder="Custom Team Name"
                  value={customTeamName}
                  onChange={(e) => setCustomTeamName(e.target.value)}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '3px', border: '1px solid var(--border-color)' }}
                />
              </div>
            )}
          </div>

          {/* Interactive HTML5 Canvas Container */}
          <div
            ref={canvasContainerRef}
            style={{
              width: '100%',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: '#0F172A',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '4px',
                cursor: showGuides ? 'move' : 'default',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                background: '#FFFFFF'
              }}
            />
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            💡 Click and drag the dashed boxes directly on the canvas to reposition!
          </div>

        </div>

      </div>

      {/* SAVED TEMPLATES ROSTER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Saved Nametag Templates ({templates.length})
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Universally available across all retreats for duplex print generation.
            </p>
          </div>
        </div>

        {isLoadingTemplates ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', background: '#FFFFFF' }}>
            <Tag size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              No Nametag Templates Configured Yet
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
              Upload your first nametag artwork using the studio form above. It will be stored losslessly and accessible for all retreats.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="glass-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  border: editingTemplateId === tpl.id ? '2px solid #0284C7' : '1px solid var(--border-color)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition-fast)'
                }}
              >
                {/* Thumbnail Header */}
                <div style={{
                  height: '140px',
                  background: '#F1F5F9',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {tpl.thumbnailBase64 ? (
                    <img
                      src={tpl.thumbnailBase64}
                      alt={tpl.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <Tag size={32} color="#94A3B8" />
                  )}

                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    color: '#FFFFFF',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    {tpl.physicalDimensions?.width || 3.0} × {tpl.physicalDimensions?.height || 2.0} {tpl.physicalDimensions?.unit || 'in'}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tpl.title}
                    </h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Canvas: {tpl.width} × {tpl.height} px | Ratio: {tpl.aspectRatio || '1.5'}:1
                    </div>
                    {tpl.chunkCount && (
                      <div style={{ fontSize: '0.7rem', color: '#0284C7', marginTop: '0.2rem' }}>
                        Lossless Chunks: {tpl.chunkCount} ({Math.round((tpl.totalLength || 0) / 1024)} KB)
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(tpl)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Edit3 size={13} />
                      {editingTemplateId === tpl.id ? 'Editing' : 'Edit'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.65rem', color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.2)' }}
                      title="Delete template and chunk subcollections"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
