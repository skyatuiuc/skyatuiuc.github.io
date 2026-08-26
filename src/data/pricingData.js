/**
 * Centralized Pricing & Academic Roles Single Source of Truth
 * 
 * Provides structured data, role definitions, numeric fee mappings,
 * and helper utilities for registration, email services, and FAQs.
 */

export const PRICING_TIERS = [
  {
    id: 'undergrad',
    role: 'Undergraduate Student',
    amount: 0,
    formattedFee: '$0',
    feeTierLabel: '$0 (100% Fully Funded SORF Waiver)',
    dropdownLabel: 'Undergraduate Student ($0 SORF Fee)',
    description: 'Fully funded by UIUC Student Organization Resource Fee (SORF) grant',
    isFunded: true
  },
  {
    id: 'grad',
    role: 'Graduate Student',
    amount: 0,
    formattedFee: '$0',
    feeTierLabel: '$0 (100% Fully Funded SORF Waiver)',
    dropdownLabel: 'Graduate Student ($0 SORF Fee)',
    description: 'Fully funded by UIUC Student Organization Resource Fee (SORF) grant',
    isFunded: true
  },
  {
    id: 'phd',
    role: 'PhD Student',
    amount: 0,
    formattedFee: '$0',
    feeTierLabel: '$0 (100% Fully Funded SORF Waiver)',
    dropdownLabel: 'PhD Student ($0 SORF Fee)',
    description: 'Fully funded by UIUC Student Organization Resource Fee (SORF) grant',
    isFunded: true
  },
  {
    id: 'postdoc',
    role: 'Post-Doctorate',
    amount: 25,
    formattedFee: '$25',
    feeTierLabel: '$25 (Partial Scholar Funding)',
    dropdownLabel: 'Post-Doctorate ($25 Subsidized Fee)',
    description: 'Subsidized scholar rate for UIUC postdocs',
    isFunded: false
  },
  {
    id: 'scholar',
    role: 'Visiting Scholar',
    amount: 25,
    formattedFee: '$25',
    feeTierLabel: '$25 (Partial Scholar Funding)',
    dropdownLabel: 'Visiting Scholar ($25 Subsidized Fee)',
    description: 'Subsidized scholar rate for visiting researchers',
    isFunded: false
  },
  {
    id: 'faculty',
    role: 'Faculty',
    amount: 50,
    formattedFee: '$50',
    feeTierLabel: '$50 (Standard University Rate)',
    dropdownLabel: 'Faculty ($50 Fee)',
    description: 'Standard faculty rate',
    isFunded: false
  },
  {
    id: 'staff',
    role: 'Staff',
    amount: 50,
    formattedFee: '$50',
    feeTierLabel: '$50 (Standard University Rate)',
    dropdownLabel: 'Staff ($50 Fee)',
    description: 'Standard staff rate',
    isFunded: false
  },
  {
    id: 'faculty_staff',
    role: 'Faculty / Staff',
    amount: 50,
    formattedFee: '$50',
    feeTierLabel: '$50 (Standard University Rate)',
    dropdownLabel: 'Faculty / Staff ($50 Fee)',
    description: 'Standard faculty and staff rate',
    isFunded: false
  },
  {
    id: 'alumni_community',
    role: 'Alumni / Community',
    amount: 50,
    formattedFee: '$50',
    feeTierLabel: '$50 (Alumni & Community Rate)',
    dropdownLabel: 'Alumni / Community ($50 Fee)',
    description: 'Alumni & community affiliate rate',
    isFunded: false
  },
  {
    id: 'alumni_non_uiuc',
    role: 'Alumni / Non-UIUC Affiliate',
    amount: 50,
    formattedFee: '$50',
    feeTierLabel: '$50 (Alumni & Non-UIUC Rate)',
    dropdownLabel: 'Alumni / Non-UIUC Affiliate ($50 Fee)',
    description: 'Alumni & non-UIUC affiliate rate',
    isFunded: false
  }
];

// Direct case-insensitive map of role strings to integer cost numbers
export const ROLE_TO_FEE_MAP = {
  'undergraduate student': 0,
  'undergraduate': 0,
  'undergrad': 0,
  'graduate student': 0,
  'graduate': 0,
  'grad student': 0,
  'phd student': 0,
  'phd': 0,
  'student': 0,
  'post-doctorate': 25,
  'postdoc': 25,
  'visiting scholar': 25,
  'scholar': 25,
  'faculty': 50,
  'staff': 50,
  'faculty / staff': 50,
  'faculty/staff': 50,
  'alumni': 50,
  'alumni / community': 50,
  'alumni/community': 50,
  'alumni / non-uiuc affiliate': 50,
  'community': 50,
  'other': 50
};

/**
 * Get numeric fee for any academic role string (case-insensitive with fallback substring matching)
 * @param {string} role 
 * @returns {number}
 */
export function getFeeAmount(role) {
  if (!role) return 0;
  const clean = String(role).trim().toLowerCase();
  
  if (clean in ROLE_TO_FEE_MAP) {
    return ROLE_TO_FEE_MAP[clean];
  }

  // Robust Substring matching fallback
  if (clean.includes('undergrad') || clean.includes('student') || clean.includes('grad') || clean.includes('phd')) {
    return 0;
  }
  if (clean.includes('postdoc') || clean.includes('scholar')) {
    return 25;
  }
  if (clean.includes('faculty') || clean.includes('staff')) {
    return 50;
  }
  if (clean.includes('alumni') || clean.includes('community') || clean.includes('affiliate')) {
    return 95;
  }

  return 0;
}

/**
 * Get formatted fee tier label for an academic role
 * @param {string} role 
 * @returns {string}
 */
export function getFeeTierLabel(role) {
  const amount = getFeeAmount(role);
  if (amount === 0) return '$0 (SORF Funded Waiver)';
  if (amount === 25) return '$25 (Partial Scholar Rate)';
  if (amount === 50) return '$50 (Standard Rate)';
  return `$${amount} (Community Rate)`;
}

/**
 * Standard selectable academic role options for UI forms & dropdowns
 */
export const ACADEMIC_ROLE_OPTIONS = [
  { value: 'Undergraduate Student', label: 'Undergraduate Student ($0 SORF Fee)', amount: 0 },
  { value: 'Graduate Student', label: 'Graduate Student ($0 SORF Fee)', amount: 0 },
  { value: 'PhD Student', label: 'PhD Student ($0 SORF Fee)', amount: 0 },
  { value: 'Post-Doctorate', label: 'Post-Doctorate ($25 Subsidized Fee)', amount: 25 },
  { value: 'Visiting Scholar', label: 'Visiting Scholar ($25 Subsidized Fee)', amount: 25 },
  { value: 'Faculty / Staff', label: 'Faculty / Staff ($50 Fee)', amount: 50 },
  { value: 'Alumni / Community', label: 'Alumni / Community ($95 Fee)', amount: 95 }
];
