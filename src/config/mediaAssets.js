/* ==========================================================================
   SKY AT UIUC - Centralized Media & Asset Path Registry
   Handles official logos, retreat media, and gallery images with smart fallbacks.
   ========================================================================== */

export const MEDIA_ASSETS = {
  // Official Logos
  logos: {
    skyCustomBlue: '/assets/logos/skyatuiuc_logos/skyatuiuc_custom_blue.png',
    skyCustomWhite: '/assets/logos/skyatuiuc_logos/skyatuiuc_custom_white.png',
    skyWideWhite: '/assets/logos/skyatuiuc_logos/skyatuiuc_wide_white.png',
    skyWideBlue: '/assets/logos/skyatuiuc_logos/skyatuiuc_wide_blue.png',
    skyWideBlack: '/assets/logos/skyatuiuc_logos/skyatuiuc_wide_black.png',
    uiucFullcolor: '/assets/logos/uiuc_logos/uiuc_fullcolor.png'
  },

  // Past Retreat Photos & Hero Media
  retreats: {
    heroBackground: '/assets/retreats/hero-bg.jpg',
    groupMeditation: '/assets/retreats/group-meditation.jpg',
    workshopLeadership: '/assets/retreats/leadership-workshop.jpg',
    retreatBanner: '/assets/retreats/spring-2025-group.jpg'
  },

  // Fallback Stock URLs (Used until custom photos are uploaded to /public/assets/retreats/)
  fallbacks: {
    heroBackground: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=2000&q=80',
    groupMeditation: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    leadershipWorkshop: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80'
  }
};
