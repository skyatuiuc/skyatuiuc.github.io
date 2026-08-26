import React, { useState } from 'react';
import { Calendar, BarChart3 } from 'lucide-react';
import { formatBytes } from '../config/resourceLimits';

export default function ResourceUsageChart({ logs = [], dateRangeDays = 14, onRangeChange }) {
  const [selectedMetric, setSelectedMetric] = useState('reads'); // 'reads' | 'writes' | 'deletes' | 'egress' | 'all'
  const [hoveredData, setHoveredData] = useState(null);
  
  // Custom Date Range Pickers
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultStartStr = new Date(Date.now() - (dateRangeDays - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultStartStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Filter & sort logs chronologically between startDate and endDate
  const sortedLogs = [...logs]
    .filter(item => item.date >= startDate && item.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  const handlePresetDays = (days) => {
    const newStart = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(newStart);
    setEndDate(todayStr);
    if (onRangeChange) onRangeChange(days);
  };

  const getMetricValue = (item, metricKey) => {
    const reads = Number(item.reads) || 0;
    const writes = Number(item.writes) || 0;
    const deletes = Number(item.deletes) || 0;

    switch (metricKey) {
      case 'reads': return reads;
      case 'writes': return writes;
      case 'deletes': return deletes;
      case 'egress': return (reads * 1.2) / 1024; // MB
      case 'all': return reads + writes + deletes;
      default: return reads;
    }
  };

  const getMetricColor = (metricKey) => {
    switch (metricKey) {
      case 'reads': return '#1F74F1';
      case 'writes': return '#FABC1D';
      case 'deletes': return '#FF7A5C';
      case 'egress': return '#7FA842';
      case 'all': return '#10B981';
      default: return '#1F74F1';
    }
  };

  const maxVal = Math.max(10, ...sortedLogs.map(item => getMetricValue(item, selectedMetric)));

  return (
    <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={22} color="var(--sky-blue)" />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Historical Resource Trends
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Interactive visualization of database operations and network bandwidth over time.
            </p>
          </div>
        </div>

        {/* Date Range Selection Controls (Presets + Start/End Date Pickers) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Presets:</span>
            {[7, 14, 30].map(days => (
              <button
                key={days}
                onClick={() => handlePresetDays(days)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: '#F8FAFC',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {days}D
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <Calendar size={14} color="var(--sky-blue)" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none' }} 
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none' }} 
            />
          </div>
        </div>
      </div>

      {/* METRIC SUB-TABS */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.75rem',
        overflowX: 'auto',
        paddingBottom: '0.25rem'
      }}>
        {[
          { key: 'reads', label: 'Reads', color: '#1F74F1' },
          { key: 'writes', label: 'Writes', color: '#B45309' },
          { key: 'deletes', label: 'Deletes', color: '#C2410C' },
          { key: 'egress', label: 'Egress Bandwidth', color: '#166534' },
          { key: 'all', label: 'Total Operations', color: '#1F74F1' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedMetric(tab.key)}
            style={{
              padding: '0.6rem 1.1rem',
              background: selectedMetric === tab.key ? 'var(--sky-blue-subtle)' : 'transparent',
              border: 'none',
              borderBottom: selectedMetric === tab.key ? '3px solid var(--sky-blue)' : '3px solid transparent',
              color: selectedMetric === tab.key ? 'var(--sky-blue)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              transition: 'var(--transition-fast)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CHART SVG AREA */}
      {sortedLogs.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No historical audit logs recorded for this timeframe yet.
        </div>
      ) : (
        <div>
          {/* Tooltip Bar Display */}
          <div style={{ height: '24px', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
            {hoveredData ? (
              <span style={{ color: getMetricColor(selectedMetric) }}>
                📅 {hoveredData.date}: {
                  selectedMetric === 'egress'
                    ? formatBytes(getMetricValue(hoveredData, selectedMetric) * 1024 * 1024)
                    : `${getMetricValue(hoveredData, selectedMetric)} ${selectedMetric}`
                }
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Hover over a bar to inspect daily metrics</span>
            )}
          </div>

          {/* SVG Bar Graph */}
          <div style={{ width: '100%', height: '220px', position: 'relative' }}>
            <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              {/* Background Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => (
                <line
                  key={idx}
                  x1="0"
                  y1={200 * (1 - pct)}
                  x2="100%"
                  y2={200 * (1 - pct)}
                  stroke="rgba(35, 39, 95, 0.08)"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Bars */}
              {sortedLogs.map((item, idx) => {
                const val = getMetricValue(item, selectedMetric);
                const heightPct = Math.max(4, (val / maxVal) * 180);
                const barWidthPct = Math.min(6, 80 / sortedLogs.length);
                const xPct = (idx / (sortedLogs.length - 1 || 1)) * 90 + 5;

                return (
                  <g key={item.id || idx}
                     onMouseEnter={() => setHoveredData(item)}
                     onMouseLeave={() => setHoveredData(null)}
                     style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={`${xPct - (barWidthPct / 2)}%`}
                      y={200 - heightPct}
                      width={`${barWidthPct}%`}
                      height={heightPct}
                      rx="3"
                      fill={hoveredData?.id === item.id ? 'var(--sky-sun)' : getMetricColor(selectedMetric)}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* X-Axis Date Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>{sortedLogs[0]?.date}</span>
            <span>{sortedLogs[Math.floor(sortedLogs.length / 2)]?.date}</span>
            <span>{sortedLogs[sortedLogs.length - 1]?.date} (Today)</span>
          </div>
        </div>
      )}

    </div>
  );
}
