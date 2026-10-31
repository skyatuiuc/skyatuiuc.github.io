import { useCallback, useMemo, useState } from 'react';
import { FILTER_DEFAULTS, filterApplicants, countByStatus, countActiveFilters } from '../models/applicantFilters';

/**
 * Filter/sort state for a roster screen.
 * @param {object[]} registrations
 * @param {{userEmail?: string, retreat?: object, authorizedEmails?: string[]}} ctx
 * @param {object} [initial] overrides of FILTER_DEFAULTS for this screen
 */
export function useApplicantFilters(registrations, ctx, initial) {
  const [filters, setFilters] = useState(() => ({ ...FILTER_DEFAULTS, ...initial }));
  const { userEmail, retreat, authorizedEmails } = ctx;

  const setFilter = useCallback((key, value) => setFilters(prev => ({ ...prev, [key]: value })), []);
  const resetFilters = useCallback(() => setFilters(prev => ({ ...FILTER_DEFAULTS, ...initial, sort: prev.sort })), [initial]);

  const filtered = useMemo(
    () => filterApplicants(registrations, filters, { userEmail, retreat, authorizedEmails }),
    [registrations, filters, userEmail, retreat, authorizedEmails]
  );
  const statusCounts = useMemo(
    () => countByStatus(registrations, filters, { userEmail, retreat, authorizedEmails }),
    [registrations, filters, userEmail, retreat, authorizedEmails]
  );

  return { filters, setFilter, resetFilters, filtered, statusCounts, activeFilterCount: countActiveFilters(filters) };
}
