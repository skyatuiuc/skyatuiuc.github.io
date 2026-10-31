import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../firebase/config';
import { useRoster } from '../../context/RosterContext';
import { loadFlyerTemplateImage } from '../../services/flyerChunkService';
import { renderAndExportFlyer, calculateScaledDimensions, colorToQrHex, parsePixel } from '../../utils/graphicExportUtils';
import { QrCode, Download, Copy } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';

// Volunteer tab: generate a campaign flyer (template + QR code + shortlink) for outreach.
// Mounted only while the tab is open, so its template listener costs nothing otherwise.
export default function FlyerOutreachTab() {
  const toast = useToast();
  const { activeRetreat } = useRoster();

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





  // Live QR Code Generation Effect
  useEffect(() => {
    const activeTpl = flyerTemplates.find(t => t.id === selectedTemplateId);
    const cleanTag = (campaignTagInput || 'demo').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const shortUrl = `https://skyuiuc.org/${cleanTag}`;
    const qrFg = activeTpl?.qrBox?.fgColor || '#161942';
    const qrBgRaw = activeTpl?.qrBox?.bgColor;

    QRCode.toDataURL(shortUrl, { width: 360, margin: 0, color: { dark: colorToQrHex(qrFg, '#161942FF'), light: colorToQrHex(qrBgRaw, '#00000000') } })
      .then(url => setQrDataUrl(url))
      .catch(err => console.warn('QR Code error:', err));
  }, [campaignTagInput, selectedTemplateId, flyerTemplates]);

  // Flyer Template High-Res Image Preload Effect
  useEffect(() => {
    if (!selectedTemplateId) {
      setTplFullImage(null);
      return;
    }

    const activeTpl = flyerTemplates.find(t => t.id === selectedTemplateId);
    if (activeTpl?.thumbnailBase64) {
      setTplFullImage(activeTpl.thumbnailBase64);
    } else if (activeTpl?.bgImageUrl) {
      setTplFullImage(activeTpl.bgImageUrl);
    }

    if (isFirebaseConfigured && db) {
      let isMounted = true;
      loadFlyerTemplateImage(db, selectedTemplateId).then(fullImg => {
        if (isMounted && fullImg) {
          setTplFullImage(fullImg);
        }
      }).catch(err => console.warn('Template image load error:', err));
      return () => { isMounted = false; };
    }
  }, [selectedTemplateId, flyerTemplates]);

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
      toast.error(`Could not generate the flyer: ${err.message || 'unknown error'}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
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
              const availableTemplates = flyerTemplates.filter(t => !t.retreatId || t.retreatId === activeRetreat?.id);

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
                navigator.clipboard.writeText(`https://skyuiuc.org/${cleanTag}`)
                  .then(() => toast.success(`Copied https://skyuiuc.org/${cleanTag}`))
                  .catch(() => toast.error('Clipboard permission denied.'));
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
                  containerType: 'inline-size',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  background: '#FFFFFF'
                }}>
                  {/* High-Fidelity Flyer Base Image */}
                  <img 
                    src={bgSource} 
                    alt={activeTpl.templateName || "Flyer Template"} 
                    onError={() => {
                      if (activeTpl?.thumbnailBase64 && bgSource !== activeTpl.thumbnailBase64) {
                        setTplFullImage(activeTpl.thumbnailBase64);
                      }
                    }}
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

                  {/* Overlay QR Code at exact pixel coordinates with custom colors & shadow */}
                  <div style={{
                    position: 'absolute',
                    left: `${(parsePixel(activeTpl.qrBox?.x, tplW / 2) / tplW) * 100}%`,
                    top: `${(parsePixel(activeTpl.qrBox?.y, tplH / 2) / tplH) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${(parsePixel(activeTpl.qrBox?.size, tplW * 0.125) / tplW) * 100}%`,
                    aspectRatio: '1 / 1',
                    background: activeTpl.qrBox?.bgColor === 'transparent' ? 'none' : (activeTpl.qrBox?.bgColor || '#FFFFFF'),
                    boxShadow: (activeTpl.qrBox?.hasShadow && activeTpl.qrBox?.bgColor !== 'transparent') ? `0 4px 15px ${activeTpl.qrBox?.shadowColor || 'rgba(0,0,0,0.15)'}` : 'none',
                    filter: (activeTpl.qrBox?.hasShadow && activeTpl.qrBox?.bgColor === 'transparent') ? `drop-shadow(0 4px 8px ${activeTpl.qrBox?.shadowColor || 'rgba(0,0,0,0.15)'})` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    zIndex: 2
                  }}>
                    {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />}
                  </div>

                  {/* Shortlink Text overlayed at exact pixel coordinates */}
                  <div style={{
                    position: 'absolute',
                    left: `${(parsePixel(activeTpl.shortlinkText?.x, tplW / 2) / tplW) * 100}%`,
                    top: `${(parsePixel(activeTpl.shortlinkText?.y, tplH * 0.55) / tplH) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    color: activeTpl.shortlinkText?.color || '#1F74F1',
                    fontFamily: activeTpl.shortlinkText?.fontFamily || "'Source Sans 3', sans-serif",
                    fontWeight: 800,
                    fontSize: `calc(${(parsePixel(activeTpl.shortlinkText?.fontSize, Math.round(tplH * 0.035)) / tplW) * 100}cqw)`,
                    textShadow: activeTpl.shortlinkText?.hasShadow ? `0 2px 6px ${activeTpl.shortlinkText?.shadowColor || 'rgba(0,0,0,0.3)'}` : 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 2
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
  );
}
