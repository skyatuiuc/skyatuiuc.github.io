import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HERO_GALLERY_IMAGES, GALLERY_AUTO_ROTATE_INTERVAL_MS } from '../data/heroGalleryData';

export default function HeroGallery({ children }) {
  const { isAdmin } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [failedImages, setFailedImages] = useState({});
  const timerRef = useRef(null);

  const totalSlides = HERO_GALLERY_IMAGES.length;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  // Continuous Auto-rotate timer
  useEffect(() => {
    if (!isPlaying || totalSlides <= 1) return;

    timerRef.current = setInterval(() => {
      handleNext();
    }, GALLERY_AUTO_ROTATE_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalSlides, handleNext]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleImageError = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const currentSlide = HERO_GALLERY_IMAGES[currentIndex] || HERO_GALLERY_IMAGES[0];

  return (
    <section style={{
      position: 'relative',
      padding: '4.5rem 0 4rem 0',
      backgroundColor: 'var(--bg-canvas)',
      overflow: 'hidden'
    }}>
      
      {/* AMBIENT BACKGROUND GLOWS (Blue top-left, Gold bottom-right) */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        maxWidth: '650px',
        maxHeight: '650px',
        background: 'radial-gradient(circle, rgba(31, 116, 241, 0.08) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-5%',
        width: '45vw',
        height: '45vw',
        maxWidth: '550px',
        maxHeight: '550px',
        background: 'radial-gradient(circle, rgba(250, 188, 29, 0.09) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hero-split-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'clamp(2rem, 4vw, 3.5rem)',
          alignItems: 'center'
        }}>
          
          {/* LEFT COLUMN: HERO TEXT & VALUE PROP */}
          <div style={{ maxWidth: '620px' }}>
            {children}
          </div>

          {/* RIGHT COLUMN: VIVID PHOTO GALLERY SHOWCASE STAGE */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '580px' }}>
              
              {/* Soft Ambient Colorful Halo Behind Card */}
              <div style={{
                position: 'absolute',
                top: '6%',
                left: '6%',
                right: '6%',
                bottom: '6%',
                background: 'linear-gradient(135deg, rgba(31, 116, 241, 0.22) 0%, rgba(250, 188, 29, 0.22) 100%)',
                filter: 'blur(28px)',
                borderRadius: '28px',
                zIndex: 0,
                pointerEvents: 'none'
              }} />

              {/* Elevated Showcase Photo Card */}
              <div 
                className="hero-gallery-card"
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 10',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                  border: '1px solid rgba(31, 116, 241, 0.18)',
                  boxShadow: '0 20px 45px -10px rgba(35, 39, 95, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8)',
                  zIndex: 1
                }}
              >
                
                {/* Rotating Images Layer */}
                {HERO_GALLERY_IMAGES.map((img, idx) => {
                  const isActive = idx === currentIndex;
                  const isFailed = failedImages[img.id];
                  const imageSrc = isFailed ? img.fallbackSrc : img.src;

                  return (
                    <div
                      key={img.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'scale(1.02)' : 'scale(1.0)',
                        transition: 'opacity 0.9s cubic-bezier(0.4, 0, 0.2, 1), transform 5s ease-out',
                        pointerEvents: 'none'
                      }}
                    >
                      <img
                        src={imageSrc}
                        alt={img.title || 'SKY UIUC Retreat Moment'}
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        onError={() => handleImageError(img.id)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center 35%',
                          display: 'block'
                        }}
                      />
                    </div>
                  );
                })}

                {/* Subtle Bottom Gradient Vignette for Caption Legibility */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '100px',
                  background: 'linear-gradient(to top, rgba(22, 25, 66, 0.70) 0%, rgba(22, 25, 66, 0.2) 65%, transparent 100%)',
                  pointerEvents: 'none',
                  zIndex: 2
                }} />

                {/* BOTTOM OVERLAY: Photo Caption */}
                <div style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '1.25rem',
                  right: '1.25rem',
                  zIndex: 3,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}>
                  
                  {/* Photo Title & Caption */}
                  <div style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.25 }}>
                      {currentSlide.title}
                    </div>
                    {currentSlide.caption && (
                      <div style={{ fontSize: '0.78rem', opacity: 0.92, marginTop: '2px', lineHeight: 1.3 }}>
                        {currentSlide.caption}
                      </div>
                    )}
                  </div>

                  {/* Super Admin-Only Controls */}
                  {isAdmin && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(255, 255, 255, 0.92)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      padding: '0.3rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      flexShrink: 0
                    }}>
                      <button
                        onClick={togglePlay}
                        title={isPlaying ? "Pause rotation (Admin)" : "Resume rotation (Admin)"}
                        aria-label={isPlaying ? "Pause rotation" : "Resume rotation"}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%'
                        }}
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      </button>

                      <button
                        onClick={handlePrev}
                        title="Previous photo (Admin)"
                        aria-label="Previous photo"
                        style={{
                          background: 'rgba(35, 39, 95, 0.06)',
                          border: 'none',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%'
                        }}
                      >
                        <ChevronLeft size={13} />
                      </button>

                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '0 2px' }}>
                        {currentIndex + 1}/{totalSlides}
                      </span>

                      <button
                        onClick={handleNext}
                        title="Next photo (Admin)"
                        aria-label="Next photo"
                        style={{
                          background: 'var(--sky-blue)',
                          border: 'none',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%'
                        }}
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}

                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
