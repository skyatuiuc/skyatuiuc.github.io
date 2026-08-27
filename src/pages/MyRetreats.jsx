import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { INITIAL_RETREATS } from '../data/retreatData';
import { Calendar, CheckCircle2, Clock, User, LogIn, ArrowRight, Sparkles } from 'lucide-react';
import { loadCachedRetreats } from '../utils/retreatUtils';

export default function MyRetreats() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [allRetreats, setAllRetreats] = useState(() => {
    const saved = localStorage.getItem('sky_retreat_history');
    return saved ? JSON.parse(saved) : INITIAL_RETREATS;
  });
  const [loading, setLoading] = useState(true);

  // Sync retreats with local caching (0 reads on repeated visits)
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      loadCachedRetreats(db).then((fetched) => {
        if (fetched && fetched.length > 0) {
          setAllRetreats(fetched);
        }
      });
    }
  }, []);

  // Fetch registrations for current user
  useEffect(() => {
    if (!currentUser) {
      setUserRegistrations([]);
      setLoading(false);
      return;
    }

    const userEmail = currentUser.email?.trim().toLowerCase();
    if (!userEmail) return;

    let localRegs = [];
    try {
      const savedRegs = JSON.parse(localStorage.getItem('sky_registrations') || '[]');
      localRegs = savedRegs.filter(r => r.email?.trim().toLowerCase() === userEmail);
    } catch (e) {
      console.warn("Local storage error:", e);
    }

    setUserRegistrations(localRegs);

    if (isFirebaseConfigured && db) {
      try {
        const regRef = collection(db, 'registrations');
        const q = query(regRef, where('email', '==', userEmail));
        getDocs(q).then((snapshot) => {
          const fetched = [];
          snapshot.forEach((d) => fetched.push({ id: d.id, ...d.data() }));
          setUserRegistrations(fetched);
          setLoading(false);
        }).catch((e) => {
          console.warn("Firestore user retreats fetch notice:", e);
          setLoading(false);
        });
      } catch (e) {
        console.warn("Firestore setup notice:", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  return (
    <div style={{ padding: '3.5rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '860px' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>My Retreat History & Completion</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.4rem' }}>
            View your registered SKY retreats, completion badges, and workshop graduation records.
          </p>
        </div>

        {/* REQUIRE LOGIN CARD IF NOT SIGNED IN */}
        {!currentUser ? (
          <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#FFFFFF' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'var(--sky-blue-light)',
              color: 'var(--sky-blue)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <LogIn size={34} />
            </div>

            <h2 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Sign In to View Your Retreats
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '520px', margin: '0 auto 2rem auto' }}>
              Please sign in with your Google account to view your past completed retreats, active applications, and graduation history.
            </p>

            <button 
              onClick={loginWithGoogle}
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
            >
              <User size={18} /> Sign In with Google Account
            </button>
          </div>
        ) : (
          <div>
            
            {/* RETREATS LIST */}
            {loading ? (
              <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', background: '#FFFFFF' }}>
                <Clock size={36} color="var(--sky-blue)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Loading Your Retreat Records...</h3>
              </div>
            ) : userRegistrations.length === 0 ? (
              <div className="glass-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#FFFFFF' }}>
                <Calendar size={48} color="var(--sky-blue)" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>No Retreat Records Found</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
                  You haven't submitted a retreat application yet. Browse upcoming campus retreats and apply to reserve your spot!
                </p>

                <Link to="/register" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem' }}>
                  Apply for Upcoming Retreat <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {userRegistrations.map((reg) => {
                  const retreatDetail = allRetreats.find(r => r.id === reg.retreatId) || {
                    title: reg.retreatTitle || 'SKY Happiness Retreat',
                    startDate: 'Upcoming',
                    endDate: 'Session',
                    location: 'Illini Union, Urbana IL',
                    teachers: 'SKY Certified Instructors'
                  };

                  const isApproved = reg.interviewStatus?.includes('Approved') || reg.status?.includes('Approved');
                  const isCompleted = reg.attendanceStatus === 'Completed' || reg.attendanceStatus === 'Graduated' || reg.completed === true;

                  return (
                    <div key={reg.id} className="glass-card animate-fade-in" style={{
                      padding: '2rem',
                      border: isCompleted ? '1px solid rgba(127, 168, 66, 0.4)' : '1px solid rgba(31, 116, 241, 0.3)',
                      background: isCompleted ? 'linear-gradient(135deg, #FFFFFF 0%, #F4F9ED 100%)' : '#FFFFFF',
                      boxShadow: 'var(--shadow-md)'
                    }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                              {retreatDetail.title}
                            </h3>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span>📅 {retreatDetail.startDate} to {retreatDetail.endDate}</span>
                            <span>•</span>
                            <span>📍 {retreatDetail.location}</span>
                          </div>
                        </div>

                        {/* Completion Badge */}
                        <div>
                          {isCompleted ? (
                            <span className="badge badge-earth" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <CheckCircle2 size={16} /> Completed & Graduated
                            </span>
                          ) : isApproved ? (
                            <span className="badge badge-sky" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Sparkles size={16} /> Enrolled & Confirmed
                            </span>
                          ) : reg.interviewStatus === 'Withdrawn' ? (
                            <span style={{ background: '#F1F5F9', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                              Withdrawn
                            </span>
                          ) : (
                            <span className="badge badge-sun" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Clock size={16} /> Application Pending Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        padding: '1.15rem',
                        background: '#F8FAFC',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.875rem'
                      }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>UIUC ROLE / TIER</div>
                          <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{reg.academicRole} ({reg.feeTier})</div>
                        </div>

                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>ATTENDANCE STATUS</div>
                          <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                            {isCompleted ? '3 / 3 Sessions Completed' : reg.agreeToAll3Days === 'Yes' ? '3-Day Attendance Committed' : 'Pending Confirmation'}
                          </div>
                        </div>

                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>INTERVIEW STATUS</div>
                          <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{reg.interviewStatus || 'Pending Interview'}</div>
                        </div>
                      </div>

                      {/* Action Link */}
                      <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                        <Link to={`/register/${reg.retreatId}`} style={{ color: 'var(--sky-blue)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          View Application Details <ArrowRight size={14} />
                        </Link>
                      </div>

                    </div>
                  );
                })}

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
