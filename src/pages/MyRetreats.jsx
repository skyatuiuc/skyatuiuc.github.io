import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isFirebaseConfigured } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Calendar, CheckCircle2, Clock, User, LogIn, ArrowRight, Sparkles, HeartHandshake, AlertTriangle, ListChecks } from 'lucide-react';
import { loadCachedRetreats } from '../utils/retreatUtils';
import { getStatus, getStatusLabel, getAttendance, getAppliedAtMs, STATUS, GENERAL_RETREAT } from '../models/applicant';
import { formatRetreatDates } from '../models/retreat';
import { getFeeTierLabel } from '../data/pricingData';

export default function MyRetreats() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [allRetreats, setAllRetreats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sky_retreat_history') || '[]');
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

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

  // Fetch registrations for current user (newest first). A failed load is shown as an error with
  // Retry, never as "no records".
  useEffect(() => {
    if (!currentUser) {
      setUserRegistrations([]);
      setLoading(false);
      return;
    }
    const userEmail = currentUser.email?.trim().toLowerCase();
    if (!userEmail || !isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    getDocs(query(collection(db, 'registrations'), where('email', '==', userEmail)))
      .then((snapshot) => {
        if (cancelled) return;
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setUserRegistrations(fetched.sort((a, b) => getAppliedAtMs(b) - getAppliedAtMs(a)));
      })
      .catch((e) => {
        console.warn('My Retreats fetch failed:', e);
        if (!cancelled) setLoadError(e.code || e.message || 'unknown error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentUser, reloadKey]);

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
            ) : loadError ? (
              <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', background: '#FFFFFF' }}>
                <AlertTriangle size={40} color="#B45309" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>We couldn&apos;t load your applications</h3>
                <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                  Your applications are safe; this page just couldn&apos;t reach the server ({loadError}).
                </p>
                <button type="button" className="btn btn-primary" onClick={() => setReloadKey(k => k + 1)}>Try again</button>
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
                  const isGeneral = reg.retreatId === GENERAL_RETREAT.id;
                  const retreatDetail = allRetreats.find(r => r.id === reg.retreatId) || {
                    title: isGeneral ? GENERAL_RETREAT.title : 'SKY Happiness Retreat',
                    location: ''
                  };

                  const status = getStatus(reg);
                  const isApproved = status === STATUS.APPROVED;
                  const isVolunteer = status === STATUS.VOLUNTEER;
                  const isCompleted = !isVolunteer && getAttendance(reg).isComplete;

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
                            {isGeneral ? (
                              <span>You&apos;re on our interest list. We&apos;ll email you when the next retreat opens.</span>
                            ) : (
                              <>
                                <span>📅 {formatRetreatDates(retreatDetail) || 'Dates to be announced'}</span>
                                {retreatDetail.location && <><span>•</span><span>📍 {retreatDetail.location}</span></>}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Completion Badge */}
                        <div>
                          {status === STATUS.WITHDRAWN ? (
                            <span style={{ background: '#F1F5F9', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.45rem 0.9rem', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid var(--border-color)' }}>
                              Withdrawn
                            </span>
                          ) : isGeneral ? (
                            <span className="badge badge-sky" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <ListChecks size={16} /> On the Interest List
                            </span>
                          ) : isVolunteer ? (
                            <span className="badge badge-sun" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <HeartHandshake size={16} /> Volunteering
                            </span>
                          ) : isCompleted ? (
                            <span className="badge badge-earth" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <CheckCircle2 size={16} /> Completed & Graduated
                            </span>
                          ) : isApproved ? (
                            <span className="badge badge-sky" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Sparkles size={16} /> Enrolled & Confirmed
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
                          <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{reg.academicRole} ({getFeeTierLabel(reg.academicRole)})</div>
                        </div>

                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>ATTENDANCE STATUS</div>
                          <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                            {isCompleted ? '3 / 3 Sessions Completed' : `${getAttendance(reg).attendedCount} / 3 Sessions Attended`}
                          </div>
                        </div>

                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>APPLICATION STATUS</div>
                          <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{getStatusLabel(status)}</div>
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
