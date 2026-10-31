import React from 'react';
import ColorPickerWithAlpha from '../ui/ColorPickerWithAlpha';

// Position, size, font, colour and shadow controls for one nametag text box (first name or group
// name). Values are in source-image pixels, clamped to the uploaded artwork's natural size.
export default function NametagTextBoxControls({
  title, Icon, accent, borderColor, colorLabel, box, setBox, naturalWidth, naturalHeight, defaults
}) {
  return (
    <fieldset style={{
      border: `1.5px solid ${borderColor}`,
      borderRadius: 'var(--radius-sm)',
      padding: '1rem',
      background: '#FFFFFF'
    }}>
      <legend style={{ padding: '0 0.5rem', fontSize: '0.82rem', fontWeight: 800, color: accent, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Icon size={14} /> {title}
      </legend>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

        {/* Sliders & Direct Inputs: Center Coordinates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>CENTER X</span>
              <span>{box.centerX || 0} px</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max={naturalWidth}
                value={Number(box.centerX) || 0}
                onChange={(e) => setBox({ ...box, centerX: parseInt(e.target.value, 10) || 0 })}
                style={{ flex: 1, accentColor: accent }}
              />
              <input
                type="number"
                min="0"
                max={naturalWidth}
                value={box.centerX ?? ''}
                onChange={(e) => setBox({ ...box, centerX: e.target.value })}
                onBlur={() => {
                  const val = parseInt(box.centerX, 10);
                  setBox({ ...box, centerX: isNaN(val) ? Math.round(naturalWidth / 2) : Math.max(0, Math.min(naturalWidth, val)) });
                }}
                style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>CENTER Y</span>
              <span>{box.centerY || 0} px</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max={naturalHeight}
                value={Number(box.centerY) || 0}
                onChange={(e) => setBox({ ...box, centerY: parseInt(e.target.value, 10) || 0 })}
                style={{ flex: 1, accentColor: accent }}
              />
              <input
                type="number"
                min="0"
                max={naturalHeight}
                value={box.centerY ?? ''}
                onChange={(e) => setBox({ ...box, centerY: e.target.value })}
                onBlur={() => {
                  const val = parseInt(box.centerY, 10);
                  setBox({ ...box, centerY: isNaN(val) ? Math.round(naturalHeight / 2) : Math.max(0, Math.min(naturalHeight, val)) });
                }}
                style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Sliders & Direct Inputs: Bounding Box Width & Height */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>box WIDTH</span>
              <span>{box.width || 0} px</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="range"
                min="20"
                max={naturalWidth}
                value={Number(box.width) || 20}
                onChange={(e) => setBox({ ...box, width: parseInt(e.target.value, 10) || 20 })}
                style={{ flex: 1, accentColor: accent }}
              />
              <input
                type="number"
                min="10"
                max={naturalWidth}
                value={box.width ?? ''}
                onChange={(e) => setBox({ ...box, width: e.target.value })}
                onBlur={() => {
                  const val = parseInt(box.width, 10);
                  setBox({ ...box, width: isNaN(val) ? 200 : Math.max(10, Math.min(naturalWidth, val)) });
                }}
                style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>box HEIGHT</span>
              <span>{box.height || 0} px</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="range"
                min="20"
                max={naturalHeight}
                value={Number(box.height) || 20}
                onChange={(e) => setBox({ ...box, height: parseInt(e.target.value, 10) || 20 })}
                style={{ flex: 1, accentColor: accent }}
              />
              <input
                type="number"
                min="10"
                max={naturalHeight}
                value={box.height ?? ''}
                onChange={(e) => setBox({ ...box, height: e.target.value })}
                onBlur={() => {
                  const val = parseInt(box.height, 10);
                  setBox({ ...box, height: isNaN(val) ? defaults.height : Math.max(10, Math.min(naturalHeight, val)) });
                }}
                style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>
        </div>

        {/* Max Font Size & Family */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>MAX FONT SIZE</span>
              <span>{box.maxFontSize || 0} px</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="range"
                min="10"
                max={defaults.fontSliderMax}
                value={Number(box.maxFontSize) || 10}
                onChange={(e) => setBox({ ...box, maxFontSize: parseInt(e.target.value, 10) || 10 })}
                style={{ flex: 1, accentColor: accent }}
              />
              <input
                type="number"
                min="8"
                max={defaults.fontInputMax}
                value={box.maxFontSize ?? ''}
                onChange={(e) => setBox({ ...box, maxFontSize: e.target.value })}
                onBlur={() => {
                  const val = parseInt(box.maxFontSize, 10);
                  setBox({ ...box, maxFontSize: isNaN(val) ? defaults.fontSize : Math.max(8, val) });
                }}
                style={{ width: '72px', padding: '0.25rem 0.35rem', background: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              FONT FAMILY
            </label>
            <select
              value={box.fontFamily}
              onChange={(e) => setBox({ ...box, fontFamily: e.target.value })}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: '#FFFFFF' }}
            >
              <option value="'Source Sans 3', sans-serif">Source Sans 3 (Standard)</option>
              <option value="'Inter', sans-serif">Inter Sans</option>
              <option value="'Montserrat', sans-serif">Montserrat Bold</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Merriweather', serif">Merriweather Serif</option>
              <option value="'Courier New', monospace">Courier Monospace</option>
            </select>
          </div>
        </div>

        {/* Text Align, Bold & Color */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              TEXT ALIGNMENT
            </label>
            <select
              value={box.textAlign || 'center'}
              onChange={(e) => setBox({ ...box, textAlign: e.target.value })}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: '#FFFFFF' }}
            >
              <option value="center">Center</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div style={{ paddingTop: '1.1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={box.bold !== false}
                onChange={(e) => setBox({ ...box, bold: e.target.checked })}
              />
              Bold Weight
            </label>
          </div>
        </div>

        {/* Color Picker */}
        <ColorPickerWithAlpha
          label={colorLabel}
          value={box.color}
          onChange={(c) => setBox({ ...box, color: c })}
        />

        {/* Shadow Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={box.hasShadow || false}
              onChange={(e) => setBox({ ...box, hasShadow: e.target.checked })}
            />
            Enable Drop Shadow
          </label>
          {box.hasShadow && (
            <ColorPickerWithAlpha
              label="SHADOW COLOR"
              value={box.shadowColor || defaults.shadowColor}
              onChange={(c) => setBox({ ...box, shadowColor: c })}
            />
          )}
        </div>

      </div>
    </fieldset>
  );
}
