import React, { useState } from 'react';
import { Calendar, MapPin, Users, HeartPulse, Brain, Sparkles, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Mail, BookOpen, ShieldCheck } from 'lucide-react';
import { getRetreatDaySchedule } from '../data/scheduleData';

export default function RetreatDetailsCard({ retreat, showHeader = false, compact = false }) {
  const [showFullOverview, setShowFullOverview] = useState(true);

  if (!retreat) return null;

  const schedule = getRetreatDaySchedule(retreat);

  return (
    <div 
      className="glass-card"
      style={{
        padding: compact ? '1.5rem' : '2.25rem',
        background: '#FFFFFF',
        border: '1px solid rgba(35, 39, 95, 0.1)',
        boxShadow: 'var(--shadow-md)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '2rem'
      }}
    >
      {showHeader && (
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: compact ? '1.35rem' : '1.7rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
            {retreat.title}
          </h3>
        </div>
      )}

      {/* TOP LOGISTICS GRID: DATES/TIMINGS & LOCATION/INSTRUCTORS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        alignItems: 'stretch',
        marginBottom: '1.75rem'
      }}>
        
        {/* DATES & TIMES CARD: EACH DAY ON A NEW LINE */}
        <div style={{
          background: 'rgba(31, 116, 241, 0.04)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(31, 116, 241, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--sky-blue)',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem'
            }}>
              <Calendar size={15} /> Dates & Timings
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {schedule.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.55rem 0.85rem',
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(31, 116, 241, 0.12)',
                    borderLeft: '3px solid var(--sky-blue)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.88rem' }}>
                    {item.fullLabel}
                  </span>
                  <span style={{ color: '#B45309', fontWeight: 700, fontSize: '0.84rem' }}>
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.85rem', lineHeight: 1.35 }}>
            ⚠️ <em>Attendance at all 3 sessions is required to participate in the program.</em>
          </div>
        </div>

        {/* LOCATION & INSTRUCTORS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', justifyContent: 'space-between' }}>
          
          {/* Location & Address Card */}
          <div style={{
            background: 'var(--sky-flower-light)',
            padding: '1.15rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(232, 74, 39, 0.2)',
            flex: 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#C2410C',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.35rem'
            }}>
              <MapPin size={15} /> Location & Venue
            </div>
            
            <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.35 }}>
              {retreat.location || ''}
            </div>

            {retreat.address && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                {retreat.address}
              </div>
            )}
          </div>

          {/* Instructors Card */}
          <div style={{
            background: 'var(--sky-sun-light)',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(250, 188, 29, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#B45309',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.25rem'
            }}>
              <Users size={15} /> Instructors
            </div>
            <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}>
              {retreat.teachers || 'SKY Certified Teachers'}
            </div>
          </div>

        </div>

      </div>

      {/* DETAILED ABOUT THE RETREAT ACCORDION / SHOWCASE */}
      <div style={{
        background: '#F8FAFC',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div 
          onClick={() => setShowFullOverview(!showFullOverview)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={18} color="var(--sky-blue)" />
            <h4 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              About the SKY Happiness Retreat
            </h4>
          </div>
          <button 
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--sky-blue)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            {showFullOverview ? <><ChevronUp size={16} /> Hide Details</> : <><ChevronDown size={16} /> View Details</>}
          </button>
        </div>

        {showFullOverview && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(35, 39, 95, 0.08)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              The <strong>SKY Happiness Retreat</strong> is a total well-being training offered to thousands of university students, faculty, staff, and community members across the country. A landmark study at <strong>Yale University</strong> found that the SKY program significantly reduces stress and depression while creating long-lasting improvements in mental health, mindfulness, positive emotions, and social connectedness.
            </p>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>
              The course features interactive group processes, experiential learning, emotional intelligence training, breathwork, gentle yoga, and evidence-based <strong>Sudarshan Kriya (SKY) Meditation</strong>. It is one of the most vibrant spaces to de-stress, connect with yourself, build genuine friendships, and have fun!
            </p>

            {/* Core Benefits 4-Card Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ background: '#FFFFFF', padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(31, 116, 241, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--sky-blue)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <HeartPulse size={16} /> Breathwork & Meditation
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Master powerful evidence-based breath practices that bring mental clarity, calm, and autonomic balance.
                </div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(250, 188, 29, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#B45309', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <Brain size={16} /> Emotional Regulation
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Gain practical tools to manage stress, boost energy, overcome negative emotions, and navigate criticism.
                </div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(232, 74, 39, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#C2410C', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <Users size={16} /> Authentic Connection
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Build lasting friendships, increase enthusiasm and inspiration, and develop empathetic leadership.
                </div>
              </div>

              <div style={{ background: '#FFFFFF', padding: '0.9rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#16A34A', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <ShieldCheck size={16} /> Harvard-Proven Sleep
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  Harvard research proved participants developed superior sleep quality & resilience against anticipatory stress.
                </div>
              </div>
            </div>

            {/* Fee & Scholarship Breakdown */}
            <div style={{
              background: '#FFFFFF',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(35, 39, 95, 0.1)',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CheckCircle2 size={16} color="var(--sky-blue)" /> Scholarship & Fee Structure
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.65rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <strong>UIUC Students:</strong> <span style={{ fontWeight: 700 }}>$0</span>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <strong>Post-Docs & Scholars:</strong> <span style={{ fontWeight: 700 }}>$25</span>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <strong>Faculty, Staff & Non-UIUC Students:</strong> <span style={{ fontWeight: 700 }}>$50</span>
                </div>
                <div style={{ padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <strong>Non-UIUC Affiliates & Non-Students:</strong> <span style={{ fontWeight: 700 }}>$275</span>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                *Please note, this retreat originally costs $275 without funding. We have limited funding and spots available. Availability is first-come, first-served and requires attendance to all sessions.
              </div>
            </div>

            {/* Verified Clinical Publications Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={14} color="var(--sky-blue)" /> Verified Research:
              </span>
              <a href="https://doi.org/10.3389/fpsyt.2020.00590" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                Yale Clinical Publication <ExternalLink size={12} />
              </a>
              <a href="https://youtu.be/Vlu3arLc0WE" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                Yale Short Film <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Contact Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: '#F8FAFC',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <div>
          Have questions or need accommodations?
        </div>
        <div>
          Contact: <a href="mailto:skyatuiuc@gmail.com" style={{ color: 'var(--sky-blue)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Mail size={14} /> skyatuiuc@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}
