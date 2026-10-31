import React from 'react';

// Underlined tab strip used by the Admin and Volunteer portals.
// tabs: [{ id, label, Icon, accent (underline colour), color (active text/icon colour) }]
export default function TabBar({ tabs, activeTab, onChange, style }) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '2.5rem',
        overflowX: 'auto',
        paddingBottom: '0.35rem',
        WebkitOverflowScrolling: 'touch',
        ...style
      }}
    >
      {tabs.map(({ id, label, Icon, accent = 'var(--sky-blue)', color = 'var(--sky-blue)' }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            style={{
              padding: '0.8rem 1.25rem',
              background: isActive ? '#FFFFFF' : 'none',
              border: 'none',
              borderBottom: isActive ? `3px solid ${accent}` : '3px solid transparent',
              color: isActive ? color : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            {Icon && <Icon size={18} color={isActive ? color : 'var(--text-muted)'} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
