import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { StatusChips } from './ui/StatusBadge';
import { ROLE_CATEGORY_LABELS, RETREAT_DAYS, getGroupName, groupIdFor } from '../models/applicant';

// Shared filter bar for every roster screen. Pass the facets the screen needs, in display order:
//   'search' | 'statuses' | 'claim' | 'payment' | 'iahv' | 'group' | 'role' | 'people' | 'email' | 'attendance' | 'sort'
// State comes from useApplicantFilters().

const DAY_LABELS = { day1: 'Day 1', day2: 'Day 2', day3: 'Day 3' };

const EMAIL_FILTER_OPTIONS = [
  ['all', 'Any email state'],
  ['unsent:application_received', 'Received email not sent'],
  ['unsent:application_accepted', 'Acceptance not sent'],
  ['unsent:welcome', 'Welcome not sent'],
  ['unsent:completion', 'Completion not sent'],
  ['needs_paypal', 'Owes fee, no PayPal link']
];

const SELECT_FACETS = {
  claim: { label: 'Claim', options: [['all', 'All claims'], ['mine', 'My claims'], ['unclaimed', 'Unclaimed'], ['others', 'Claimed by others']] },
  payment: { label: 'Payment', options: [['all', 'All payments'], ['settled', 'Paid / Exempt'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['exempt', 'Exempt ($0 fee)']] },
  iahv: { label: 'IAHV', options: [['all', 'IAHV: any'], ['yes', 'IAHV registered'], ['no', 'Not IAHV registered']] },
  role: { label: 'Role', options: [['all', 'All roles'], ...Object.entries(ROLE_CATEGORY_LABELS)] },
  people: { label: 'People', options: [['all', 'Participants & volunteers'], ['participants', 'Participants only'], ['volunteers', 'Attending volunteers only']] },
  email: { label: 'Email', options: EMAIL_FILTER_OPTIONS },
  attendance: {
    label: 'Attendance',
    options: [
      ['all', 'Any attendance'],
      ...RETREAT_DAYS.flatMap(d => [[`absent:${d}`, `Not checked in ${DAY_LABELS[d]}`], [`present:${d}`, `Checked in ${DAY_LABELS[d]}`]]),
      ['complete', 'Attended all 3 days'],
      ['incomplete', 'Missed a day']
    ]
  },
  sort: { label: 'Sort', options: [['oldest', 'Oldest applicants first'], ['newest', 'Newest first'], ['name', 'Name (A-Z)'], ['status', 'Status'], ['lastContacted', 'Recently contacted']] }
};

export default function ApplicantFilterBar({
  facets,
  filters,
  setFilter,
  resetFilters,
  statusCounts,
  activeFilterCount = 0,
  retreat,
  resultCount,
  totalCount,
  children
}) {
  const has = (f) => facets.includes(f);

  const groupOptions = [['all', 'All groups'], ['unassigned', 'Unassigned']];
  for (let n = 1; n <= (retreat?.groupConfig?.numGroups || 0); n += 1) {
    const id = groupIdFor(n);
    groupOptions.push([id, getGroupName(id, retreat)]);
  }
  const selectFacets = { ...SELECT_FACETS, group: { label: 'Group', options: groupOptions } };

  const toggleStatus = (status) => {
    const current = filters.statuses || [];
    setFilter('statuses', current.includes(status) ? current.filter(s => s !== status) : [...current, status]);
  };

  return (
    <div className="card filter-bar">
      <div className="row">
        {has('search') && (
          <div className="search-field">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search name, email, phone, role…"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              aria-label="Search applicants"
              className="select-compact"
            />
          </div>
        )}

        <div className="row ml-auto">
          {typeof resultCount === 'number' && (
            <span className="text-sm text-secondary fw-bold">
              Showing {resultCount}{typeof totalCount === 'number' ? ` of ${totalCount}` : ''}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button type="button" onClick={resetFilters} className="select-compact row" style={{ gap: '0.3rem', color: '#B91C1C' }}>
              <X size={14} /> Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
            </button>
          )}
          {children}
        </div>
      </div>

      {has('statuses') && (
        <StatusChips
          selected={filters.statuses || []}
          counts={statusCounts}
          onToggle={toggleStatus}
          leading={<Filter size={14} color="var(--text-muted)" />}
        />
      )}

      {facets.some(f => selectFacets[f]) && (
        <div className="filter-bar-selects">
          {facets.filter(f => selectFacets[f]).map((facet) => (
            <select
              key={facet}
              aria-label={selectFacets[facet].label}
              value={filters[facet]}
              onChange={(e) => setFilter(facet, e.target.value)}
              className="select-compact"
            >
              {selectFacets[facet].options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ))}
        </div>
      )}
    </div>
  );
}
