import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, isFirebaseConfigured } from '../firebase/config';
import { doc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { INITIAL_RETREATS } from '../data/retreatData';
import { ACADEMIC_ROLE_OPTIONS } from '../data/pricingData';
import { Send, AlertCircle, CheckCircle2, LogIn, ArrowLeft, Clock, Mail, PhoneCall, Info } from 'lucide-react';
import { recordCampaignConversion } from '../services/campaignAnalyticsService';
import confetti from 'canvas-confetti';
import RetreatDetailsCard from '../components/RetreatDetailsCard';
import { loadCachedRetreats } from '../utils/retreatUtils';
import { getRetreatLabel } from '../models/retreat';
import { todayChicago } from '../utils/dateUtils';
import { getStatus, getStatusLabel, getAppliedAtMs, STATUS_STYLES, GENERAL_RETREAT_ID, registrationId } from '../models/applicant';
import { validateRegistrationForm, prefillFromPreviousApplication, FORM_FIELDS } from '../models/registrationForm';

const FieldError = ({ message }) => (message ? <p className="field-error" role="alert">{message}</p> : null);

export default function Register() {
  const { retreatId: paramRetreatId } = useParams();
  const { currentUser, loginWithGoogle } = useAuth();
  
  const [authLoading, setAuthLoading] = useState(false);

  // Upcoming Retreats
  const [allRetreats, setAllRetreats] = useState(() => {
    const saved = localStorage.getItem('sky_retreat_history');
    return saved ? JSON.parse(saved) : INITIAL_RETREATS;
  });

  const todayStr = todayChicago();
  const upcomingRetreatsList = allRetreats
    .filter(r => r.endDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const upcomingRetreatIds = upcomingRetreatsList.map(r => r.id);

  const [selectedRetreatId, setSelectedRetreatId] = useState(paramRetreatId || '');

  // Form State - No Defaults
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isOver18: '',
    academicRole: '',
    completedSkyBefore: '',
    agreeToAll3Days: '',
    healthConditions: [],
    otherHealthConditions: '',
    foodAllergies: '',
    referralSource: ''
  });

  const [existingApp, setExistingApp] = useState(null);
  const [retreatsLoaded, setRetreatsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  // Returning applicants: the previous application their answers were carried over from
  const [prefilledFrom, setPrefilledFrom] = useState(null);
  const prefillAppliedRef = useRef(false);

  const handleDirectSignIn = async () => {
    setAuthLoading(true);
    setError('');

    const onWindowFocus = () => {
      setTimeout(() => {
        setAuthLoading(false);
      }, 400);
    };
    window.addEventListener('focus', onWindowFocus, { once: true });

    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Register direct sign in error:", err);
      setError(err?.message || 'Failed to sign in with Google');
    } finally {
      window.removeEventListener('focus', onWindowFocus);
      setAuthLoading(false);
    }
  };

  // Sync retreats from Firestore with local caching (0 reads on repeated visits)
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      loadCachedRetreats(db).then(async (fetched) => {
        let list = fetched || [];
        // A shared /register/:id link may point at a retreat created after this browser cached the list
        if (paramRetreatId && !list.some(r => r.id === paramRetreatId)) {
          list = await loadCachedRetreats(db, { forceRefresh: true });
        }
        if (list && list.length > 0) {
          setAllRetreats(list);
        }
        setRetreatsLoaded(true);
      });
    } else {
      setRetreatsLoaded(true);
    }
  }, [paramRetreatId]);

  // Set default selected retreat
  // Once the retreat list is fresh, replace a missing or closed selection with the next upcoming retreat
  // (the "link not open" notice below explains the switch; the details card shows what is selected)
  useEffect(() => {
    if (upcomingRetreatIds.length === 0) return;
    if (!selectedRetreatId || (retreatsLoaded && !upcomingRetreatIds.includes(selectedRetreatId))) {
      setSelectedRetreatId(upcomingRetreatIds[0]);
    }
  }, [upcomingRetreatIds, selectedRetreatId, retreatsLoaded]);

  const linkRetreatClosed = retreatsLoaded && Boolean(paramRetreatId) && !upcomingRetreatIds.includes(paramRetreatId);

  // Autofill current user info & check existing app
  useEffect(() => {
    if (!currentUser) {
      setExistingApp(null);
      return;
    }

    const names = (currentUser.displayName || '').split(' ');
    const fName = names[0] || '';
    const lName = names.slice(1).join(' ') || '';

    setFormData(prev => ({
      ...prev,
      firstName: prev.firstName || fName,
      lastName: prev.lastName || lName,
      email: currentUser.email || ''
    }));

    // Check existing application for selected retreat or any retreat
    const userEmail = currentUser.email?.trim().toLowerCase();
    if (!userEmail) return;

    // Check Firestore
    if (isFirebaseConfigured && db) {
      try {
        const regRef = collection(db, 'registrations');
        const q = query(regRef, where('email', '==', userEmail));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const apps = [];
          snapshot.forEach((d) => apps.push({ id: d.id, ...d.data() }));
          // Only an application for *this* retreat locks the form; past retreats never do
          const targetRetreatId = selectedRetreatId || (upcomingRetreatIds.length === 0 ? GENERAL_RETREAT_ID : '');
          const currentApp = targetRetreatId ? apps.find(r => r.retreatId === targetRetreatId) : null;
          setExistingApp(currentApp || null);
          if (!currentApp && apps.length > 0 && !prefillAppliedRef.current) {
            prefillAppliedRef.current = true;
            const previous = [...apps].sort((a, b) => getAppliedAtMs(b) - getAppliedAtMs(a))[0];
            const carried = prefillFromPreviousApplication(previous);
            setFormData(prev => {
              const next = { ...prev };
              Object.entries(carried).forEach(([field, value]) => {
                const current = prev[field];
                // Names from the Google profile are only a guess; the applicant's own previous answer wins
                const replaceable = Array.isArray(current) ? current.length === 0
                  : !current || (field === 'firstName' && current === fName) || (field === 'lastName' && current === lName);
                if (replaceable && (Array.isArray(value) ? value.length > 0 : value)) next[field] = value;
              });
              return next;
            });
            setPrefilledFrom(previous);
          }
          if (currentApp) {
            setFormData({
              firstName: currentApp.firstName || '',
              lastName: currentApp.lastName || '',
              email: currentApp.email || '',
              phone: currentApp.phone || '',
              isOver18: currentApp.isOver18 || '',
              academicRole: currentApp.academicRole || '',
              completedSkyBefore: currentApp.completedSkyBefore || '',
              agreeToAll3Days: 'Yes',
              healthConditions: currentApp.healthConditions || [],
              otherHealthConditions: currentApp.otherHealthConditions || '',
              foodAllergies: currentApp.foodAllergies || '',
              referralSource: currentApp.referralSource || ''
            });
          }
        });
        return () => unsubscribe();
      } catch (e) {
        console.warn("Firestore registration check error:", e);
      }
    }
  }, [currentUser, selectedRetreatId, upcomingRetreatIds.length]);

  const healthOptions = [
    "None",
    "High Blood Pressure",
    "Heart Conditions / Surgery",
    "Asthma / Respiratory Issues",
    "Recent Surgery (last 6 months)",
    "Pregnancy",
    "Epilepsy / Seizures",
    "Clinical Depression / Anxiety",
    "Bipolar Disorder",
    "Schizophrenia / Psychosis",
    "Other"
  ];

  const handleCheckboxChange = (condition) => {
    if (existingApp) return;

    if (condition === "None") {
      setFormData(prev => ({
        ...prev,
        healthConditions: prev.healthConditions.includes("None") ? [] : ["None"],
        otherHealthConditions: ""
      }));
      return;
    }

    setFormData(prev => {
      const withoutNone = prev.healthConditions.filter(c => c !== "None");
      if (withoutNone.includes(condition)) {
        const next = withoutNone.filter(c => c !== condition);
        return {
          ...prev,
          healthConditions: next,
          otherHealthConditions: condition === "Other" ? "" : prev.otherHealthConditions
        };
      } else {
        return {
          ...prev,
          healthConditions: [...withoutNone, condition]
        };
      }
    });
  };

  // After a failed submit, clear each field's message as soon as it is fixed
  useEffect(() => {
    setFieldErrors(prev => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      const now = validateRegistrationForm(formData);
      const next = Object.fromEntries(keys.filter(k => now[k]).map(k => [k, now[k]]));
      if (Object.keys(next).length === 0) setError('');
      return Object.keys(next).length === keys.length ? prev : next;
    });
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (existingApp) return;

    const errors = validateRegistrationForm(formData);
    setFieldErrors(errors);
    const firstInvalid = FORM_FIELDS.find(f => errors[f]);
    if (firstInvalid) {
      const count = Object.keys(errors).length;
      setError(count === 1 ? errors[firstInvalid] : `Please fix the ${count} highlighted fields below.`);
      const fieldEl = document.querySelector(`[data-field="${firstInvalid}"]`);
      fieldEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldEl?.querySelector('input, select, textarea')?.focus({ preventScroll: true });
      return;
    }

    setLoading(true);

    try {
      // Never silently switch retreats: submit only to the retreat shown on screen
      let retreatId;
      if (upcomingRetreatsList.length === 0) {
        retreatId = GENERAL_RETREAT_ID;
      } else if (upcomingRetreatIds.includes(selectedRetreatId)) {
        retreatId = selectedRetreatId;
      } else {
        setError('The retreat in this link is no longer open for applications. Please choose an upcoming retreat above.');
        setLoading(false);
        return;
      }

      const userEmail = formData.email.trim().toLowerCase();
      const deterministicId = registrationId(userEmail, retreatId);

      const registrationPayload = {
        retreatId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: userEmail,
        phone: formData.phone.trim(),
        isOver18: formData.isOver18,
        academicRole: formData.academicRole,
        completedSkyBefore: formData.completedSkyBefore,
        healthConditions: formData.healthConditions,
        otherHealthConditions: formData.otherHealthConditions.trim(),
        foodAllergies: formData.foodAllergies.trim(),
        referralSource: formData.referralSource.trim(),
        status: 'Uncontacted',
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore with deterministic ID ({email}_{retreatId})
      if (isFirebaseConfigured && db) {
        const regDocRef = doc(db, 'registrations', deterministicId);
        await setDoc(regDocRef, registrationPayload);
      }

      // Record campaign conversion ONLY if referred via link redirection / campaign tag
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const tag = searchParams.get('src') || searchParams.get('tag') || 
                    sessionStorage.getItem('sky_referral_src') || localStorage.getItem('sky_referral_src') || 
                    sessionStorage.getItem('sky_campaign_tag') || localStorage.getItem('sky_campaign_tag');
        if (tag) {
          await recordCampaignConversion(tag);
        }
      } catch (err) {
        console.warn("Analytics conversion notice:", err);
      }

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Confetti fallback
      }

      setExistingApp(registrationPayload);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Submission error:", err);
      setError(err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '3.5rem 0 6rem 0' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        
        {/* Back Link */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Homepage
        </Link>

        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {upcomingRetreatsList.find(r => r.id === selectedRetreatId)?.title || 'SKY Happiness Retreat Application'}
          </h1>
        </div>

        {/* REQUIRE LOGIN CARD IF NOT SIGNED IN */}
        {!currentUser ? (
          <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', marginBottom: '2.5rem', background: '#FFFFFF' }}>
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
              Sign In Required to Apply
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto 2rem auto' }}>
              Please sign in with your Google account. Signing in protects your application, prevents duplicate submissions, and allows retreat facilitators to track your status.
            </p>

            <button 
              onClick={handleDirectSignIn}
              disabled={authLoading}
              className="btn btn-primary"
              style={{ padding: '0.9rem 2rem', fontSize: '1rem', gap: '0.6rem' }}
            >
              {authLoading ? 'Signing In...' : 'Sign In with Google to Apply'}
            </button>
          </div>
        ) : (
          <div>
            
            {/* NEXT STEP PHONE ORIENTATION NOTICE PANEL */}
            {existingApp && (
              <div className="glass-card animate-fade-in" style={{
                padding: '1.5rem 1.75rem',
                marginBottom: '1.75rem',
                background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                border: '1.5px solid #F59E0B',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    color: '#B45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.15rem'
                  }}>
                    <PhoneCall size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#92400E', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span>Next Step: Short Phone Orientation</span>
                      <span className="badge" style={{ background: '#FDE68A', color: '#78350F', border: '1px solid #F59E0B', fontSize: '0.75rem' }}>
                        Required for All Applicants
                      </span>
                    </div>
                    <p style={{ color: '#78350F', fontSize: '0.925rem', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                      Every applicant must go through short orientation via phone call to confirm their attendance and secure their spot for the retreat. Our club officers will start reviewing your application shortly - please expect a brief phone call within the next few days, between <strong>12pm–6pm</strong>.
                    </p>
                    <p style={{ color: '#78350F', fontSize: '0.9rem', margin: '0.6rem 0 0 0' }}>
                      You can check your application status any time on <Link to="/my-retreats" style={{ color: '#92400E', fontWeight: 700 }}>My Retreats</Link>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* EXISTING APPLICATION VIEW-ONLY BANNER */}
            {existingApp && (
              <div className="glass-card" style={{
                padding: '1.75rem',
                marginBottom: '2rem',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #EDF4FF 100%)',
                border: '1px solid rgba(31, 116, 241, 0.35)',
                boxShadow: 'var(--shadow-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle2 size={24} color="#16A34A" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        Application Submitted (View Only)
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        Submitted by: <strong style={{ color: 'var(--text-main)' }}>{existingApp.email}</strong>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const appStatus = getStatus(existingApp);
                    const statusStyle = STATUS_STYLES[appStatus];

                    return (
                      <span className="badge" style={{
                        fontSize: '0.85rem',
                        padding: '0.4rem 0.85rem',
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        border: '1px solid rgba(35, 39, 95, 0.1)'
                      }}>
                        Application Status: {getStatusLabel(appStatus)}
                      </span>
                    );
                  })()}
                </div>

                <div style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(31, 116, 241, 0.15)',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5
                }}>
                  You have already submitted an application for this retreat. If you need to update any information or have questions about your orientation status, please email <a href="mailto:skyatuiuc@gmail.com" style={{ color: 'var(--sky-blue)', fontWeight: 600 }}>skyatuiuc@gmail.com</a>.
                </div>
              </div>
            )}

            {/* RETREAT SELECTION DROPDOWN */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '0.03em' }}>
                SELECT UPCOMING RETREAT YOU ARE APPLYING FOR *
              </label>

              {linkRetreatClosed && (
                <div style={{ marginBottom: '0.6rem', padding: '0.6rem 0.85rem', background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 'var(--radius-sm)', color: '#9A3412', fontSize: '0.85rem', fontWeight: 600 }}>
                  The retreat in this link isn&apos;t open for applications. {upcomingRetreatsList.length > 0 ? 'Please check the retreat selected below.' : ''}
                </div>
              )}

              {upcomingRetreatsList.length > 0 ? (
                <select 
                  value={selectedRetreatId}
                  disabled={Boolean(existingApp)}
                  onChange={(e) => setSelectedRetreatId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#FFFFFF',
                    border: '1px solid rgba(31, 116, 241, 0.4)',
                    borderRadius: 'var(--radius-sm)',
                    color: existingApp ? 'var(--text-muted)' : 'var(--text-main)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: existingApp ? 'not-allowed' : 'pointer'
                  }}
                >
                  {upcomingRetreatsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {getRetreatLabel(r)}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Applying for general upcoming campus retreat schedule.
                </div>
              )}
            </div>

            {/* CONCISE RETREAT DETAILS & TIMINGS CARD */}
            {(() => {
              const activeRetreatObj = upcomingRetreatsList.find(r => r.id === selectedRetreatId) || upcomingRetreatsList[0];
              return activeRetreatObj ? (
                <div style={{ marginBottom: '1.75rem' }}>
                  <RetreatDetailsCard retreat={activeRetreatObj} compact={true} showHeader={false} />
                </div>
              ) : null;
            })()}

            {/* TOP ERROR ALERT */}
            {prefilledFrom && !existingApp && (
              <div className="notice notice-info" style={{ marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                <Info size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span>
                  Welcome back! We filled in your details from your application on{' '}
                  {new Date(getAppliedAtMs(prefilledFrom)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.
                  {' '}Please check they are still correct, especially your role, age and health information.
                </span>
              </div>
            )}

            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #F87171',
                color: '#DC2626',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <AlertCircle size={20} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {/* REGISTRATION FORM */}
            <form onSubmit={handleSubmit} noValidate className="glass-card form-card-responsive" style={{ padding: 'clamp(1.25rem, 4vw, 2.5rem)', background: '#FFFFFF' }}>
              
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Participant Registration & Health Disclosure
              </h2>

              {/* Section 1: Contact Info */}
              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div data-field="firstName">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>FIRST NAME *</label>
                  <input 
                    type="text"
                    required
                    maxLength={100}
                    disabled={Boolean(existingApp)}
                    value={formData.firstName}
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: formData.firstName.length >= 100 ? '1.5px solid #EF4444' : '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                  {formData.firstName.length >= 100 && (
                    <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                      Maximum 100 characters reached
                    </span>
                  )}
                <FieldError message={fieldErrors.firstName} />
                </div>
                <div data-field="lastName">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>LAST NAME *</label>
                  <input 
                    type="text"
                    required
                    maxLength={100}
                    disabled={Boolean(existingApp)}
                    value={formData.lastName}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: formData.lastName.length >= 100 ? '1.5px solid #EF4444' : '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                  {formData.lastName.length >= 100 && (
                    <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                      Maximum 100 characters reached
                    </span>
                  )}
                <FieldError message={fieldErrors.lastName} />
                </div>
              </div>

              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div data-field="email">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>EMAIL ADDRESS *</label>
                  <input 
                    type="email"
                    required
                    disabled
                    value={formData.email}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#F8FAFC', border: '1px solid rgba(35, 39, 95, 0.12)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.9rem' }}
                  />
                <FieldError message={fieldErrors.email} />
                </div>
                <div data-field="phone">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>PHONE NUMBER *</label>
                  <input 
                    type="tel"
                    required
                    maxLength={30}
                    disabled={Boolean(existingApp)}
                    placeholder="(217) 555-0199"
                    value={formData.phone}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: formData.phone.length >= 30 ? '1.5px solid #EF4444' : '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                  {formData.phone.length >= 30 && (
                    <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                      Maximum 30 characters reached
                    </span>
                  )}
                <FieldError message={fieldErrors.phone} />
                </div>
              </div>

              {/* Section 2: Affiliation & Age */}
              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div data-field="academicRole">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>UIUC ROLE / AFFILIATION *</label>
                  <select 
                    required
                    disabled={Boolean(existingApp)}
                    value={formData.academicRole}
                    aria-invalid={Boolean(fieldErrors.academicRole)}
                    onChange={(e) => setFormData({ ...formData, academicRole: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  >
                    <option value="">Select Role...</option>
                    {ACADEMIC_ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                <FieldError message={fieldErrors.academicRole} />
                </div>

                <div data-field="isOver18">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>AGE *</label>
                  <select 
                    required
                    disabled={Boolean(existingApp)}
                    value={formData.isOver18}
                    aria-invalid={Boolean(fieldErrors.isOver18)}
                    onChange={(e) => setFormData({ ...formData, isOver18: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  >
                    <option value="">Select Age...</option>
                    <option value="18 or older">18 or older</option>
                    <option value="Under 18">Under 18</option>
                  </select>
                <FieldError message={fieldErrors.isOver18} />
                </div>
              </div>

              {/* Section 3: Completed SKY Course Before? */}
              <div data-field="completedSkyBefore" style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>HAVE YOU COMPLETED A SKY HAPPINESS RETREAT BEFORE? *</label>
                <select 
                  required
                  disabled={Boolean(existingApp)}
                  value={formData.completedSkyBefore}
                  aria-invalid={Boolean(fieldErrors.completedSkyBefore)}
                  onChange={(e) => setFormData({ ...formData, completedSkyBefore: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                >
                  <option value="">Select Option...</option>
                  <option value="No">No, this is my first SKY retreat</option>
                  <option value="Yes">Yes, I am a SKY course graduate</option>
                </select>
              <FieldError message={fieldErrors.completedSkyBefore} />
              </div>

              {/* Section 4: HEALTH DISCLOSURE CHECKBOXES WITH OTHER INPUT */}
              <div data-field="healthConditions" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  PLEASE INDICATE IF YOU HAVE ANY OF THESE HEALTH CONDITIONS *
                </label>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Because SKY Breath Meditation involves rhythmic breathing exercises, please disclose any pre-existing conditions so retreat facilitators can provide proper guidance:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
                  {healthOptions.map((condition, idx) => {
                    const isChecked = formData.healthConditions.includes(condition);
                    return (
                      <label key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.65rem 0.85rem',
                        background: isChecked ? 'var(--sky-blue-subtle)' : '#FFFFFF',
                        border: isChecked ? '1px solid var(--sky-blue)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: existingApp ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        color: isChecked ? 'var(--sky-blue)' : 'var(--text-secondary)',
                        fontWeight: isChecked ? 700 : 500
                      }}>
                        <input 
                          type="checkbox"
                          disabled={Boolean(existingApp)}
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(condition)}
                        />
                        <span>{condition}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Conditional Other Input */}
                {formData.healthConditions.includes('Other') && (
                  <div data-field="otherHealthConditions" className="animate-fade-in" style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#B45309', marginBottom: '0.35rem' }}>
                      PLEASE SPECIFY OTHER HEALTH CONDITION(S) *
                    </label>
                    <input 
                      type="text"
                      required
                      maxLength={1000}
                      disabled={Boolean(existingApp)}
                      placeholder="Specify pre-existing medical or health conditions..."
                      value={formData.otherHealthConditions}
                    aria-invalid={Boolean(fieldErrors.otherHealthConditions)}
                      onChange={(e) => setFormData({ ...formData, otherHealthConditions: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        background: '#FFFFFF',
                        border: formData.otherHealthConditions.length >= 1000 ? '1.5px solid #EF4444' : '1px solid #FABC1D',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem'
                      }}
                    />
                    {formData.otherHealthConditions.length >= 1000 && (
                      <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                        Maximum 1000 characters reached
                      </span>
                    )}
                  <FieldError message={fieldErrors.otherHealthConditions} />
                  </div>
                )}
              <FieldError message={fieldErrors.healthConditions} />
              </div>

              {/* Food Allergies & Referral */}
              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
                <div data-field="foodAllergies">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>DIETARY RESTRICTIONS / ALLERGIES</label>
                  <input 
                    type="text"
                    maxLength={500}
                    disabled={Boolean(existingApp)}
                    placeholder="Vegetarian, Vegan, Gluten Free, Nut Allergy..."
                    value={formData.foodAllergies}
                    aria-invalid={Boolean(fieldErrors.foodAllergies)}
                    onChange={(e) => setFormData({ ...formData, foodAllergies: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: formData.foodAllergies.length >= 500 ? '1.5px solid #EF4444' : '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                  {formData.foodAllergies.length >= 500 && (
                    <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                      Maximum 500 characters reached
                    </span>
                  )}
                <FieldError message={fieldErrors.foodAllergies} />
                </div>
                <div data-field="referralSource">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>HOW DID YOU HEAR ABOUT US? *</label>
                  <input 
                    type="text"
                    required
                    maxLength={250}
                    disabled={Boolean(existingApp)}
                    placeholder="Quad Day, Friend, Instagram, Quad Flyer..."
                    value={formData.referralSource}
                    aria-invalid={Boolean(fieldErrors.referralSource)}
                    onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', border: formData.referralSource.length >= 250 ? '1.5px solid #EF4444' : '1px solid rgba(35, 39, 95, 0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                  {formData.referralSource.length >= 250 && (
                    <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>
                      Maximum 250 characters reached
                    </span>
                  )}
                <FieldError message={fieldErrors.referralSource} />
                </div>
              </div>

              {/* Section 5: VERBOSE & SIGNIFICANT 3-DAY ATTENDANCE POLICY AGREEMENT (AT BOTTOM) */}
              <div data-field="agreeToAll3Days" style={{
                background: formData.agreeToAll3Days === 'No' ? '#FEF2F2' : 'var(--sky-sun-light)',
                border: formData.agreeToAll3Days === 'No' ? '1.5px solid #F87171' : '1.5px solid rgba(250, 188, 29, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                marginBottom: '2.25rem',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: formData.agreeToAll3Days === 'No' ? '#DC2626' : '#B45309', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                  <Clock size={20} /> IMPORTANT ATTENDANCE & PARTICIPATION POLICY
                </div>

                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                  The SKY Happiness Retreat is an immersive, highly experiential 3-day workshop. Each session builds sequentially on the previous one. Because SKY Breath Meditation techniques are taught step-by-step, <strong>100% full attendance at all 3 retreat sessions is strictly mandatory</strong>.
                </p>

                <div style={{ background: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>You must attend all 3 scheduled sessions in full (no partial attendance).</li>
                    <li>No late arrivals or early departures are permitted.</li>
                    <li>Missing any session prevents certification and completion of the SKY Breath Meditation.</li>
                  </ul>
                </div>

                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: formData.agreeToAll3Days === 'No' ? '#DC2626' : '#B45309', marginBottom: '0.5rem' }}>
                  3-DAY ATTENDANCE COMMITMENT CONFIRMATION *
                </label>

                <select 
                  required
                  disabled={Boolean(existingApp)}
                  value={formData.agreeToAll3Days}
                  aria-invalid={Boolean(fieldErrors.agreeToAll3Days)}
                  onChange={(e) => setFormData({ ...formData, agreeToAll3Days: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: '#FFFFFF',
                    border: formData.agreeToAll3Days === 'No' ? '1.5px solid #EF4444' : '1.5px solid #FABC1D',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)',
                    fontSize: '0.925rem',
                    fontWeight: 700
                  }}
                >
                  <option value="">Select Attendance Confirmation...</option>
                  <option value="Yes">Yes, I confirm that I will attend 100% of all 3 retreat sessions in full</option>
                  <option value="No">No, I cannot commit to all 3 sessions</option>
                </select>

                {/* Contact note for questions, concerns, or inability to meet attendance requirement */}
                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Mail size={15} color="#B45309" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                  <span>
                    If you have any questions or concerns, or are unable to meet this requirement, please contact <a href="mailto:skyatuiuc@gmail.com" style={{ color: 'var(--sky-blue)', textDecoration: 'underline', fontWeight: 600 }}>skyatuiuc@gmail.com</a> with any questions or discussions.
                  </span>
                </div>

                {/* BOTTOM ATTENDANCE REQUIREMENT ERROR ALERT WITH CONTACT LINK */}
                {formData.agreeToAll3Days === 'No' && (
                  <div className="animate-fade-in" style={{
                    marginTop: '1.25rem',
                    padding: '1rem 1.25rem',
                    background: '#FEF2F2',
                    border: '1px solid #F87171',
                    borderRadius: 'var(--radius-sm)',
                    color: '#DC2626',
                    fontSize: '0.875rem',
                    lineHeight: 1.5
                  }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', color: '#DC2626' }}>
                      <AlertCircle size={18} color="#EF4444" /> Full 3-Day Attendance is Strictly Required
                    </div>
                    <p style={{ margin: 0 }}>
                      Because each session builds sequentially on the previous one, full attendance at all 3 sessions is mandatory. If you cannot attend all 3 days, you cannot be certified in SKY Breath Meditation.
                    </p>
                    <div style={{ marginTop: '0.75rem', fontWeight: 600, color: 'var(--sky-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={15} color="var(--sky-blue)" /> Questions or schedule conflicts? Contact <a href="mailto:skyatuiuc@gmail.com" style={{ color: 'var(--sky-blue)', textDecoration: 'underline', fontWeight: 700 }}>skyatuiuc@gmail.com</a>
                    </div>
                  </div>
                )}
              <FieldError message={fieldErrors.agreeToAll3Days} />
              </div>

              {/* Submit Button */}
              {!existingApp ? (
                <button 
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem', fontSize: '1rem', gap: '0.5rem' }}
                >
                  <Send size={18} /> {loading ? 'Submitting Application...' : 'Submit Retreat Application'}
                </button>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#166534', fontWeight: 700, background: '#DCFCE7', borderRadius: 'var(--radius-sm)', border: '1px solid #86EFAC' }}>
                  ✓ Application Submitted & Secured (View Only)
                </div>
              )}

            </form>

          </div>
        )}

      </div>
    </div>
  );
}
