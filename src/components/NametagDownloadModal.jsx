import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Tag,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Printer
} from 'lucide-react';
import {
  getNametagTemplates,
  loadNametagTemplateImage
} from '../services/nametagChunkService';
import {
  PAPER_SIZE_PRESETS,
  PRINT_CONFIGURATIONS,
  calculatePackingMetrics,
  generateNametagsPdf,
  resolveParticipantDisplayName,
  resolveParticipantTeamName,
  convertLength
} from '../utils/nametagPdfUtils';

export default function NametagDownloadModal({
  isOpen,
  onClose,
  activeRetreat,
  allApplicants = [],
  groupNames = {},
  db
}) {
  // Templates state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // Candidate Filter State
  const [selectedStatusSet, setSelectedStatusSet] = useState(new Set());
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());
  const [isRosterExpanded, setIsRosterExpanded] = useState(true);

  // Paper & Margins
  const [paperPreset, setPaperPreset] = useState('us_letter');
  const [pageWidth, setPageWidth] = useState('8.5');
  const [pageHeight, setPageHeight] = useState('11.0');
  const [unit, setUnit] = useState('in');
  const [margin, setMargin] = useState('0.5');

  // Print Configuration & Blanks
  const [configType, setConfigType] = useState('double_double'); // Default: Recommended Duplex
  const [extraBlanksCount, setExtraBlanksCount] = useState('10');
  const [autoOptimizePacking, setAutoOptimizePacking] = useState(true); // Default: 90° Mixed Packing Optimizer Enabled

  // Generation & Progress State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressState, setProgressState] = useState({ step: 1, current: 0, total: 0, text: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [successFilename, setSuccessFilename] = useState('');

  // 1. Fetch saved templates when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadTemplates() {
      setIsLoadingTemplates(true);
      setErrorMessage('');
      setSuccessFilename('');
      try {
        const list = await getNametagTemplates(db);
        if (isMounted) {
          setTemplates(list);
          if (list.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(list[0].id);
          }
        }
      } catch {
        if (isMounted) setErrorMessage('Failed to load nametag templates from Firestore.');
      } finally {
        if (isMounted) setIsLoadingTemplates(false);
      }
    }

    loadTemplates();
    return () => { isMounted = false; };
  }, [isOpen, db, selectedTemplateId]);

  // Selected template object
  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // 2. Discover all distinct applicant statuses in the active retreat
  const availableStatuses = useMemo(() => {
    const statuses = new Set();
    allApplicants.forEach(reg => {
      const s = (reg.orientationStatus || reg.interviewStatus || reg.status || 'Uncontacted').trim();
      statuses.add(s);
    });
    return Array.from(statuses);
  }, [allApplicants]);

  // 3. Initialize status filter and candidate selection on open or when applicants change
  useEffect(() => {
    if (!isOpen) return;

    // By default: ALL applicant statuses selected
    const allStatuses = new Set(availableStatuses);
    setSelectedStatusSet(allStatuses);

    // By default: ALL applicants selected
    const allIds = new Set(allApplicants.map(a => a.id));
    setSelectedCandidateIds(allIds);
  }, [isOpen, availableStatuses, allApplicants]);

  // 4. Candidate status categorization & filtering
  const handleToggleStatus = (statusName) => {
    setSelectedStatusSet(prev => {
      const next = new Set(prev);
      if (next.has(statusName)) {
        next.delete(statusName);
      } else {
        next.add(statusName);
      }
      // Re-evaluate candidate IDs matching the new status set
      const matchingIds = new Set();
      allApplicants.forEach(app => {
        const st = (app.orientationStatus || app.interviewStatus || app.status || 'Uncontacted').trim();
        if (next.has(st)) {
          matchingIds.add(app.id);
        }
      });
      setSelectedCandidateIds(matchingIds);
      return next;
    });
  };

  const handleApplyPreset = (preset) => {
    if (preset === 'all') {
      const allS = new Set(availableStatuses);
      setSelectedStatusSet(allS);
      setSelectedCandidateIds(new Set(allApplicants.map(a => a.id)));
    } else if (preset === 'approved') {
      const approvedS = new Set(availableStatuses.filter(s => s.toLowerCase().includes('approved')));
      setSelectedStatusSet(approvedS);
      const appIds = new Set(
        allApplicants
          .filter(a => (a.orientationStatus || a.interviewStatus || a.status || '').toLowerCase().includes('approved'))
          .map(a => a.id)
      );
      setSelectedCandidateIds(appIds);
    } else if (preset === 'pending') {
      const pendingS = new Set(availableStatuses.filter(s => {
        const sl = s.toLowerCase();
        return sl.includes('pending') || sl.includes('uncontacted');
      }));
      setSelectedStatusSet(pendingS);
      const appIds = new Set(
        allApplicants
          .filter(a => {
            const sl = (a.orientationStatus || a.interviewStatus || a.status || '').toLowerCase();
            return sl.includes('pending') || sl.includes('uncontacted');
          })
          .map(a => a.id)
      );
      setSelectedCandidateIds(appIds);
    }
  };

  // 5. Filtered Candidate List for Checklist Display
  const visibleCandidates = useMemo(() => {
    return allApplicants.filter(app => {
      const st = (app.orientationStatus || app.interviewStatus || app.status || 'Uncontacted').trim();
      const matchesStatus = selectedStatusSet.has(st);
      if (!matchesStatus) return false;

      if (!candidateSearch.trim()) return true;
      const q = candidateSearch.toLowerCase().trim();
      const name = `${app.firstName || ''} ${app.lastName || ''}`.toLowerCase();
      const email = (app.email || '').toLowerCase();
      const g = (app.assignedGroup || app.groupId || '').toLowerCase();
      return name.includes(q) || email.includes(q) || g.includes(q);
    });
  }, [allApplicants, selectedStatusSet, candidateSearch]);

  const handleToggleCandidate = (id) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      visibleCandidates.forEach(c => next.add(c.id));
      return next;
    });
  };

  const handleDeselectAllVisible = () => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev);
      visibleCandidates.forEach(c => next.delete(c.id));
      return next;
    });
  };

  // Final selected candidate objects for PDF generation
  const finalCandidatesToPrint = useMemo(() => {
    return allApplicants.filter(a => selectedCandidateIds.has(a.id));
  }, [allApplicants, selectedCandidateIds]);

  // 6. Paper Size Preset Handlers
  const handlePaperPresetChange = (presetId) => {
    setPaperPreset(presetId);
    const p = PAPER_SIZE_PRESETS.find(x => x.id === presetId);
    if (p && p.id !== 'custom') {
      setPageWidth(p.width.toString());
      setPageHeight(p.height.toString());
      setUnit('in');
    }
  };

  // 7. Live Sheet Packing Calculation
  const packingMetrics = useMemo(() => {
    const numPageW = parseFloat(pageWidth) || 8.5;
    const numPageH = parseFloat(pageHeight) || 11.0;
    const numMargin = isNaN(parseFloat(margin)) ? 0 : Math.max(0, parseFloat(margin));
    const numBlanks = isNaN(parseInt(extraBlanksCount, 10)) ? 0 : Math.max(0, parseInt(extraBlanksCount, 10));

    return calculatePackingMetrics({
      template: selectedTemplate,
      pageWidth: numPageW,
      pageHeight: numPageH,
      margin: numMargin,
      unit,
      configType,
      candidateCount: finalCandidatesToPrint.length,
      extraBlanksCount: numBlanks,
      autoOptimizePacking
    });
  }, [
    selectedTemplate,
    pageWidth,
    pageHeight,
    margin,
    unit,
    configType,
    finalCandidatesToPrint.length,
    extraBlanksCount,
    autoOptimizePacking
  ]);

  // 8. Generate and Download PDF
  const handleGeneratePdf = async () => {
    if (!selectedTemplate) {
      setErrorMessage("Please select a nametag template.");
      return;
    }
    const numBlanks = isNaN(parseInt(extraBlanksCount, 10)) ? 0 : Math.max(0, parseInt(extraBlanksCount, 10));
    if (finalCandidatesToPrint.length === 0 && numBlanks === 0) {
      setErrorMessage("Please select at least one candidate or set extra blank nametags > 0.");
      return;
    }
    if (packingMetrics.cardsPerSheet <= 0) {
      setErrorMessage("The paper dimensions and margins are too tight to fit even one nametag.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setSuccessFilename('');
    setProgressState({ step: 1, current: 0, total: 100, text: "Fetching high-resolution background artwork..." });

    try {
      // 1. Fetch full high-resolution image slices from Firestore chunk subcollection
      const fullBase64 = await loadNametagTemplateImage(db, selectedTemplate.id);
      if (!fullBase64) {
        throw new Error("Could not retrieve high-resolution template image slices from database.");
      }

      // 2. Generate PDF using duplex packing engine
      const retreatTitle = activeRetreat?.title || 'Retreat';
      const blanks = isNaN(parseInt(extraBlanksCount, 10)) ? 0 : Math.max(0, parseInt(extraBlanksCount, 10));
      const safeMargin = isNaN(parseFloat(margin)) ? 0 : Math.max(0, parseFloat(margin));
      const safePageW = parseFloat(pageWidth) || 8.5;
      const safePageH = parseFloat(pageHeight) || 11.0;

      const { blob, filename } = await generateNametagsPdf({
        template: selectedTemplate,
        templateImageBase64: fullBase64,
        candidates: finalCandidatesToPrint,
        retreatRoster: allApplicants, // Scoped to full retreat applicant roster for disambiguation
        groupNames: groupNames || {},
        extraBlanksCount: blanks,
        unit,
        pageWidth: safePageW,
        pageHeight: safePageH,
        margin: safeMargin,
        configType,
        autoOptimizePacking,
        retreatTitle,
        onProgress: setProgressState
      });

      // 3. Trigger direct browser download
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setSuccessFilename(filename);
    } catch (err) {
      console.error("PDF Generation failed:", err);
      setErrorMessage(err.message || "Failed to generate nametag PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div
        className="glass-card animate-fade-in"
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Printer size={22} color="#FFFFFF" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Print Nametag Sheets
              </h3>
              <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.9, color: 'rgba(255, 255, 255, 0.85)' }}>
                {activeRetreat?.title || 'Active Retreat'} • Duplex Sheet Compiler
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FFFFFF'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div style={{
          padding: '1.5rem 1.75rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          flex: 1
        }}>

          {/* ERROR OR SUCCESS BANNERS */}
          {errorMessage && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #F87171',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}

          {successFilename && (
            <div style={{
              padding: '0.85rem 1.2rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.88rem',
              fontWeight: 700,
              background: '#DCFCE7',
              color: '#166534',
              border: '1px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <CheckCircle2 size={20} color="#166534" />
              <div>
                <div>PDF Generated & Download Triggered!</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#14532D' }}>
                  Saved as: <code>{successFilename}</code>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: TEMPLATE SELECTION */}
          <div style={{
            background: '#F8FAFC',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                1. Select Nametag Template (Global Universal)
              </label>
              {selectedTemplate && (
                <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                  Footprint: {selectedTemplate.physicalDimensions?.width || 3} × {selectedTemplate.physicalDimensions?.height || 2} {selectedTemplate.physicalDimensions?.unit || 'in'}
                </span>
              )}
            </div>

            {isLoadingTemplates ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <RefreshCw size={16} className="animate-spin" style={{ display: 'inline', marginRight: '0.4rem' }} />
                Loading saved nametag templates...
              </div>
            ) : templates.length === 0 ? (
              <div style={{ padding: '1rem', background: '#FFFBEB', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A', color: '#92400E', fontSize: '0.85rem' }}>
                <strong>No templates found:</strong> Please navigate to Admin Hub &gt; Nametag Templates to upload and configure a template first.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {templates.map(tpl => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid #0284C7' : '1px solid var(--border-color)',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {tpl.thumbnailBase64 ? (
                        <img
                          src={tpl.thumbnailBase64}
                          alt={tpl.title}
                          style={{ width: '42px', height: '32px', objectFit: 'contain', borderRadius: '3px', background: '#F1F5F9' }}
                        />
                      ) : (
                        <Tag size={20} color="var(--sky-blue)" />
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {tpl.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {tpl.physicalDimensions?.width} × {tpl.physicalDimensions?.height} {tpl.physicalDimensions?.unit || 'in'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: CANDIDATE SELECTION & INTERVIEW/APPLICATION STATUS FILTER */}
          <div style={{
            background: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  2. Candidate Selection (WHICH Names to Print)
                </label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  By default, all retreat applicants are included. Use status filters or check candidates individually.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="badge" style={{ background: '#0284C7', color: '#FFFFFF', fontSize: '0.78rem', fontWeight: 700 }}>
                  {finalCandidatesToPrint.length} of {allApplicants.length} selected
                </span>
              </div>
            </div>

            {/* Quick Status Presets & Checkboxes */}
            <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  STATUS FILTER PRESETS:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('all')}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    All Applicants (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('approved')}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    Approved Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('pending')}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}
                  >
                    Pending / Uncontacted
                  </button>
                </div>
              </div>

              {/* Status Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {availableStatuses.map(status => {
                  const isChecked = selectedStatusSet.has(status);
                  const count = allApplicants.filter(a => (a.orientationStatus || a.interviewStatus || a.status || 'Uncontacted').trim() === status).length;
                  return (
                    <label
                      key={status}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '16px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: isChecked ? '#DBEAFE' : '#FFFFFF',
                        border: isChecked ? '1px solid #93C5FD' : '1px solid var(--border-color)',
                        color: isChecked ? '#1E40AF' : 'var(--text-secondary)'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleStatus(status)}
                        style={{ margin: 0, accentColor: '#0284C7' }}
                      />
                      <span>{status}</span>
                      <span style={{ opacity: 0.65, fontSize: '0.68rem' }}>({count})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Collapsible Granular Candidate Checklist */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <div style={{
                padding: '0.6rem 0.85rem',
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                  <Search size={14} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search candidates by name, email, or team..."
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.78rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      background: '#FFFFFF'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--sky-blue)', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--border-color)' }}>|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllVisible}
                    style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Deselect All
                  </button>
                  <span style={{ color: 'var(--border-color)' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setIsRosterExpanded(!isRosterExpanded)}
                    style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isRosterExpanded ? 'Collapse List ▲' : 'Expand List ▼'}
                  </button>
                </div>
              </div>

              {isRosterExpanded && (
                <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#FFFFFF' }}>
                  {visibleCandidates.length === 0 ? (
                    <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No candidates match current status filters and search query.
                    </div>
                  ) : (
                    visibleCandidates.map(applicant => {
                      const isSelected = selectedCandidateIds.has(applicant.id);
                      const dispName = resolveParticipantDisplayName(applicant, allApplicants);
                      const teamName = resolveParticipantTeamName(applicant, groupNames);
                      const status = applicant.orientationStatus || applicant.interviewStatus || applicant.status || 'Uncontacted';

                      return (
                        <div
                          key={applicant.id}
                          onClick={() => handleToggleCandidate(applicant.id)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderBottom: '1px solid #F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            background: isSelected ? '#F8FAFC' : '#FFFFFF',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, overflow: 'hidden' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { }} // Controlled by parent div
                              style={{ margin: 0, accentColor: '#0284C7' }}
                            />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <strong style={{ color: 'var(--text-main)' }}>{dispName}</strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginLeft: '0.5rem' }}>
                                ({applicant.email})
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            {teamName && (
                              <span style={{ fontSize: '0.7rem', color: '#D97706', background: '#FEF3C7', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                {teamName}
                              </span>
                            )}
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: status.toLowerCase().includes('approved') ? '#DCFCE7' : '#F1F5F9',
                              color: status.toLowerCase().includes('approved') ? '#166534' : 'var(--text-secondary)'
                            }}>
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

          </div>

          {/* SECTION 3: PRINT CONFIGURATIONS (THE 4 PRINT MODES) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
              3. Printout Configuration
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {PRINT_CONFIGURATIONS.map(cfg => {
                const isSelected = configType === cfg.id;
                return (
                  <div
                    key={cfg.id}
                    onClick={() => setConfigType(cfg.id)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid #0284C7' : '1px solid var(--border-color)',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <input
                          type="radio"
                          name="configType"
                          checked={isSelected}
                          onChange={() => setConfigType(cfg.id)}
                          style={{ margin: 0, accentColor: '#0284C7' }}
                        />
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '10px',
                          background: isSelected ? '#0284C7' : '#F1F5F9',
                          color: isSelected ? '#FFFFFF' : 'var(--text-muted)'
                        }}>
                          {cfg.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {cfg.title}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      {cfg.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: PAPER SIZE, MARGINS & BLANKS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            background: '#F8FAFC',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            {/* Paper Size Preset */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                PAPER SIZE PRESET
              </label>
              <select
                value={paperPreset}
                onChange={(e) => handlePaperPresetChange(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
              >
                {PAPER_SIZE_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Dimensions if custom selected */}
            {paperPreset === 'custom' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    PAGE WIDTH ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={pageWidth}
                    onChange={(e) => setPageWidth(e.target.value)}
                    onBlur={() => {
                      const val = parseFloat(pageWidth);
                      if (isNaN(val) || val <= 0) setPageWidth('8.5');
                    }}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    PAGE HEIGHT ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={pageHeight}
                    onChange={(e) => setPageHeight(e.target.value)}
                    onBlur={() => {
                      const val = parseFloat(pageHeight);
                      if (isNaN(val) || val <= 0) setPageHeight('11.0');
                    }}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
                  />
                </div>
              </>
            )}

            {/* Unit Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                MEASUREMENT UNIT
              </label>
              <select
                value={unit}
                onChange={(e) => {
                  const newUnit = e.target.value;
                  const numW = parseFloat(pageWidth) || 8.5;
                  const numH = parseFloat(pageHeight) || 11.0;
                  const numM = parseFloat(margin) || 0;
                  setPageWidth(convertLength(numW, unit, newUnit).toFixed(2));
                  setPageHeight(convertLength(numH, unit, newUnit).toFixed(2));
                  setMargin(convertLength(numM, unit, newUnit).toFixed(2));
                  setUnit(newUnit);
                }}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
              >
                <option value="in">Inches (in)</option>
                <option value="cm">Centimeters (cm)</option>
                <option value="mm">Millimeters (mm)</option>
              </select>
            </div>

            {/* Margin Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                BORDER MARGIN ({unit})
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(margin);
                  if (isNaN(val) || val < 0) setMargin('0');
                }}
                placeholder="0.0"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
              />
            </div>

            {/* Extra Blank Nametags */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                EXTRA BLANK NAMETAGS
              </label>
              <input
                type="number"
                min="0"
                value={extraBlanksCount}
                onChange={(e) => setExtraBlanksCount(e.target.value)}
                onBlur={() => {
                  const val = parseInt(extraBlanksCount, 10);
                  if (isNaN(val) || val < 0) setExtraBlanksCount('0');
                }}
                placeholder="0"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.82rem', background: '#FFFFFF' }}
              />
            </div>

            {/* 90° Mixed Packing Guillotine Optimizer Toggle */}
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              border: autoOptimizePacking ? '1.5px solid #0284C7' : '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={autoOptimizePacking}
                  onChange={(e) => setAutoOptimizePacking(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#0284C7', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚡ Max-Density 90° Mixed Packing (Auto-Optimizer)
                    {packingMetrics.isOptimized && packingMetrics.capacityGain > 0 && (
                      <span className="badge badge-sky" style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', fontWeight: 700, fontSize: '0.72rem' }}>
                        +{packingMetrics.capacityGain} cards/sheet boosted!
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.15rem' }}>
                    Employs 2-block guillotine cutting with rotated strip packing to maximize sheet yield while maintaining single straight edge-to-edge paper cuts.
                  </div>
                </div>
              </label>

              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: autoOptimizePacking ? '#0284C7' : '#94A3B8' }}>
                {autoOptimizePacking ? (packingMetrics.isOptimized ? 'Optimized' : 'Enabled') : 'Off'}
              </div>
            </div>
          </div>

          {/* SECTION 5: LIVE SHEET PACKING BREAKDOWN PANEL */}
          <div style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: '#FFFFFF',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                🏷️ GRID PER SHEET
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {packingMetrics.cardsPerSheet} cards/sheet
                {packingMetrics.isOptimized && packingMetrics.capacityGain > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#86EFAC', marginLeft: '0.4rem', fontWeight: 700 }}>
                    (+{packingMetrics.capacityGain} boost)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.1rem' }}>
                {packingMetrics.isOptimized ? `Guillotine: ${packingMetrics.layoutType}` : `${packingMetrics.cols} × ${packingMetrics.rows} grid`} | Slack: {(packingMetrics.slackX ?? 0).toFixed(2)} × {(packingMetrics.slackY ?? 0).toFixed(2)} {unit}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                👥 TOTAL NAMETAGS
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {packingMetrics.totalNametags} badges
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.1rem' }}>
                {finalCandidatesToPrint.length} selected + {extraBlanksCount || 0} blanks
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                📄 REQUIRED PAGES
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {packingMetrics.totalPages} PDF pages
              </div>
              <div style={{ fontSize: '0.7rem', color: '#38BDF8', marginTop: '0.1rem' }}>
                {packingMetrics.physicalSheets} physical paper sheet(s)
              </div>
            </div>
          </div>

          {/* PROGRESS BAR */}
          {isGenerating && (
            <div style={{
              background: '#EFF6FF',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #BFDBFE'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#1E40AF', marginBottom: '0.4rem' }}>
                <span>{progressState.text || 'Compiling printout sheets...'}</span>
                {progressState.total > 0 && (
                  <span>{progressState.current} / {progressState.total}</span>
                )}
              </div>
              <div style={{
                height: '8px',
                background: '#DBEAFE',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563EB, #38BDF8)',
                  width: `${progressState.total > 0 ? Math.round((progressState.current / progressState.total) * 100) : 50}%`,
                  transition: 'width 0.2s ease-in-out'
                }} />
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGenerating || !selectedTemplate || packingMetrics.cardsPerSheet <= 0}
            className="btn btn-primary"
            style={{
              padding: '0.7rem 1.5rem',
              fontSize: '0.92rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Compiling Duplex PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                Generate Printable PDF
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
