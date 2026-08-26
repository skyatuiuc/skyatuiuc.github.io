import React, { useState } from 'react';
import { RESEARCH_CATEGORIES, RESEARCH_PAPERS } from '../data/researchData';
import { Search, BookOpen, ExternalLink, FileText, CheckCircle2, X } from 'lucide-react';

export default function Research() {
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePaperModal, setActivePaperModal] = useState(null);

  // Helper to build reliable relative PDF URL
  const getPdfUrl = (pdfPath) => {
    if (!pdfPath) return '#';
    if (pdfPath.startsWith('http')) return pdfPath;
    const clean = pdfPath.replace(/^\//, '');
    return `${import.meta.env.BASE_URL}${clean}`;
  };

  // Filter papers
  const filteredPapers = RESEARCH_PAPERS.filter(paper => {
    const matchesCategory = selectedCategory === "All Categories" || paper.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
                          paper.title.toLowerCase().includes(q) ||
                          paper.authors.toLowerCase().includes(q) ||
                          paper.institution.toLowerCase().includes(q) ||
                          paper.abstract.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ padding: '3.5rem 0 6rem 0' }}>
      <div className="container">
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 3rem auto' }}>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Scientific Research Repository on <span style={{ color: 'var(--sky-blue)' }}>SKY Happiness Retreat</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Explore landmark clinical trials conducted by researchers at Yale University, Harvard Medical School, Stanford University, and MIT proving the neurological, hormonal, and psychological efficacy of SKY Breath Meditation.
          </p>
        </div>

        {/* Clinical Metric Impact Banner */}
        <div className="glass-card" style={{
          padding: '2.25rem',
          marginBottom: '3.5rem',
          background: 'linear-gradient(135deg, rgba(215, 229, 255, 0.45) 0%, rgba(255, 245, 219, 0.45) 100%)',
          border: '1px solid rgba(31, 116, 241, 0.2)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', textAlign: 'center', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Proven Clinical Trial Outcomes vs. Control Groups
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', textAlign: 'center' }}>
            {[
              { val: '56%', label: 'Stress Hormone (Cortisol) Drop', source: 'Stanford / Yale', color: 'var(--sky-blue)' },
              { val: '68%', label: 'Clinical Depression Remission', source: 'Harvard Medical School', color: 'var(--illini-orange)' },
              { val: '+65%', label: 'Deep Focus Alpha Waves', source: 'EEG Brainwave Scans', color: '#B45309' },
              { val: '128', label: 'Immune Repair Genes Up', source: 'MIT & PLOS ONE', color: '#3F6212' }
            ].map((stat, i) => (
              <div key={i} style={{ padding: '1.25rem 1rem', background: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(35, 39, 95, 0.03)' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: stat.color }}>{stat.val}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>{stat.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{stat.source}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search studies by title, university, author (e.g. Yale, Cortisol, Depression)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.95rem 1.25rem 0.95rem 3.25rem',
                background: '#FFFFFF',
                border: '1px solid rgba(35, 39, 95, 0.15)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-main)',
                fontSize: '0.975rem',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem' }}>
            {RESEARCH_CATEGORIES.map((cat, idx) => (
              <button 
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedCategory === cat ? '1px solid var(--sky-blue)' : '1px solid var(--border-color)',
                  background: selectedCategory === cat ? 'var(--sky-blue)' : '#FFFFFF',
                  color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-secondary)',
                  boxShadow: selectedCategory === cat ? '0 4px 12px rgba(31, 116, 241, 0.25)' : 'var(--shadow-sm)',
                  transition: 'var(--transition-fast)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Papers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
          {filteredPapers.map((paper) => (
            <div 
              key={paper.id}
              className="glass-card"
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                transition: 'var(--transition-smooth)'
              }}
            >
              <div>
                {/* Header badge */}
                <div style={{ marginBottom: '1rem' }}>
                  <span className="badge badge-sky" style={{ fontSize: '0.72rem' }}>
                    {paper.institution}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.35, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                  {paper.title}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500 }}>
                  {paper.authors} • <em>{paper.journal}</em> ({paper.year})
                </p>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {paper.abstract}
                </p>
              </div>

              {/* Action row: Always exactly on the same single line */}
              <div style={{ 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '0.75rem',
                width: '100%'
              }}>
                <button 
                  onClick={() => setActivePaperModal(paper)}
                  className="btn btn-sm btn-secondary"
                  style={{ gap: '0.4rem', flex: '1 1 50%', justifyContent: 'center', whiteSpace: 'nowrap' }}
                >
                  <FileText size={14} /> Full Details
                </button>

                <a 
                  href={getPdfUrl(paper.pdfPath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-sky"
                  style={{ gap: '0.4rem', flex: '1 1 50%', justifyContent: 'center', whiteSpace: 'nowrap' }}
                >
                  PDF Article <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredPapers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--text-main)' }}>No research studies match your search filter.</h3>
            <p>Try clearing your search keyword or selecting "All Categories".</p>
          </div>
        )}

      </div>

      {/* PAPER DETAILS MODAL */}
      {activePaperModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(35, 39, 95, 0.45)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }} onClick={() => setActivePaperModal(null)}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', position: 'relative', background: '#FFFFFF', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            
            <button 
              onClick={() => setActivePaperModal(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(35, 39, 95, 0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Clean Category Badge */}
            <span className="badge badge-orange" style={{ marginBottom: '1rem', display: 'inline-block' }}>
              {activePaperModal.category}
            </span>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.3, color: 'var(--text-main)' }}>
              {activePaperModal.title}
            </h2>

            <p style={{ color: 'var(--sky-blue)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {activePaperModal.authors} — {activePaperModal.institution} ({activePaperModal.year})
            </p>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Published in <em>{activePaperModal.journal}</em> • DOI: <a href={activePaperModal.doiUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-blue)', textDecoration: 'underline' }}>{activePaperModal.doi}</a>
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Key Measured Clinical Metrics
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {activePaperModal.metrics.map((m, i) => (
                  <div key={i} style={{ background: 'var(--sky-blue-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(31, 116, 241, 0.15)' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--sky-blue)' }}>{m.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Abstract & Methodology
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {activePaperModal.abstract}
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Key Findings & Conclusions
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activePaperModal.keyFindings.map((finding, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} color="#3F6212" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
              <a 
                href={activePaperModal.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ gap: '0.4rem' }}
              >
                Journal DOI <ExternalLink size={14} />
              </a>

              <a 
                href={getPdfUrl(activePaperModal.pdfPath)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ gap: '0.4rem' }}
              >
                Read Full PDF Article <ExternalLink size={16} />
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
