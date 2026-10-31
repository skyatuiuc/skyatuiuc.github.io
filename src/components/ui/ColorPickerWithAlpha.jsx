import React from 'react';

// Reusable Compact Color Selector with Opacity / Alpha Control & RGB Display
export default function ColorPickerWithAlpha({ label, value, onChange }) {
  const parseColor = (val) => {
    if (!val || val === 'transparent') return { hex: '#000000', alpha: 0 };
    if (val.startsWith('rgba') || val.startsWith('rgb')) {
      const match = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
        return { hex: `#${r}${g}${b}`, alpha: a };
      }
    }
    if (val.startsWith('#')) {
      if (val.length === 9) { // #RRGGBBAA
        const hex = val.substring(0, 7);
        const aHex = val.substring(7, 9);
        const alpha = parseInt(aHex, 16) / 255;
        return { hex, alpha };
      }
      return { hex: val.substring(0, 7), alpha: 1 };
    }
    return { hex: '#1f74f1', alpha: 1 };
  };

  const { hex, alpha } = parseColor(value);

  const hexToRgba = (h, a) => {
    if (a === 0) return 'transparent';
    if (a === 1) return h;
    const r = parseInt(h.substring(1, 3), 16);
    const g = parseInt(h.substring(3, 5), 16);
    const b = parseInt(h.substring(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  };

  const handleHexChange = (newHex) => {
    onChange(hexToRgba(newHex, alpha === 0 ? 1 : alpha));
  };

  const handleAlphaChange = (newAlpha) => {
    onChange(hexToRgba(hex, newAlpha));
  };

  const bgCheckerboard = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 700 }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#F8FAFC', padding: '0.45rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
          {/* Live Checkerboard Alpha Swatch & Native Color Wheel */}
          <div style={{
            position: 'relative',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            backgroundImage: bgCheckerboard,
            backgroundSize: '6px 6px',
            flexShrink: 0
          }}>
            <div style={{ position: 'absolute', inset: 0, background: value || 'transparent' }} />
            <input 
              type="color" 
              value={hex} 
              onChange={(e) => handleHexChange(e.target.value)} 
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
            />
          </div>

          {/* RGB Hex Code Text Box */}
          <input 
            type="text" 
            placeholder="#RGB"
            value={alpha === 0 ? 'transparent' : hex.toUpperCase()} 
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val.toLowerCase() === 'transparent') {
                onChange('transparent');
              } else if (val.startsWith('#')) {
                handleHexChange(val);
              } else {
                handleHexChange(`#${val}`);
              }
            }} 
            style={{ flex: 1, minWidth: 0, padding: '0.2rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '3px', color: 'var(--text-main)', fontSize: '0.72rem', fontFamily: 'monospace' }} 
          />

          {/* Clear / Transparent Quick Toggle */}
          <button 
            type="button" 
            onClick={() => onChange(alpha === 0 ? hex : 'transparent')} 
            style={{ padding: '0.2rem 0.4rem', fontSize: '0.68rem', background: alpha === 0 ? 'var(--sky-blue)' : 'rgba(35, 39, 95, 0.08)', color: alpha === 0 ? '#FFFFFF' : 'var(--text-main)', border: 'none', borderRadius: '3px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
          >
            {alpha === 0 ? 'Opaque' : 'Clear'}
          </button>
        </div>
        
        {/* Opacity / Alpha Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: '40px', fontWeight: 600, flexShrink: 0 }}>Opacity:</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={alpha} 
            onChange={(e) => handleAlphaChange(parseFloat(e.target.value))} 
            style={{ flex: 1, minWidth: 0, height: '4px' }} 
          />
          <span style={{ fontSize: '0.68rem', color: 'var(--sky-blue)', width: '28px', textAlign: 'right', fontWeight: 700, flexShrink: 0 }}>
            {Math.round(alpha * 100)}%
          </span>
        </div>

      </div>
    </div>
  );
}
