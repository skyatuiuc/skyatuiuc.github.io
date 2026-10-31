import { useCallback, useEffect, useMemo, useState } from 'react';
import { FILTER_DEFAULTS, filterApplicants, countByStatus, countActiveFilters } from '../models/applicantFilters';

const storageKeyFor = (key) => `sky_filters_${key}`;

// Filters are remembered per screen in this browser (a convenience; never the search text). Anything
// unreadable or of the wrong shape is ignored, so a bad stored value can never break a screen.
const readSaved = (key) => {
  if (!key) return {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeyFor(key)) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([facet, value]) => (
      facet !== 'search' && facet in FILTER_DEFAULTS &&
      (Array.isArray(FILTER_DEFAULTS[facet]) ? Array.isArray(value) : typeof value === typeof FILTER_DEFAULTS[facet])
    )));
  } catch {
    return {};
  }
};

/**
 * Filter/sort state for a roster screen.
 * @param {object[]} registrations
 * @param {{userEmail?: string, retreat?: object}} ctx
 * @param {object} [initial] overrides of FILTER_DEFAULTS for this screen (keep the object stable)
 * @param {string} [storageKey] remember this screen's filters in this browser under this key
 */
export function useApplicantFilters(registrations, ctx, initial, storageKey) {
  const [filters, setFilters] = useState(() => ({ ...FILTER_DEFAULTS, ...initial, ...readSaved(storageKey) }));
  const { userEmail, retreat } = ctx;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const { search: _search, ...rest } = filters;
      localStorage.setItem(storageKeyFor(storageKey), JSON.stringify(rest));
    } catch {
      // storage unavailable (private mode): filters still work for this visit
    }
  }, [filters, storageKey]);

  const setFilter = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value })), []);
  const resetFilters = useCallback(() => setFilters(prev => ({ ...FILTER_DEFAULTS, ...initial, sort: prev.sort })), [initial]);

  const filtered = useMemo(
    () => filterApplicants(registrations, filters, { userEmail, retreat }),
    [registrations, filters, userEmail, retreat]
  );
  const statusCounts = useMemo(
    () => countByStatus(registrations, filters, { userEmail, retreat }),
    [registrations, filters, userEmail, retreat]
  );

  const baseline = useMemo(() => ({ ...FILTER_DEFAULTS, ...initial }), [initial]);
  return { filters, setFilter, resetFilters, filtered, statusCounts, activeFilterCount: countActiveFilters(filters, baseline) };
}
