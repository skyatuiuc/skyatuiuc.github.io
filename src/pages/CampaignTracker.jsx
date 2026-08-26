import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recordCampaignScan } from '../services/campaignAnalyticsService';

export default function CampaignTracker() {
  const { campaignTag } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const rawTag = (campaignTag || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    // Reserved paths that should never be treated as campaign tags
    const reservedPaths = ['register', 'research', 'volunteer', 'admin', 'my-retreats', 'unauthorized'];
    
    if (!rawTag || reservedPaths.includes(rawTag)) {
      navigate('/register', { replace: true });
      return;
    }

    const trackAndRedirect = () => {
      // 1. Store referral tag in session and local storage for application conversion attribution
      try {
        sessionStorage.setItem('sky_referral_src', rawTag);
        localStorage.setItem('sky_referral_src', rawTag);
        sessionStorage.setItem('sky_campaign_tag', rawTag);
        localStorage.setItem('sky_campaign_tag', rawTag);
      } catch (err) {
        console.warn("Storage referral save error:", err);
      }

      // 2. Fire-and-forget scan beacon to Google Apps Script (0 Firestore writes)
      recordCampaignScan(rawTag);

      // 3. Seamless instantaneous redirect to application form with referral query parameter
      navigate(`/register?src=${encodeURIComponent(rawTag)}`, { replace: true });
    };

    trackAndRedirect();
  }, [campaignTag, navigate]);

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
        Redirecting to SKY Happiness Retreat Application...
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Connecting via campaign code: <strong style={{ color: 'var(--sky-blue)' }}>{campaignTag}</strong>
      </p>
    </div>
  );
}
