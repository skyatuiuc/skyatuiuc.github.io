import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { INITIAL_RETREATS, GENERAL_FAQS } from '../data/retreatData';
import { getRetreatDaySchedule } from '../data/scheduleData';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';
import { Calendar, MapPin, Users, HeartPulse, Brain, Award, ChevronDown, ArrowRight, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import HeroGallery from '../components/HeroGallery';

export default function Home() {
  const [activeFaq, setActiveFaq] = useState(null);
  
  // Retreat history state
  const [retreats, setRetreats] = useState(() => {
    const saved = localStorage.getItem('sky_retreat_history');
    return saved ? JSON.parse(saved) : INITIAL_RETREATS;
  });

  // Sync retreats live from Firestore or localStorage
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
          setRetreats(fetched);
          localStorage.setItem('sky_retreat_history', JSON.stringify(fetched));
        }, (err) => console.warn("Home retreat sync notice:", err));
      } catch (e) {
        console.warn("Home retreat Firestore error:", e);
      }
    }
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Frontend Dynamic Categorization based on current date
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingRetreats = retreats
    .filter(r => r.endDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  const pastRetreats = retreats
    .filter(r => r.endDate < todayStr)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const upcomingRetreat = upcomingRetreats[0];

  return (
    <div style={{ overflowX: 'hidden' }}>
      
      {/* HERO SECTION WITH ROTATING BACKGROUND GALLERY */}
      <HeroGallery>
        <div>
          
          {/* Main Headline */}
          <h1 style={{
            fontFamily: 'var(--font-headline)',
            fontSize: 'clamp(2.1rem, 3.6vw, 3.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            marginBottom: '1.25rem',
            color: 'var(--text-main)'
          }}>
            Creating More Joyful, Resilient Campuses Through <span style={{ color: 'var(--sky-blue)' }}>SKY Breathwork</span> & Meditation
          </h1>

          {/* Subheader */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(1rem, 1.6vw, 1.125rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '2rem'
          }}>
            An evidence-based program proven by Yale, Harvard, and Stanford to reduce stress, improve sleep, and build lasting mindfulness & student leadership.
          </p>

          {/* Action Buttons */}
          <div className="mobile-stack-buttons" style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {upcomingRetreat ? (
              <Link 
                to={`/register/${upcomingRetreat.id}`}
                className="btn btn-primary"
                style={{ padding: '0.85rem 1.65rem', fontSize: '0.95rem' }}
              >
                Apply for Upcoming Retreat <ArrowRight size={17} />
              </Link>
            ) : (
              <Link 
                to="/register" 
                className="btn btn-primary"
                style={{ padding: '0.85rem 1.65rem', fontSize: '0.95rem' }}
              >
                Apply for Retreat <ArrowRight size={17} />
              </Link>
            )}

            <Link to="/research" className="btn btn-secondary" style={{ padding: '0.85rem 1.65rem', fontSize: '0.95rem' }}>
              <Brain size={17} color="var(--sky-blue)" /> Explore Clinical Research
            </Link>
          </div>

          {/* Quick Stat Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1.25rem',
            marginTop: '2.5rem',
            padding: '0.75rem 1.4rem',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Users size={17} color="var(--sky-blue)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-subheading)', color: 'var(--text-main)' }}>
                500+ UIUC Students Trained
              </span>
            </div>
            <div style={{ width: '1px', height: '18px', background: 'var(--border-color)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Award size={17} color="#D97706" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-subheading)', color: 'var(--text-main)' }}>
                Yale, Harvard & Stanford Clinical Trials
              </span>
            </div>
          </div>

        </div>
      </HeroGallery>

      {/* UPCOMING RETREAT BANNER */}
      <section id="upcoming-retreat" style={{ padding: '4.5rem 0', position: 'relative' }}>
        <div className="container">
          {upcomingRetreat ? (
            <div className="glass-card" style={{
              padding: 'clamp(2rem, 3.5vw, 3.25rem)',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F4F8FF 100%)',
              border: '1px solid rgba(31, 116, 241, 0.25)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-xl)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 'clamp(2rem, 3vw, 3.5rem)',
                alignItems: 'stretch'
              }}>
                
                {/* LEFT COLUMN: WHAT THE RETREAT IS ABOUT & VALUE PROPOSITION */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{
                      fontSize: 'clamp(1.85rem, 2.5vw, 2.4rem)',
                      fontWeight: 800,
                      marginBottom: '1rem',
                      color: 'var(--text-main)',
                      letterSpacing: '-0.015em',
                      lineHeight: 1.2
                    }}>
                      {upcomingRetreat.title}
                    </h2>
                    
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '1rem' }}>
                      SKY Happiness Retreat is a total well-being training offered to thousands of university students, faculty, and staff across the country. A recent landmark study at <strong>Yale University</strong> found that SKY Happiness Retreat significantly reduces stress, depression, and has a long-lasting impact on mental health, mindfulness, positive emotion, and social connectedness.
                    </p>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                      The retreat introduces <strong>SKY Meditation</strong>, an evidence-based meditation practice integrated with breathwork that significantly increases calmness and reduces anxiety and stress markers. The course features interactive group processes, experiential learning, emotional intelligence training, breathwork, gentle yoga, and meditation. It's one of the coolest places to connect with yourself, make new friends, and have fun!
                    </p>

                    {/* Benefit Highlight Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.85rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.85rem 1rem',
                        background: '#FFFFFF',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(31, 116, 241, 0.15)',
                        boxShadow: '0 2px 6px rgba(35, 39, 95, 0.03)'
                      }}>
                        <HeartPulse size={19} color="var(--sky-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Evidence-Based Breathwork</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '0.15rem' }}>Learn powerful breathwork that brings mental clarity, calm, and balances the nervous system</div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.85rem 1rem',
                        background: '#FFFFFF',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(250, 188, 29, 0.28)',
                        boxShadow: '0 2px 6px rgba(35, 39, 95, 0.03)'
                      }}>
                        <Brain size={19} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Emotional Intelligence</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '0.15rem' }}>Gain the ability to effectively manage stress, energy, negative emotions, and mistakes</div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.85rem 1rem',
                        background: '#FFFFFF',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(232, 74, 39, 0.2)',
                        boxShadow: '0 2px 6px rgba(35, 39, 95, 0.03)'
                      }}>
                        <Users size={19} color="#C2410C" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Connection & Community</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '0.15rem' }}>Increase enthusiasm, inspiration, self-confidence, and make genuine campus friendships</div>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.65rem',
                        padding: '0.85rem 1rem',
                        background: '#FFFFFF',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        boxShadow: '0 2px 6px rgba(35, 39, 95, 0.03)'
                      }}>
                        <Sparkles size={19} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Harvard-Proven Sleep</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '0.15rem' }}>Harvard study proved participants developed superior sleep quality & resilience against stress</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: LOGISTICS, SCHEDULE & RESERVATION CARD */}
                <div style={{
                  background: '#FFFFFF',
                  padding: '2rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid rgba(31, 116, 241, 0.18)',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    {/* Dates & Timings Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      color: 'var(--sky-blue)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.75rem'
                    }}>
                      <Calendar size={15} /> Dates & Timings
                    </div>

                    {/* Day Schedule List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                      {getRetreatDaySchedule(upcomingRetreat).map((s, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.55rem 0.85rem',
                          background: 'var(--sky-blue-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '3px solid var(--sky-blue)'
                        }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem' }}>{s.fullLabel}</span>
                          <span style={{ color: '#B45309', fontWeight: 700, fontSize: '0.85rem' }}>{s.time}</span>
                        </div>
                      ))}
                    </div>

                    {/* Location & Instructors Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
                      {/* Location */}
                      <div style={{
                        background: 'var(--sky-flower-light)',
                        padding: '0.8rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(232, 74, 39, 0.2)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#C2410C', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                          <MapPin size={14} /> Location
                        </div>
                        <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.35 }}>
                          {upcomingRetreat.location || 'Sidney Lu Mechanical Engineering Building, Room 2100'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                          {upcomingRetreat.address || 'UIUC Campus, Urbana IL'}
                        </div>
                      </div>

                      {/* Instructors */}
                      <div style={{
                        background: 'var(--sky-sun-light)',
                        padding: '0.8rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(250, 188, 29, 0.25)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B45309', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                          <Users size={14} /> Instructors
                        </div>
                        <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem' }}>
                          {upcomingRetreat.teachers || 'SKY Certified Teachers'}
                        </div>
                      </div>
                    </div>

                    {/* Simplified Funding & Scholarship Pill on the Right */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.75rem 0.95rem',
                      background: 'var(--sky-sun-light)',
                      border: '1px solid rgba(250, 188, 29, 0.35)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      color: '#78350F',
                      marginBottom: '1.25rem',
                      lineHeight: 1.45
                    }}>
                      <CheckCircle2 size={16} color="#B45309" style={{ flexShrink: 0 }} />
                      <span><strong>Fully funded for UIUC Students ($0)</strong> • Partial funding for post-docs ($25), faculty, staff, alumni & non-affiliates ($50). Originally $275.</span>
                    </div>
                  </div>

                  <div>
                    <Link 
                      to={`/register/${upcomingRetreat.id}`}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.95rem', justifyContent: 'center', fontSize: '1rem', marginBottom: '0.75rem' }}
                    >
                      Learn More and Apply <ArrowRight size={18} />
                    </Link>

                    <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Questions? Contact <a href="mailto:skyatuiuc@gmail.com" style={{ color: 'var(--sky-blue)', fontWeight: 600 }}>skyatuiuc@gmail.com</a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Calendar size={48} color="var(--sky-blue)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>No Upcoming Retreat Currently Scheduled</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
                We are currently finalizing dates for our next campus retreat session. Super Admins can schedule new retreats directly from the Admin Hub.
              </p>
              <a href="mailto:skyatuiuc@gmail.com" className="btn btn-secondary">
                Contact skyatuiuc@gmail.com for Info
              </a>
            </div>
          )}

          {/* PAST RETREATS DISPLAY */}
          {pastRetreats.length > 0 && (
            <div style={{ marginTop: '3.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
                <Clock size={20} color="var(--sky-blue)" /> Past Retreat History ({pastRetreats.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {pastRetreats.map((ret) => (
                  <div key={ret.id} className="glass-card" style={{ padding: '1.75rem' }}>
                    <span className="badge badge-sky" style={{ fontSize: '0.7rem', marginBottom: '0.75rem' }}>Past Retreat</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{ret.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      📅 {ret.startDate} - {ret.endDate} • 📍 {ret.location}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      👥 {ret.participantCount} Students Trained • 👩‍🏫 {ret.teachers}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* THE SCIENCE OF SKY BREATH MEDITATION */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '740px', margin: '0 auto 3.5rem auto' }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
              Why SKY Breath Meditation Works
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Unlike static meditation, SKY uses specific natural rhythms of breath to balance your autonomic nervous system, rapidly purging stored stress and mental fatigue.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            
            <div className="glass-card" style={{ padding: '2.25rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--sky-blue-light)',
                color: 'var(--sky-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <HeartPulse size={26} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                56% Cortisol Drop
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Clinical studies prove SKY reduces blood cortisol (stress hormone) from the very first session, regulating heart rate variability and blood pressure.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '2.25rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--sky-sun-light)',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Brain size={26} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Enhanced Alpha Brainwaves
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                EEG brain scans show significant increases in Alpha brainwave frequency, inducing a state of "restful alertness" that boosts cognitive focus and exam retention.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '2.25rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--sky-earth-light)',
                color: '#3F6212',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Award size={26} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                Sustained Resilience
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Yale University trials proved SKY outperformed standard mindfulness and emotional intelligence interventions in improving long-term mental health.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-main)' }}>Frequently Asked Questions</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {GENERAL_FAQS.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index} 
                  className="glass-card"
                  style={{
                    padding: '1.25rem 1.75rem',
                    cursor: 'pointer',
                    borderColor: isOpen ? 'var(--sky-blue)' : 'var(--border-color)',
                    background: isOpen ? 'linear-gradient(135deg, #FFFFFF 0%, #F5F9FF 100%)' : '#FFFFFF'
                  }}
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: isOpen ? 'var(--sky-blue)' : 'var(--text-main)' }}>
                      {faq.question}
                    </h4>
                    <ChevronDown size={20} style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'var(--transition-fast)',
                      color: isOpen ? 'var(--sky-blue)' : 'var(--text-muted)'
                    }} />
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, borderTop: '1px solid var(--border-color)', paddingTop: '1rem', whiteSpace: 'pre-line' }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
