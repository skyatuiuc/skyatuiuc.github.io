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
  people: { label: 'People', options: [['all', 'Participants & volunteers'], ['participants', 'Participants only'], ['volunteers', 'Volunteers only']] },
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

const selectStyle = {
  padding: '0.5rem 0.65rem',
  background: '#FFFFFF',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-main)',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  minWidth: 0
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
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '1rem 1.15rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {has('search') && (
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="search"
              placeholder="Search name, email, phone, role…"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              aria-label="Search applicants"
              style={{ ...selectStyle, width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.1rem', fontWeight: 500, cursor: 'text' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {typeof resultCount === 'number' && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Showing {resultCount}{typeof totalCount === 'number' ? ` of ${totalCount}` : ''}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button type="button" onClick={resetFilters} style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#B91C1C' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.55rem' }}>
          {facets.filter(f => selectFacets[f]).map((facet) => (
            <select
              key={facet}
              aria-label={selectFacets[facet].label}
              value={filters[facet]}
              onChange={(e) => setFilter(facet, e.target.value)}
              style={selectStyle}
            >
              {selectFacets[facet].options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ))}
        </div>
      )}
    </div>
  );
}
