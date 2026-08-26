import QRCode from 'qrcode';

// Precomputed CRC32 table for PNG chunk checksums
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function calculateCrc32(uint8Arr, offset, length) {
  let c = 0xffffffff;
  for (let i = 0; i < length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ uint8Arr[offset + i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Converts any Hex, RGBA, or transparent color to a valid 8-digit #RRGGBBAA hex for QRCode
 */
export function colorToQrHex(col, fallback = '#161942FF') {
  if (!col || col === 'transparent') return '#00000000';
  if (col.startsWith('#')) {
    if (col.length === 7) return `${col}FF`;
    if (col.length === 9) return col;
    if (col.length === 4) {
      const r = col[1], g = col[2], b = col[3];
      return `#${r}${r}${g}${g}${b}${b}FF`;
    }
  }
  if (col.startsWith('rgba') || col.startsWith('rgb')) {
    const match = col.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      const aFloat = match[4] !== undefined ? parseFloat(match[4]) : 1;
      const a = Math.round(aFloat * 255).toString(16).padStart(2, '0');
      return `#${r}${g}${b}${a}`;
    }
  }
  return fallback;
}

/**
 * Embeds physical DPI resolution metadata into PNG (pHYs chunk) and JPEG (JFIF APP0 marker)
 * @param {Uint8Array} uint8Arr Binary image data
 * @param {'png'|'jpg'|'jpeg'} format Target format
 * @param {number} dpi Target DPI
 * @returns {Blob} Blob with embedded DPI metadata
 */
export function injectDpiMetadata(uint8Arr, format, dpi) {
  const targetDpi = Math.max(72, Math.round(Number(dpi) || 300));
  const isPng = format.toLowerCase().includes('png');
  const isJpg = format.toLowerCase().includes('jpg') || format.toLowerCase().includes('jpeg');

  if (isPng) {
    // PNG DPI injection via pHYs chunk (pixels per meter)
    // 1 meter = 39.37007874 inches
    const ppm = Math.round(targetDpi * 39.37007874);

    // pHYs data: 4 bytes ppm_x, 4 bytes ppm_y, 1 byte unit (1 = meter)
    const physChunk = new Uint8Array(21);
    // Length: 9 bytes
    physChunk[0] = 0; physChunk[1] = 0; physChunk[2] = 0; physChunk[3] = 9;
    // Chunk Type: 'pHYs' (0x70, 0x48, 0x59, 0x73)
    physChunk[4] = 0x70; physChunk[5] = 0x48; physChunk[6] = 0x59; physChunk[7] = 0x73;
    // X PPM
    physChunk[8] = (ppm >>> 24) & 0xff;
    physChunk[9] = (ppm >>> 16) & 0xff;
    physChunk[10] = (ppm >>> 8) & 0xff;
    physChunk[11] = ppm & 0xff;
    // Y PPM
    physChunk[12] = (ppm >>> 24) & 0xff;
    physChunk[13] = (ppm >>> 16) & 0xff;
    physChunk[14] = (ppm >>> 8) & 0xff;
    physChunk[15] = ppm & 0xff;
    // Unit (1 = meter)
    physChunk[16] = 1;
    // CRC32 of type + data (13 bytes from index 4 to 16)
    const crc = calculateCrc32(physChunk, 4, 13);
    physChunk[17] = (crc >>> 24) & 0xff;
    physChunk[18] = (crc >>> 16) & 0xff;
    physChunk[19] = (crc >>> 8) & 0xff;
    physChunk[20] = crc & 0xff;

    // PNG begins with 8-byte header: 89 50 4E 47 0D 0A 1A 0A
    // First chunk is IHDR: 4 bytes len (13), 4 bytes type ('IHDR'), 13 bytes data, 4 bytes crc = 25 bytes.
    // Insert pHYs right after IHDR chunk (offset 8 + 25 = 33)
    if (uint8Arr.length > 33 && uint8Arr[12] === 0x49 && uint8Arr[13] === 0x48 && uint8Arr[14] === 0x44 && uint8Arr[15] === 0x52) {
      const combined = new Uint8Array(uint8Arr.length + physChunk.length);
      combined.set(uint8Arr.subarray(0, 33), 0);
      combined.set(physChunk, 33);
      combined.set(uint8Arr.subarray(33), 33 + physChunk.length);
      return new Blob([combined], { type: 'image/png' });
    }

    return new Blob([uint8Arr], { type: 'image/png' });
  }

  if (isJpg) {
    // JPEG DPI injection via JFIF APP0 (0xFF 0xE0)
    // Check if JFIF APP0 header already exists at byte 2
    if (uint8Arr.length > 18 && uint8Arr[0] === 0xff && uint8Arr[1] === 0xd8 && uint8Arr[2] === 0xff && uint8Arr[3] === 0xe0) {
      // Check for "JFIF" (0x4A 0x46 0x49 0x46 0x00)
      if (uint8Arr[6] === 0x4a && uint8Arr[7] === 0x46 && uint8Arr[8] === 0x49 && uint8Arr[9] === 0x46) {
        const copy = new Uint8Array(uint8Arr);
        copy[11] = 1; // 1 = Dots Per Inch (DPI)
        copy[12] = (targetDpi >>> 8) & 0xff;
        copy[13] = targetDpi & 0xff;
        copy[14] = (targetDpi >>> 8) & 0xff;
        copy[15] = targetDpi & 0xff;
        return new Blob([copy], { type: 'image/jpeg' });
      }
    }

    // Insert standard 18-byte JFIF APP0 marker right after SOI (byte 2)
    const jfifHeader = new Uint8Array([
      0xff, 0xe0, // APP0 marker
      0x00, 0x10, // Length = 16 bytes
      0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
      0x01, 0x01, // Version 1.1
      0x01, // Units: 1 = DPI
      (targetDpi >>> 8) & 0xff, targetDpi & 0xff, // Xdensity
      (targetDpi >>> 8) & 0xff, targetDpi & 0xff, // Ydensity
      0x00, 0x00 // Thumbnail width & height
    ]);

    if (uint8Arr.length > 2 && uint8Arr[0] === 0xff && uint8Arr[1] === 0xd8) {
      const combined = new Uint8Array(uint8Arr.length + jfifHeader.length);
      combined.set(uint8Arr.subarray(0, 2), 0);
      combined.set(jfifHeader, 2);
      combined.set(uint8Arr.subarray(2), 2 + jfifHeader.length);
      return new Blob([combined], { type: 'image/jpeg' });
    }

    return new Blob([uint8Arr], { type: 'image/jpeg' });
  }

  return new Blob([uint8Arr], { type: isPng ? 'image/png' : 'image/jpeg' });
}

/**
 * Calculates scaled pixel dimensions from base template dimensions and scale multiplier
 */
export function calculateScaledDimensions(baseWidth = 1200, baseHeight = 1600, scale = 1.0) {
  const safeScale = Math.max(0.25, Math.min(4.0, Number(scale) || 1.0));
  return {
    width: Math.round(baseWidth * safeScale),
    height: Math.round(baseHeight * safeScale),
    scale: safeScale
  };
}

/**
 * High-Resolution Canvas Flyer Renderer
 * Renders custom templates or fallback default brand templates with scale multipliers
 */
export async function renderAndExportFlyer({
  activeTemplate,
  bgSource,
  campaignTag = 'demo',
  activeRetreat = null,
  scale = 1.0,
  format = 'png',
  jpegQuality = 0.92
}) {
  const cleanTag = (campaignTag || 'demo').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const isJpg = format.toLowerCase().includes('jpg') || format.toLowerCase().includes('jpeg');
  const mimeType = isJpg ? 'image/jpeg' : 'image/png';
  const fileExt = isJpg ? 'jpg' : 'png';

  const baseW = activeTemplate?.width || 1200;
  const baseH = activeTemplate?.height || 1600;
  const { width: exportW, height: exportH, scale: safeScale } = calculateScaledDimensions(baseW, baseH, scale);
  const effectiveDpi = Math.round(72 * safeScale);

  const canvas = document.createElement('canvas');
  canvas.width = exportW;
  canvas.height = exportH;
  const ctx = canvas.getContext('2d');

  // Fill solid white background (mandatory for JPG and clean crisp baseline for PNG)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, exportW, exportH);

  // Helper to load an image source
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

  if (activeTemplate && bgSource) {
    // 1. Draw Background Image
    try {
      const bgImg = await loadImage(bgSource);
      ctx.drawImage(bgImg, 0, 0, exportW, exportH);
    } catch (e) {
      console.warn("Failed to draw background image:", e);
    }

    // 2. Render Custom QR Code Box
    const qrFg = activeTemplate.qrBox?.fgColor || '#161942';
    const qrBg = activeTemplate.qrBox?.bgColor || 'transparent';
    const shortUrl = `https://skyuiuc.org/${cleanTag}`;

    const baseQrSize = parseFloat(activeTemplate.qrBox?.size) || (baseW * 0.125);
    const scaledQrSize = Math.round(baseQrSize * safeScale);
    const baseQrX = parseFloat(activeTemplate.qrBox?.x) || (baseW / 2);
    const baseQrY = parseFloat(activeTemplate.qrBox?.y) || (baseH / 2);
    const scaledQrX = Math.round(baseQrX * safeScale - (scaledQrSize / 2));
    const scaledQrY = Math.round(baseQrY * safeScale - (scaledQrSize / 2));

    const qrHasShadow = Boolean(activeTemplate.qrBox?.hasShadow);
    const qrShadowColor = activeTemplate.qrBox?.shadowColor || 'rgba(0, 0, 0, 0.25)';

    // Draw QR Background / Shadow
    if (qrBg !== 'transparent') {
      if (qrHasShadow) {
        ctx.shadowColor = qrShadowColor;
        ctx.shadowBlur = Math.round(12 * safeScale);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.round(6 * safeScale);
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = qrBg;
      ctx.fillRect(scaledQrX, scaledQrY, scaledQrSize, scaledQrSize);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    } else if (qrHasShadow) {
      ctx.shadowColor = qrShadowColor;
      ctx.shadowBlur = Math.round(12 * safeScale);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(6 * safeScale);
    }

    // Generate crisp high-res QR code
    try {
      const highResQrDataUrl = await QRCode.toDataURL(shortUrl, {
        width: scaledQrSize,
        margin: 0,
        color: {
          dark: colorToQrHex(qrFg, '#161942FF'),
          light: colorToQrHex(qrBg, '#00000000')
        }
      });
      const qrImg = await loadImage(highResQrDataUrl);
      ctx.drawImage(qrImg, scaledQrX, scaledQrY, scaledQrSize, scaledQrSize);
    } catch (qrErr) {
      console.warn("QR code render error:", qrErr);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 3. Render Custom Shortlink Text
    const baseTextX = parseFloat(activeTemplate.shortlinkText?.x) || (baseW / 2);
    const baseTextY = parseFloat(activeTemplate.shortlinkText?.y) || (baseH * 0.55);
    const baseFontSize = parseFloat(activeTemplate.shortlinkText?.fontSize) || Math.round(baseH * 0.035);
    const scaledTextX = Math.round(baseTextX * safeScale);
    const scaledTextY = Math.round(baseTextY * safeScale);
    const scaledFontSize = Math.round(baseFontSize * safeScale);
    const fontFamily = activeTemplate.shortlinkText?.fontFamily || "'Source Sans 3', sans-serif";
    const textHasShadow = Boolean(activeTemplate.shortlinkText?.hasShadow);
    const textShadowColor = activeTemplate.shortlinkText?.shadowColor || 'rgba(0, 0, 0, 0.3)';

    if (textHasShadow) {
      ctx.shadowColor = textShadowColor;
      ctx.shadowBlur = Math.round(8 * safeScale);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.round(4 * safeScale);
    }

    ctx.fillStyle = activeTemplate.shortlinkText?.color || '#1F74F1';
    ctx.font = `bold ${scaledFontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`skyuiuc.org/${cleanTag}`, scaledTextX, scaledTextY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

  } else {
    // Standard SKY Brand Fallback Template
    const blueHeaderH = Math.round(120 * safeScale);
    ctx.fillStyle = '#1F74F1';
    ctx.fillRect(0, 0, exportW, blueHeaderH);

    // Draw SKY Header Text / Logo
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(42 * safeScale)}px "Source Sans 3", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SKY at UIUC', exportW / 2, blueHeaderH / 2);

    // Retreat Title
    const retreatTitle = activeRetreat?.title || 'SKY Happiness Retreat';
    ctx.fillStyle = '#161942';
    ctx.font = `bold ${Math.round(52 * safeScale)}px Merriweather, Georgia, serif`;
    ctx.fillText(retreatTitle, exportW / 2, Math.round(280 * safeScale));

    // Dates
    const datesStr = activeRetreat?.startDate && activeRetreat?.endDate
      ? `${activeRetreat.startDate} to ${activeRetreat.endDate}`
      : 'Campus Retreat';
    ctx.fillStyle = '#B45309';
    ctx.font = `bold ${Math.round(28 * safeScale)}px "Source Sans 3", sans-serif`;
    ctx.fillText(datesStr, exportW / 2, Math.round(360 * safeScale));

    // Subtitle
    ctx.fillStyle = '#4A5568';
    ctx.font = `${Math.round(26 * safeScale)}px "Source Sans 3", sans-serif`;
    ctx.fillText('Evidence-Based Breathwork, Sudarshan Kriya & Leadership Development', exportW / 2, Math.round(430 * safeScale));

    // Standalone High-Res QR
    const qrSize = Math.round(420 * safeScale);
    const qrX = Math.round((exportW - qrSize) / 2);
    const qrY = Math.round(540 * safeScale);

    // QR Box container with light border
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(qrX - (20 * safeScale), qrY - (20 * safeScale), qrSize + (40 * safeScale), qrSize + (40 * safeScale));

    const shortUrl = `https://skyuiuc.org/${cleanTag}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(shortUrl, {
        width: qrSize,
        margin: 0,
        color: { dark: '#161942FF', light: '#00000000' }
      });
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.warn("Fallback QR render error:", e);
    }

    // Shortlink text
    ctx.fillStyle = '#1F74F1';
    ctx.font = `bold ${Math.round(38 * safeScale)}px "Source Sans 3", sans-serif`;
    ctx.fillText(`skyuiuc.org/${cleanTag}`, exportW / 2, Math.round(1080 * safeScale));

    ctx.fillStyle = '#718096';
    ctx.font = `${Math.round(22 * safeScale)}px "Source Sans 3", sans-serif`;
    ctx.fillText('Scan QR Code or type link to apply', exportW / 2, Math.round(1140 * safeScale));
  }

  // Convert canvas to Blob with quality and inject physical DPI metadata
  const quality = isJpg ? Math.max(0.1, Math.min(1.0, Number(jpegQuality) || 0.92)) : undefined;
  const dataUrl = canvas.toDataURL(mimeType, quality);

  // Convert dataURL to Uint8Array
  const byteCharacters = atob(dataUrl.split(',')[1]);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  // Inject DPI Metadata into binary file
  const finalBlob = injectDpiMetadata(byteNumbers, format, effectiveDpi);

  // Trigger download
  const downloadUrl = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `skyatuiuc_flyer_${cleanTag}_${exportW}x${exportH}.${fileExt}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Cleanup object URL
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

  return { width: exportW, height: exportH, scale: safeScale, dpi: effectiveDpi, format: fileExt };
}
