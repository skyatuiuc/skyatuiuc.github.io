import React from 'react';

// Underlined tab strip used by the Admin and Volunteer portals.
// tabs: [{ id, label, Icon, accent (underline colour), color (active text/icon colour) }]
export default function TabBar({ tabs, activeTab, onChange, style }) {
  return (
    <div role="tablist" className="tab-bar" style={style}>
      {tabs.map(({ id, label, Icon, accent = 'var(--sky-blue)', color = 'var(--sky-blue)' }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className="tab-bar-tab"
            style={isActive ? { borderBottomColor: accent, color } : undefined}
          >
            {Icon && <Icon size={18} color={isActive ? color : 'var(--text-muted)'} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
