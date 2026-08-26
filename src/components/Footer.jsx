import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, MapPin, ExternalLink } from 'lucide-react';
import { ADMIN_EMAIL } from '../context/AuthContext';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#FFFFFF',
      color: 'var(--text-main)',
      borderTop: '1px solid var(--border-color)',
      boxShadow: '0 -4px 20px rgba(35, 39, 95, 0.03)',
      padding: '4.5rem 0 2.5rem 0',
      marginTop: '5rem',
      position: 'relative'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '3rem',
          marginBottom: '3rem'
        }}>
          
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <img 
                src="/assets/logos/skyatuiuc_logos/skyatuiuc_custom_blue.png" 
                alt="SKY Campus Happiness at UIUC" 
                style={{ height: '40px', width: 'auto', display: 'block' }} 
              />
              <img 
                src="/assets/logos/uiuc_logos/uiuc_fullcolor.png" 
                alt="UIUC Block I" 
                style={{ height: '34px', width: 'auto', display: 'block' }} 
              />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              The registered student organization chapter of SKY Campus Happiness at the University of Illinois Urbana-Champaign. Empowering students with mental health resilience, stress relief, and community.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <MapPin size={16} color="var(--sky-blue)" />
              <span style={{ color: 'var(--text-secondary)' }}>University of Illinois Urbana-Champaign, IL</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h5 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Explore</h5>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0, margin: 0 }}>
              <li><Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', transition: 'var(--transition-fast)' }}>Home & Retreat Info</Link></li>
              <li><Link to="/research" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', transition: 'var(--transition-fast)' }}>Scientific Research Studies</Link></li>
              <li><Link to="/register" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', transition: 'var(--transition-fast)' }}>Retreat Application</Link></li>
            </ul>
          </div>

          {/* Research & Global Chapter Info */}
          <div>
            <h5 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Scientific Partners</h5>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              SKY Breath Meditation research validated by clinical trials at Yale University, Harvard Medical School, Stanford University, and MIT.
            </p>
            <a 
              href="https://skycampushappiness.org" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: 'var(--sky-blue)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600
              }}
            >
              SKY Campus Happiness Global <ExternalLink size={14} />
            </a>
          </div>

          {/* Official Contact */}
          <div>
            <h5 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.25rem' }}>Official Contact</h5>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.925rem', fontWeight: 600 }}>
              <Mail size={16} color="var(--sky-blue)" />
              <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: 'var(--sky-blue)', textDecoration: 'none' }}>{ADMIN_EMAIL}</a>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Feel free to reach out to the campus chapter team for retreat inquiries or partnerships.
            </p>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          color: 'var(--text-muted)',
          fontSize: '0.85rem'
        }}>
          <div>
            © {new Date().getFullYear()} SKY at UIUC Chapter. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Designed with</span>
            <Heart size={14} color="var(--sky-coral)" fill="var(--sky-coral)" />
            <span>for UIUC Students</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
