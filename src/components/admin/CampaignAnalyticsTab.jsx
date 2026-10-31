import React, { useState, useEffect } from 'react';
import { getCampaignAnalyticsForDateRange } from '../../services/campaignAnalyticsService';
import { CheckCircle2, Calendar, BarChart3, QrCode, TrendingUp } from 'lucide-react';
import { todayChicago, addDaysToKey } from '../../utils/dateUtils';

// Admin tab: campaign QR / shortlink scan and conversion analytics
export default function CampaignAnalyticsTab() {
  // Campaign Scan & Conversion Analytics Dashboard State
  const defaultCampEnd = todayChicago();
  const defaultCampStart = addDaysToKey(defaultCampEnd, -30);
  
  const [campStartDate, setCampStartDate] = useState(defaultCampStart);
  const [campEndDate, setCampEndDate] = useState(defaultCampEnd);
  const [campDailyMetrics, setCampDailyMetrics] = useState([]);
  const [campTagTotals, setCampTagTotals] = useState([]);
  const [campGrandScans, setCampGrandScans] = useState(0);
  const [campGrandConversions, setCampGrandConversions] = useState(0);
  const [hoveredCampDay, setHoveredCampDay] = useState(null);
  const [compareMetric, setCompareMetric] = useState('scans'); // 'scans' | 'conversions'

  // Fetch campaign analytics for date range (1-2 reads per month)
  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      const data = await getCampaignAnalyticsForDateRange(campStartDate, campEndDate);
      if (isMounted) {
        setCampDailyMetrics(data.dailyMetrics);
        setCampTagTotals(data.tagTotals);
        setCampGrandScans(data.grandTotalScans);
        setCampGrandConversions(data.grandTotalConversions);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, [campStartDate, campEndDate]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Metric Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sky-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total QR Code Scans
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={26} color="var(--sky-blue)" />
            {campGrandScans}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Selected date range total
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Referral Registrations
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={26} color="#16A34A" />
            {campGrandConversions}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Applications from QR codes
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Overall Conversion Rate
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={26} color="#B45309" />
            {campGrandScans > 0 ? ((campGrandConversions / campGrandScans) * 100).toFixed(1) : '0.0'}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Registrations per scan ratio
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7E22CE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top Outreach Channel
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {campTagTotals[0] ? `#${campTagTotals[0].tag}` : 'None Yet'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {campTagTotals[0] ? `${campTagTotals[0].totalScans} scans • ${campTagTotals[0].totalConversions} registered` : 'Create shortcodes in Volunteer Portal'}
          </div>
        </div>
      </div>

      {/* DYNAMIC HISTORIC GRAPH & DATE RANGE PICKERS */}
      <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} color="var(--sky-blue)" /> Dynamic Day-by-Day Scan & Conversion Trends
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Track daily poster scans vs application completions over any custom historical window.
            </p>
          </div>

          {/* Date Filter & Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {[7, 14, 30, 90].map(days => {
                const endStr = todayChicago();
                const startStr = addDaysToKey(endStr, -(days - 1));
                const isSelected = campStartDate === startStr && campEndDate === endStr;
                return (
                  <button
                    key={days}
                    onClick={() => { setCampStartDate(startStr); setCampEndDate(endStr); }}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--sky-blue)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--sky-blue-subtle)' : '#F8FAFC',
                      color: isSelected ? 'var(--sky-blue)' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {days}D
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <Calendar size={14} color="var(--sky-blue)" />
              <input 
                type="date" 
                value={campStartDate} 
                onChange={(e) => setCampStartDate(e.target.value)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none' }} 
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>to</span>
              <input 
                type="date" 
                value={campEndDate} 
                onChange={(e) => setCampEndDate(e.target.value)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none' }} 
              />
            </div>
          </div>
        </div>

        {/* Day-by-Day Graph Area */}
        {campDailyMetrics.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No QR scans recorded for the selected date timeframe.
          </div>
        ) : (
          <div>
            {/* Hover Tooltip Indicator */}
            <div style={{ height: '24px', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
              {hoveredCampDay ? (
                <span>
                  📅 <strong>{hoveredCampDay.date}</strong>: <span style={{ color: 'var(--sky-blue)' }}>{hoveredCampDay.scans} Scans</span> • <span style={{ color: '#16A34A' }}>{hoveredCampDay.conversions} Registered</span> ({hoveredCampDay.scans > 0 ? ((hoveredCampDay.conversions / hoveredCampDay.scans) * 100).toFixed(1) : 0}% conversion)
                </span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Hover over graph bars to inspect daily scans and referral registrations</span>
              )}
            </div>

            {/* Dual Bar Chart (Scans & Conversions) */}
            <div style={{ width: '100%', height: '220px', position: 'relative' }}>
              <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Gridlines */}
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

                {/* Render Dual Bars per Day */}
                {(() => {
                  const maxVal = Math.max(5, ...campDailyMetrics.map(m => Math.max(m.scans, m.conversions)));
                  return campDailyMetrics.map((item, idx) => {
                    const scanHeight = Math.max(4, (item.scans / maxVal) * 180);
                    const convHeight = Math.max(0, (item.conversions / maxVal) * 180);
                    const xPct = (idx / (campDailyMetrics.length - 1 || 1)) * 90 + 5;
                    const barWidthPct = Math.min(4, 70 / campDailyMetrics.length);

                    return (
                      <g 
                        key={item.date} 
                        onMouseEnter={() => setHoveredCampDay(item)}
                        onMouseLeave={() => setHoveredCampDay(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Scan Bar (Blue) */}
                        <rect
                          x={`${xPct - barWidthPct}%`}
                          y={200 - scanHeight}
                          width={`${barWidthPct}%`}
                          height={scanHeight}
                          rx="2"
                          fill={hoveredCampDay?.date === item.date ? '#1F74F1' : '#60A5FA'}
                          opacity={0.85}
                        />
                        {/* Conversion Bar (Green) */}
                        {convHeight > 0 && (
                          <rect
                            x={`${xPct}%`}
                            y={200 - convHeight}
                            width={`${barWidthPct}%`}
                            height={convHeight}
                            rx="2"
                            fill={hoveredCampDay?.date === item.date ? '#16A34A' : '#34D399'}
                          />
                        )}
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>

            {/* Legend & X-Axis Labels */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span>{campDailyMetrics[0]?.date}</span>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--sky-blue)', fontWeight: 600 }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--sky-blue)', borderRadius: '2px' }} /> Daily Scans
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#16A34A', fontWeight: 600 }}>
                  <span style={{ width: '10px', height: '10px', background: '#16A34A', borderRadius: '2px' }} /> Referral Registrations
                </span>
              </div>
              <span>{campDailyMetrics[campDailyMetrics.length - 1]?.date}</span>
            </div>
          </div>
        )}
      </div>

      {/* CAMPAIGN SHORTCODE OUTREACH PERFORMANCE ROSTER & MULTI-CHANNEL COMPARATIVE GRAPH */}
      <div className="glass-card" style={{ padding: '2rem', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={20} color="var(--sky-blue)" /> Campaign Outreach Channel Performance ({campTagTotals.length})
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Aggregated scan & registration conversion rates, plus side-by-side day-by-day channel performance trends.
            </p>
          </div>

          {/* Metric Selector for Channel Comparison */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#F8FAFC', padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setCompareMetric('scans')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '4px',
                border: 'none',
                background: compareMetric === 'scans' ? 'var(--sky-blue)' : 'transparent',
                color: compareMetric === 'scans' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Compare Daily Scans
            </button>
            <button
              type="button"
              onClick={() => setCompareMetric('conversions')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '4px',
                border: 'none',
                background: compareMetric === 'conversions' ? '#10B981' : 'transparent',
                color: compareMetric === 'conversions' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Compare Registrations
            </button>
          </div>
        </div>

        {/* MULTI-CHANNEL COMPARATIVE DAY-BY-DAY GRAPH */}
        {campDailyMetrics.length > 0 && campTagTotals.length > 0 && (
          <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              📈 Channel Performance Trends Over Time ({compareMetric === 'scans' ? 'Daily Scans' : 'Daily Referral Registrations'})
            </div>

            {/* Channel Badges Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem' }}>
              {campTagTotals.map((camp, idx) => {
                const colors = ['#1F74F1', '#B45309', '#166534', '#7E22CE', '#DB2777', '#0891B2', '#C2410C'];
                const color = colors[idx % colors.length];
                return (
                  <div key={camp.tag} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#FFFFFF', padding: '0.25rem 0.55rem', borderRadius: '15px', border: `1px solid ${color}44` }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>#{camp.tag}</span>
                  </div>
                );
              })}
            </div>

            {/* Multi-Channel Graph SVG with Connected Trendlines */}
            <div style={{ width: '100%', height: '180px', position: 'relative' }}>
              <svg viewBox="0 0 1000 180" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {[0, 0.33, 0.66, 1].map((pct, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={160 * (1 - pct)}
                    x2="1000"
                    y2={160 * (1 - pct)}
                    stroke="rgba(35, 39, 95, 0.08)"
                    strokeDasharray="4 4"
                  />
                ))}

                {(() => {
                  const colors = ['#1F74F1', '#B45309', '#166534', '#7E22CE', '#DB2777', '#0891B2', '#C2410C'];
                  let maxChannelVal = 5;
                  campDailyMetrics.forEach(d => {
                    if (d.channels) {
                      Object.values(d.channels).forEach(c => {
                        const val = compareMetric === 'scans' ? (c.scans || 0) : (c.conversions || 0);
                        if (val > maxChannelVal) maxChannelVal = val;
                      });
                    }
                  });

                  return campTagTotals.map((camp, tagIdx) => {
                    const color = colors[tagIdx % colors.length];
                    const points = campDailyMetrics.map((dayItem, dayIdx) => {
                      const val = compareMetric === 'scans'
                        ? (dayItem.channels?.[camp.tag]?.scans || 0)
                        : (dayItem.channels?.[camp.tag]?.conversions || 0);
                      const xPx = (dayIdx / (campDailyMetrics.length - 1 || 1)) * 900 + 50;
                      const yPx = 160 - Math.max(0, (val / maxChannelVal) * 140);
                      return { xPx, yPx, val, date: dayItem.date };
                    });

                    const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.xPx.toFixed(1)} ${pt.yPx.toFixed(1)}`).join(' ');

                    return (
                      <g key={camp.tag}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.95}
                        />
                        {points.map((pt, i) => (
                          <circle
                            key={i}
                            cx={pt.xPx.toFixed(1)}
                            cy={pt.yPx.toFixed(1)}
                            r={pt.val > 0 ? "5" : "2.5"}
                            fill={color}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          >
                            <title>{`#${camp.tag} (${pt.date}): ${pt.val} ${compareMetric}`}</title>
                          </circle>
                        ))}
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>
          </div>
        )}

        {campTagTotals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', background: '#F8FAFC', borderRadius: 'var(--radius-sm)' }}>
            No campaign scan data recorded for this date timeframe.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: '#F8FAFC' }}>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>CAMPAIGN TAG</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>SCANS</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>REGISTRATIONS</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>CONVERSION %</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 700 }}>LAST SCANNED</th>
                </tr>
              </thead>
              <tbody>
                {campTagTotals.map((camp) => {
                  const convRate = camp.totalScans > 0 ? ((camp.totalConversions / camp.totalScans) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={camp.tag} style={{ borderBottom: '1px solid rgba(35, 39, 95, 0.06)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#B45309' }}>
                        #{camp.tag}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--sky-blue)', textAlign: 'center' }}>
                        {camp.totalScans}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#16A34A', textAlign: 'center' }}>
                        {camp.totalConversions}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span className="badge badge-sun" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {convRate}%
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {camp.lastScannedAt ? new Date(camp.lastScannedAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
