import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, Menu, X, BookOpen, HeartHandshake, FileText, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { currentUser, isAdmin, isVolunteer, loginWithGoogle, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDirectSignIn = async () => {
    setAuthLoading(true);

    const onWindowFocus = () => {
      setTimeout(() => {
        setAuthLoading(false);
      }, 400);
    };
    window.addEventListener('focus', onWindowFocus, { once: true });

    try {
      await loginWithGoogle();
    } catch (err) {
      console.warn("Direct sign in error:", err);
      if (err && err.message) {
        alert(`Sign In Notice: ${err.message}`);
      }
    } finally {
      window.removeEventListener('focus', onWindowFocus);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0.85rem 0',
      boxShadow: '0 2px 12px rgba(35, 39, 95, 0.03)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Official Campus Brand Logo Lockup */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img 
            src="/assets/logos/skyatuiuc_logos/skyatuiuc_custom_blue.png" 
            alt="SKY Campus Happiness at UIUC" 
            className="navbar-logo-img"
            style={{ 
              height: '38px', 
              width: 'auto', 
              display: 'block',
              objectFit: 'contain'
            }} 
          />
        </Link>

        {/* Clean Desktop Navigation Links */}
        <div className="desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '1.85rem' }}>
          <Link 
            to="/" 
            style={{
              color: isActive('/') ? 'var(--sky-blue)' : 'var(--text-main)',
              fontWeight: isActive('/') ? 700 : 600,
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-subheading)',
              transition: 'var(--transition-fast)'
            }}
          >
            Home & Info
          </Link>

          <Link 
            to="/research" 
            style={{
              color: isActive('/research') ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: isActive('/research') ? 700 : 600,
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-subheading)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'var(--transition-fast)'
            }}
          >
            <BookOpen size={16} color={isActive('/research') ? 'var(--sky-blue)' : 'currentColor'} /> Research Studies
          </Link>

          {/* Standalone Application Page link */}
          <Link 
            to="/register" 
            style={{
              color: isActive('/register') ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: isActive('/register') ? 700 : 600,
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-subheading)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'var(--transition-fast)'
            }}
          >
            <FileText size={16} color={isActive('/register') ? 'var(--sky-blue)' : 'currentColor'} /> Retreat Application
          </Link>
        </div>

        {/* User Auth Action & Profile Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              
              {/* Concise Account Chip */}
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#FFFFFF',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition-fast)'
                }}
              >
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Avatar" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                ) : (
                  <User size={16} color="var(--sky-blue)" />
                )}
                <span className="account-chip-name">
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </span>
                <ChevronDown size={14} color="var(--text-muted)" style={{ transform: userDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {/* Interactive Dropdown Menu */}
              {userDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.6rem)',
                  right: 0,
                  width: '260px',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '0.75rem',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }} className="animate-fade-in">
                  
                  {/* Profile Summary Header */}
                  <div style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.35rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                      {currentUser.displayName || 'UIUC Member'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', wordBreak: 'break-all' }}>
                      {currentUser.email}
                    </div>

                    {/* Role Indicator in Dropdown */}
                    {isAdmin ? (
                      <span className="badge badge-sun" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>SUPER ADMIN</span>
                    ) : isVolunteer ? (
                      <span className="badge badge-earth" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>VOLUNTEER</span>
                    ) : (
                      <span className="badge badge-sky" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>STUDENT MEMBER</span>
                    )}
                  </div>

                  {/* TOPMOST ITEM: My Retreats */}
                  <Link 
                    to="/my-retreats" 
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      color: isActive('/my-retreats') ? 'var(--sky-blue)' : 'var(--text-main)',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      transition: 'var(--transition-fast)',
                      background: isActive('/my-retreats') ? 'var(--sky-blue-subtle)' : 'transparent'
                    }}
                    className="roster-row-hover"
                  >
                    <BookOpen size={16} color="var(--sky-blue)" />
                    <div>
                      <div>My Retreat Applications</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Status & Confirmation Details</div>
                    </div>
                  </Link>

                  {/* Menu Item 2: Volunteer Portal (Volunteers/Admins only) */}
                  {isVolunteer && (
                    <Link 
                      to="/volunteer" 
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        color: isActive('/volunteer') ? 'var(--sky-earth)' : 'var(--text-main)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        transition: 'var(--transition-fast)',
                        background: isActive('/volunteer') ? 'var(--sky-earth-light)' : 'transparent'
                      }}
                      className="roster-row-hover"
                    >
                      <HeartHandshake size={16} color="var(--sky-earth)" />
                      <div>
                        <div>Volunteer Workbench</div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Applicant Dossiers & Interviews</div>
                      </div>
                    </Link>
                  )}

                  {/* Menu Item 3: Super Admin Hub (Admins only) */}
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        color: isActive('/admin') ? 'var(--sky-sun)' : 'var(--text-main)',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        transition: 'var(--transition-fast)',
                        background: isActive('/admin') ? 'var(--sky-sun-light)' : 'transparent'
                      }}
                      className="roster-row-hover"
                    >
                      <Shield size={16} color="var(--sky-sun)" />
                      <div>
                        <div>Super Admin Hub</div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Volunteers & Cloud Monitor</div>
                      </div>
                    </Link>
                  )}

                  {/* Divider Line */}
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }}></div>

                  {/* Menu Item 4: Sign Out */}
                  <button 
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>

                </div>
              )}

            </div>
          ) : (
            <button 
              onClick={handleDirectSignIn}
              disabled={authLoading}
              className="btn btn-primary btn-sm"
            >
              <User size={16} /> {authLoading ? 'Signing In...' : 'Sign In'}
            </button>
          )}

          {/* Mobile Menu Toggle (Triggers Navigation Drawer) */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle mobile navigation menu"
          >
            {mobileMenuOpen ? <X size={22} color="var(--sky-rest)" /> : <Menu size={22} color="var(--sky-rest)" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div style={{
          padding: '1.25rem 1.5rem',
          background: '#FFFFFF',
          borderTop: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }} className="animate-fade-in">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600, padding: '0.4rem 0' }}>Home & Retreat Info</Link>
          <Link to="/research" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600, padding: '0.4rem 0' }}>Research Studies</Link>
          <Link to="/register" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--sky-blue)', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 700, padding: '0.4rem 0' }}>Retreat Application</Link>
          {currentUser && <Link to="/my-retreats" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-main)', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600, padding: '0.4rem 0' }}>My Retreats & History</Link>}
          {isVolunteer && <Link to="/volunteer" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--sky-earth)', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 700, padding: '0.4rem 0' }}>Volunteer Workbench</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--sky-sun)', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 700, padding: '0.4rem 0' }}>Super Admin Hub</Link>}
        </div>
      )}
    </nav>
  );
}
