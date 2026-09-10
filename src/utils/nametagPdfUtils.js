import { jsPDF } from 'jspdf';

// ============================================================================
// CONSTANTS & CONVERSIONS
// ============================================================================

export const UNIT_CONVERSIONS = {
  toInches: {
    in: 1,
    cm: 1 / 2.54,
    mm: 1 / 25.4,
    pt: 1 / 72
  },
  fromInches: {
    in: 1,
    cm: 2.54,
    mm: 25.4,
    pt: 72
  }
};

/**
 * Convert a value from one unit to another
 * @param {number} val 
 * @param {'in'|'cm'|'mm'|'pt'} fromUnit 
 * @param {'in'|'cm'|'mm'|'pt'} toUnit 
 * @returns {number}
 */
export function convertLength(val, fromUnit = 'in', toUnit = 'in') {
  if (fromUnit === toUnit) return val;
  const inVal = val * (UNIT_CONVERSIONS.toInches[fromUnit] || 1);
  return inVal * (UNIT_CONVERSIONS.fromInches[toUnit] || 1);
}

export const PAPER_SIZE_PRESETS = [
  { id: 'us_letter', label: 'US Letter (8.5 × 11 in)', width: 8.5, height: 11.0, unit: 'in' },
  { id: 'a4', label: 'A4 (8.27 × 11.69 in / 210 × 297 mm)', width: 8.27, height: 11.69, unit: 'in' },
  { id: 'legal', label: 'Legal (8.5 × 14 in)', width: 8.5, height: 14.0, unit: 'in' },
  { id: 'tabloid', label: 'Tabloid (11 × 17 in)', width: 11.0, height: 17.0, unit: 'in' },
  { id: 'custom', label: 'Custom Dimensions', width: 8.5, height: 11.0, unit: 'in' }
];

export const PRINT_CONFIGURATIONS = [
  {
    id: 'double_double',
    title: 'Double-Sided Printout, Double-Sided Nametag',
    badge: 'Recommended Duplex',
    description: 'Printed duplex. Mirrored alignment ensures the nametag matches on front & back.',
    isDuplex: true
  },
  {
    id: 'single_double',
    title: 'Single-Sided Printout, Double-Sided Nametag (Fold-in-Half)',
    badge: 'Foldable Twin',
    description: 'Prints two identical nametags side-by-side with a centerline to fold in half after cutting.',
    isDuplex: false
  },
  {
    id: 'single_single',
    title: 'Single-Sided Printout, Single-Sided Nametag',
    badge: 'Standard Single',
    description: 'Standard single-sided sheet. Each nametag appears exactly once.',
    isDuplex: false
  },
  {
    id: 'double_single',
    title: 'Double-Sided Printout, Single-Sided Nametag (Blank Backs)',
    badge: 'Duplex Blank Back',
    description: 'Duplex printing where every even page is left completely blank for single-sided badges.',
    isDuplex: true
  }
];

// ============================================================================
// RETREAT NAME DISAMBIGUATION ENGINE (SECTION 3)
// ============================================================================

/**
 * Resolves a participant's display name using retreat-level disambiguation rules.
 * Rule 1: Unique first name in retreat -> "FirstName"
 * Rule 2: Duplicate first name, distinct last initials -> "FirstName LastInitial."
 * Rule 3: Duplicate first name AND colliding last initials -> "FirstName LastName"
 * 
 * @param {object} participant Participant object with firstName, lastName, or name
 * @param {Array<object>} retreatRoster Array of all participants in the retreat
 * @returns {string}
 */
export function resolveParticipantDisplayName(participant, retreatRoster = []) {
  if (!participant) return 'Participant';

  let cleanFirst = (participant.firstName || '').trim();
  let cleanLast = (participant.lastName || '').trim();

  // If firstName is empty, try splitting fullName or name
  if (!cleanFirst && (participant.fullName || participant.name)) {
    const parts = (participant.fullName || participant.name).trim().split(/\s+/);
    cleanFirst = parts[0] || '';
    if (parts.length > 1) {
      cleanLast = parts.slice(1).join(' ');
    }
  }

  if (!cleanFirst) return cleanLast || participant.name || 'Participant';
  if (!cleanLast) return cleanFirst;

  const targetFirstLower = cleanFirst.toLowerCase();

  // Find all peers in the retreat roster with the same first name (case-insensitive)
  const peers = retreatRoster.filter(p => {
    let pFirst = (p.firstName || '').trim();
    if (!pFirst && (p.fullName || p.name)) {
      pFirst = (p.fullName || p.name).trim().split(/\s+/)[0] || '';
    }
    return pFirst.toLowerCase() === targetFirstLower;
  });

  // Rule 1: Unique first name within the retreat
  if (peers.length <= 1) {
    return cleanFirst;
  }

  // Count occurrences of last initials among peers with the same first name
  const initialCounts = {};
  peers.forEach(p => {
    let pLast = (p.lastName || '').trim();
    if (!pLast && (p.fullName || p.name)) {
      const parts = (p.fullName || p.name).trim().split(/\s+/);
      if (parts.length > 1) pLast = parts.slice(1).join(' ');
    }
    const init = pLast ? pLast.charAt(0).toUpperCase() : '?';
    initialCounts[init] = (initialCounts[init] || 0) + 1;
  });

  const myInitial = cleanLast.charAt(0).toUpperCase();

  // Rule 2: Unique last initial among peers with the same first name
  if (initialCounts[myInitial] === 1) {
    return `${cleanFirst} ${myInitial}.`;
  }

  // Rule 3: Colliding last initial -> use full first and last name
  return `${cleanFirst} ${cleanLast}`;
}

/**
 * Resolves a participant's assigned team / group name
 * @param {object} participant 
 * @param {object} groupNames Map of { [groupId]: customName }
 * @returns {string}
 */
export function resolveParticipantTeamName(participant, groupNames = {}) {
  if (!participant) return '';
  const gId = participant.groupId;
  if (!gId || gId === 'unassigned') return '';

  if (groupNames && groupNames[gId]) {
    return groupNames[gId];
  }
  const match = gId.match(/^group-(\d+)$/);
  if (match) {
    return `Group ${match[1]}`;
  }
  return participant.assignedGroup || gId;
}

// ============================================================================
// DYNAMIC TEXT WRAPPING & AUTO-DOWNSCALING ENGINE (SECTION 4)
// ============================================================================

/**
 * Computes optimal wrapped lines and font size for text inside a bounding box
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {number} boxWidth Available width in px
 * @param {number} boxHeight Available height in px
 * @param {number} maxFontSize Configured maximum font size in px
 * @param {string} fontFamily Font family string
 * @param {boolean} bold Whether text is bold
 * @param {number} minFontSize Minimum font size threshold (default 8)
 * @returns {{ lines: string[], fontSize: number, totalHeight: number, lineHeight: number }}
 */
export function calculateFittedText(
  ctx, 
  text, 
  boxWidth, 
  boxHeight, 
  maxFontSize = 48, 
  fontFamily = "'Source Sans 3', sans-serif", 
  bold = true, 
  minFontSize = 8
) {
  if (!text || !text.trim()) {
    return { lines: [], fontSize: maxFontSize, totalHeight: 0, lineHeight: maxFontSize * 1.18 };
  }

  const cleanText = text.trim();
  const words = cleanText.split(/\s+/);
  let bestFit = null;

  // Search descending for the largest font size that comfortably fits
  for (let size = maxFontSize; size >= minFontSize; size -= 1) {
    const lineHeight = size * 1.18;
    const maxAllowedLines = Math.max(1, Math.floor(boxHeight / lineHeight));
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${fontFamily}`;

    // Check if any single word overflows boxWidth
    let singleWordOverflow = false;
    for (const w of words) {
      if (ctx.measureText(w).width > boxWidth) {
        singleWordOverflow = true;
        break;
      }
    }
    if (singleWordOverflow) continue;

    // Greedy word wrapping
    const lines = [];
    let currentLine = words[0];
    let fits = true;

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      if (ctx.measureText(testLine).width <= boxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
        if (lines.length >= maxAllowedLines) {
          fits = false;
          break;
        }
      }
    }
    lines.push(currentLine);

    if (fits && lines.length <= maxAllowedLines) {
      const totalHeight = lines.length * lineHeight;
      if (totalHeight <= boxHeight) {
        bestFit = { lines, fontSize: size, totalHeight, lineHeight };
        break;
      }
    }
  }

  // Fallback: If no fit found, force minimum font size
  if (!bestFit) {
    const size = minFontSize;
    const lineHeight = size * 1.18;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${fontFamily}`;
    bestFit = {
      lines: [cleanText],
      fontSize: size,
      totalHeight: lineHeight,
      lineHeight
    };
  }

  return bestFit;
}

/**
 * Draws fitted text onto a canvas context inside a bounding box
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} text 
 * @param {object} box Bounding box configuration
 * @param {string} defaultFontFamily 
 */
export function drawFittedTextOnCanvas(ctx, text, box, defaultFontFamily = "'Source Sans 3', sans-serif") {
  if (!text || !box) return;
  const { 
    color = '#161942', 
    bold = true, 
    hasShadow = false, 
    shadowColor = 'rgba(0,0,0,0.3)', 
    fontFamily = defaultFontFamily, 
    textAlign = 'center' 
  } = box;

  const centerX = Number(box.centerX) || 0;
  const centerY = Number(box.centerY) || 0;
  const width = Math.max(10, Number(box.width) || 100);
  const height = Math.max(10, Number(box.height) || 50);
  const maxFontSize = Math.max(8, Number(box.maxFontSize) || 48);

  const activeFont = fontFamily || defaultFontFamily;
  const fit = calculateFittedText(ctx, text, width, height, maxFontSize, activeFont, bold !== false);
  if (!fit.lines.length) return;

  ctx.save();
  ctx.font = `${bold !== false ? 'bold ' : ''}${fit.fontSize}px ${activeFont}`;
  ctx.fillStyle = color || '#161942';
  ctx.textAlign = textAlign || 'center';
  ctx.textBaseline = 'middle';

  if (hasShadow) {
    ctx.shadowColor = shadowColor || 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = Math.round(fit.fontSize * 0.15);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(fit.fontSize * 0.08);
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Calculate vertical center of text block
  const startY = centerY - (fit.totalHeight / 2) + (fit.lineHeight / 2);

  fit.lines.forEach((line, idx) => {
    const lineY = startY + (idx * fit.lineHeight);
    let lineX = centerX;
    if (textAlign === 'left') lineX = centerX - (width / 2);
    if (textAlign === 'right') lineX = centerX + (width / 2);
    ctx.fillText(line, lineX, lineY);
  });

  ctx.restore();
}

// ============================================================================
// SHEET PACKING & DUPLEX MATHEMATICS (SECTION 5 & SECTION 5.6)
// ============================================================================

/**
 * Evaluates the 2-block guillotine packing optimization across all orientations
 * @param {number} U_W Usable width
 * @param {number} U_H Usable height
 * @param {number} W Base cell width
 * @param {number} H Base cell height
 * @param {number} margin Border margin
 * @param {boolean} autoOptimize Whether to consider mixed-orientation layouts
 * @returns {{ slots: Array<{ x: number, y: number, width: number, height: number, isRotated: boolean }>, layoutType: string, isOptimized: boolean, capacityGain: number, cols: number, rows: number }}
 */
export function solveGuillotinePacking(U_W, U_H, W, H, margin, autoOptimize = true) {
  // 1. Layout A: Uniform Unrotated (w x h)
  const colsA = Math.floor(U_W / W);
  const rowsA = Math.floor(U_H / H);
  const countA = colsA * rowsA;

  let bestLayout = {
    layoutType: 'uniform',
    isOptimized: false,
    capacityGain: 0,
    cols: colsA,
    rows: rowsA,
    slackX: colsA > 0 ? U_W - (colsA * W) : U_W,
    slackY: rowsA > 0 ? U_H - (rowsA * H) : U_H,
    slots: []
  };

  if (colsA > 0 && rowsA > 0) {
    const slackX = U_W - (colsA * W);
    const slackY = U_H - (rowsA * H);
    const originX = margin + (slackX / 2);
    const originY = margin + (slackY / 2);
    const slots = [];
    for (let r = 0; r < rowsA; r++) {
      for (let c = 0; c < colsA; c++) {
        slots.push({
          x: originX + (c * W),
          y: originY + (r * H),
          width: W,
          height: H,
          isRotated: false
        });
      }
    }
    bestLayout.slots = slots;
  }

  if (!autoOptimize) {
    return bestLayout;
  }

  let bestCount = countA;

  // 2. Layout B: Uniform Rotated 90° (h x w)
  if (U_W >= H && U_H >= W) {
    const colsB = Math.floor(U_W / H);
    const rowsB = Math.floor(U_H / W);
    const countB = colsB * rowsB;
    if (countB > bestCount) {
      const slackX = U_W - (colsB * H);
      const slackY = U_H - (rowsB * W);
      const originX = margin + (slackX / 2);
      const originY = margin + (slackY / 2);
      const slots = [];
      for (let r = 0; r < rowsB; r++) {
        for (let c = 0; c < colsB; c++) {
          slots.push({
            x: originX + (c * H),
            y: originY + (r * W),
            width: H,
            height: W,
            isRotated: true
          });
        }
      }
      bestCount = countB;
      bestLayout = {
        layoutType: 'uniform_rotated',
        isOptimized: true,
        capacityGain: countB - countA,
        cols: colsB,
        rows: rowsB,
        slackX,
        slackY,
        slots
      };
    }
  }

  // 3. Layout C: Vertical Split (Left Block Unrotated + Right Strip Rotated)
  for (let k = 1; k <= colsA; k++) {
    const leftCols = k;
    const leftRows = rowsA;
    const leftCount = leftCols * leftRows;
    const rightWidth = U_W - (k * W);

    if (rightWidth >= H && U_H >= W) {
      const rightCols = Math.floor(rightWidth / H);
      const rightRows = Math.floor(U_H / W);
      const rightCount = rightCols * rightRows;
      const totalCount = leftCount + rightCount;

      if (totalCount > bestCount) {
        const totalUsedW = (k * W) + (rightCols * H);
        const slackX = U_W - totalUsedW;
        const originX = margin + (slackX / 2);

        const leftSlackY = U_H - (leftRows * H);
        const leftOriginY = margin + (leftSlackY / 2);

        const rightSlackY = U_H - (rightRows * W);
        const rightOriginY = margin + (rightSlackY / 2);

        const slots = [];
        // Left unrotated block
        for (let r = 0; r < leftRows; r++) {
          for (let c = 0; c < leftCols; c++) {
            slots.push({
              x: originX + (c * W),
              y: leftOriginY + (r * H),
              width: W,
              height: H,
              isRotated: false
            });
          }
        }
        // Right rotated strip
        const rightStartX = originX + (k * W);
        for (let r = 0; r < rightRows; r++) {
          for (let c = 0; c < rightCols; c++) {
            slots.push({
              x: rightStartX + (c * H),
              y: rightOriginY + (r * W),
              width: H,
              height: W,
              isRotated: true
            });
          }
        }

        bestCount = totalCount;
        bestLayout = {
          layoutType: 'vertical_split',
          isOptimized: true,
          capacityGain: totalCount - countA,
          cols: leftCols + rightCols,
          rows: Math.max(leftRows, rightRows),
          slackX,
          slackY: Math.min(leftSlackY, rightSlackY),
          slots
        };
      }
    }
  }

  // 4. Layout D: Horizontal Split (Top Block Unrotated + Bottom Strip Rotated)
  for (let m = 1; m <= rowsA; m++) {
    const topRows = m;
    const topCols = colsA;
    const topCount = topCols * topRows;
    const bottomHeight = U_H - (m * H);

    if (bottomHeight >= W && U_W >= H) {
      const bottomRows = Math.floor(bottomHeight / W);
      const bottomCols = Math.floor(U_W / H);
      const bottomCount = bottomCols * bottomRows;
      const totalCount = topCount + bottomCount;

      if (totalCount > bestCount) {
        const totalUsedH = (m * H) + (bottomRows * W);
        const slackY = U_H - totalUsedH;
        const originY = margin + (slackY / 2);

        const topSlackX = U_W - (topCols * W);
        const topOriginX = margin + (topSlackX / 2);

        const bottomSlackX = U_W - (bottomCols * H);
        const bottomOriginX = margin + (bottomSlackX / 2);

        const slots = [];
        // Top unrotated block
        for (let r = 0; r < topRows; r++) {
          for (let c = 0; c < topCols; c++) {
            slots.push({
              x: topOriginX + (c * W),
              y: originY + (r * H),
              width: W,
              height: H,
              isRotated: false
            });
          }
        }
        // Bottom rotated strip
        const bottomStartY = originY + (m * H);
        for (let r = 0; r < bottomRows; r++) {
          for (let c = 0; c < bottomCols; c++) {
            slots.push({
              x: bottomOriginX + (c * H),
              y: bottomStartY + (r * W),
              width: H,
              height: W,
              isRotated: true
            });
          }
        }

        bestCount = totalCount;
        bestLayout = {
          layoutType: 'horizontal_split',
          isOptimized: true,
          capacityGain: totalCount - countA,
          cols: Math.max(topCols, bottomCols),
          rows: topRows + bottomRows,
          slackX: Math.min(topSlackX, bottomSlackX),
          slackY,
          slots
        };
      }
    }
  }

  return bestLayout;
}

/**
 * Computes tight sheet packing metrics given paper, margin, template dimensions, and optimizer flag
 * @param {object} params 
 * @returns {object}
 */
export function calculatePackingMetrics({
  template,
  pageWidth = 8.5,
  pageHeight = 11.0,
  margin = 0.5,
  unit = 'in',
  configType = 'double_double',
  candidateCount = 0,
  extraBlanksCount = 10,
  autoOptimizePacking = true
}) {
  const numMargin = Math.max(0, parseFloat(margin) || 0);
  const numPageW = Math.max(0.1, parseFloat(pageWidth) || 8.5);
  const numPageH = Math.max(0.1, parseFloat(pageHeight) || 11.0);
  const numBlanks = Math.max(0, parseInt(extraBlanksCount, 10) || 0);

  if (!template || !template.physicalDimensions) {
    return {
      cols: 0,
      rows: 0,
      cardsPerSheet: 0,
      totalNametags: candidateCount + numBlanks,
      sheetsNeeded: 0,
      totalPages: 0,
      physicalSheets: 0,
      cardWidth: 0,
      cardHeight: 0,
      cellW: 0,
      cellH: 0,
      slackX: 0,
      slackY: 0,
      slots: [],
      isOptimized: false,
      capacityGain: 0,
      layoutType: 'uniform'
    };
  }

  const templateUnit = template.physicalDimensions.unit || 'in';
  const cardWidth = convertLength(template.physicalDimensions.width, templateUnit, unit);
  const cardHeight = convertLength(template.physicalDimensions.height, templateUnit, unit);

  // Usable printable area
  const usableW = Math.max(0, numPageW - (2 * numMargin));
  const usableH = Math.max(0, numPageH - (2 * numMargin));

  // In Configuration 2 (fold-in-half), each atomic cell is 2 * cardWidth wide
  const isSideBySide = configType === 'single_double';
  const cellW = isSideBySide ? (2 * cardWidth) : cardWidth;
  const cellH = cardHeight;

  if (cellW <= 0 || cellH <= 0 || usableW <= 0 || usableH <= 0) {
    return {
      cols: 0,
      rows: 0,
      cardsPerSheet: 0,
      totalNametags: candidateCount + numBlanks,
      sheetsNeeded: 0,
      totalPages: 0,
      physicalSheets: 0,
      cardWidth,
      cardHeight,
      cellW,
      cellH,
      slackX: 0,
      slackY: 0,
      slots: [],
      isOptimized: false,
      capacityGain: 0,
      layoutType: 'uniform'
    };
  }

  // Run the 2-block guillotine packing solver
  const packingSolution = solveGuillotinePacking(usableW, usableH, cellW, cellH, numMargin, autoOptimizePacking);
  const cardsPerSheet = packingSolution.slots.length;
  const totalNametags = Math.max(0, candidateCount + numBlanks);
  const sheetsNeeded = cardsPerSheet > 0 ? Math.ceil(totalNametags / cardsPerSheet) : 0;

  // Total PDF pages vs physical paper sheets
  let totalPages = sheetsNeeded;
  let physicalSheets = sheetsNeeded;

  if (configType === 'double_single' || configType === 'double_double') {
    totalPages = sheetsNeeded * 2;
    physicalSheets = sheetsNeeded;
  }

  return {
    cols: packingSolution.cols,
    rows: packingSolution.rows,
    cardsPerSheet,
    totalNametags,
    sheetsNeeded,
    totalPages,
    physicalSheets,
    cardWidth,
    cardHeight,
    cellW,
    cellH,
    slackX: packingSolution.slackX || 0,
    slackY: packingSolution.slackY || 0,
    slots: packingSolution.slots,
    isOptimized: packingSolution.isOptimized,
    capacityGain: packingSolution.capacityGain,
    layoutType: packingSolution.layoutType
  };
}

// ============================================================================
// PDF GENERATION ENGINE
// ============================================================================

/**
 * Loads a base64 or URL into an HTMLImageElement
 * @param {string} src 
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load template background image: ' + err));
    img.src = src;
  });
}

/**
 * Rotates a canvas element by an exact angle and exports a JPEG data URL
 * @param {HTMLCanvasElement} sourceCanvas 
 * @param {number} angleDeg 90 | -90 | 0
 * @returns {string}
 */
function createRotatedCanvasDataUrl(sourceCanvas, angleDeg) {
  if (!angleDeg) {
    return sourceCanvas.toDataURL('image/jpeg', 0.92);
  }

  const rotCanvas = document.createElement('canvas');
  if (Math.abs(angleDeg) === 90 || Math.abs(angleDeg) === 270) {
    rotCanvas.width = sourceCanvas.height;
    rotCanvas.height = sourceCanvas.width;
  } else {
    rotCanvas.width = sourceCanvas.width;
    rotCanvas.height = sourceCanvas.height;
  }

  const ctx = rotCanvas.getContext('2d');
  if (angleDeg === 90) {
    ctx.translate(rotCanvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (angleDeg === -90 || angleDeg === 270) {
    ctx.translate(0, rotCanvas.height);
    ctx.rotate(-Math.PI / 2);
  }

  ctx.drawImage(sourceCanvas, 0, 0);
  return rotCanvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Renders a single nametag image to an unrotated and rotated data URLs
 * @param {HTMLCanvasElement} canvas Reusable offscreen canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {HTMLImageElement} bgImage 
 * @param {object} template 
 * @param {string} firstName 
 * @param {string} teamName 
 * @returns {{ dataUrl: string, dataUrlRotated90: string, dataUrlRotatedMinus90: string }}
 */
function renderNametagCardPack(canvas, ctx, bgImage, template, firstName, teamName) {
  const w = template.width;
  const h = template.height;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bgImage, 0, 0, w, h);

  if (firstName && template.firstNameBox) {
    drawFittedTextOnCanvas(ctx, firstName, template.firstNameBox);
  }
  if (teamName && template.teamNameBox) {
    drawFittedTextOnCanvas(ctx, teamName, template.teamNameBox);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const dataUrlRotated90 = createRotatedCanvasDataUrl(canvas, 90);
  const dataUrlRotatedMinus90 = createRotatedCanvasDataUrl(canvas, -90);

  return { dataUrl, dataUrlRotated90, dataUrlRotatedMinus90 };
}

/**
 * Generates the full printable Nametags PDF document supporting all 4 configurations and 90° mixed packing
 * 
 * @param {object} options
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function generateNametagsPdf({
  template,
  templateImageBase64,
  candidates = [],
  retreatRoster = [],
  groupNames = {},
  extraBlanksCount = 10,
  unit = 'in',
  pageWidth = 8.5,
  pageHeight = 11.0,
  margin = 0.5,
  configType = 'double_double',
  autoOptimizePacking = true,
  retreatTitle = 'Retreat',
  onProgress = () => {}
}) {
  if (!template) throw new Error("Nametag template is required.");
  if (!templateImageBase64) throw new Error("Nametag template background image is missing.");

  const numPageW = Math.max(0.1, parseFloat(pageWidth) || 8.5);
  const numPageH = Math.max(0.1, parseFloat(pageHeight) || 11.0);
  const numMargin = Math.max(0, parseFloat(margin) || 0);
  const numBlanks = Math.max(0, parseInt(extraBlanksCount, 10) || 0);

  // 1. Calculate packing layout and slots
  const metrics = calculatePackingMetrics({
    template,
    pageWidth: numPageW,
    pageHeight: numPageH,
    margin: numMargin,
    unit,
    configType,
    candidateCount: candidates.length,
    extraBlanksCount: numBlanks,
    autoOptimizePacking
  });

  if (metrics.cardsPerSheet <= 0) {
    throw new Error("Page dimensions or margins too tight to fit even one nametag per sheet.");
  }

  // 2. Prepare items queue: Candidates followed by Extra Blanks
  const items = [];

  candidates.forEach(participant => {
    const dispName = resolveParticipantDisplayName(participant, retreatRoster);
    const teamName = resolveParticipantTeamName(participant, groupNames);
    items.push({
      type: 'participant',
      firstName: dispName,
      teamName: teamName,
      participant
    });
  });

  for (let i = 0; i < numBlanks; i++) {
    items.push({
      type: 'blank',
      firstName: '',
      teamName: '',
      participant: null
    });
  }

  const totalItems = items.length;
  if (totalItems === 0) {
    throw new Error("No nametags to generate (0 candidates and 0 blanks).");
  }

  // 3. Load background image into memory
  onProgress({ step: 1, current: 0, total: totalItems, text: "Loading high-resolution template background..." });
  const bgImg = await loadImageElement(templateImageBase64);

  // 4. Set up a single reusable offscreen canvas for rendering nametags
  const canvas = document.createElement('canvas');
  canvas.width = template.width;
  canvas.height = template.height;
  const ctx = canvas.getContext('2d');

  // Pre-render the blank nametag card once so blanks don't re-render
  let blankCardPack = null;
  if (numBlanks > 0) {
    blankCardPack = renderNametagCardPack(canvas, ctx, bgImg, template, '', '');
  }

  // Render all participant nametag cards into data URLs
  onProgress({ step: 1, current: 0, total: totalItems, text: `Rendering nametag graphics (0 / ${totalItems})...` });
  const renderedCards = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let cardPack;
    if (item.type === 'blank') {
      cardPack = blankCardPack;
    } else {
      cardPack = renderNametagCardPack(canvas, ctx, bgImg, template, item.firstName, item.teamName);
    }
    renderedCards.push({
      ...item,
      ...cardPack
    });

    if (i % 5 === 0 || i === items.length - 1) {
      onProgress({
        step: 1,
        current: i + 1,
        total: totalItems,
        text: `Rendering nametag graphics (${i + 1} / ${totalItems})...`
      });
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // 5. Initialize jsPDF Document
  onProgress({ step: 2, current: 0, total: metrics.totalPages, text: "Compiling PDF document layout..." });

  const pdf = new jsPDF({
    orientation: numPageW > numPageH ? 'landscape' : 'portrait',
    unit: unit,
    format: [numPageW, numPageH]
  });

  const { cardsPerSheet, cardWidth, cardHeight, slots } = metrics;
  const T_W = cardWidth;
  const T_H = cardHeight;

  // Helper to draw crop marks / hairline outline
  const drawHairlineGuides = (x, y, w, h) => {
    pdf.saveGraphicsState();
    pdf.setDrawColor(209, 213, 219); // #D1D5DB light gray
    pdf.setLineWidth(0.007); // ~0.5 pt in inches
    pdf.setLineDashPattern([], 0);
    pdf.rect(x, y, w, h, 'S');
    pdf.restoreGraphicsState();
  };

  const drawFoldLine = (x1, y1, x2, y2) => {
    pdf.saveGraphicsState();
    pdf.setDrawColor(180, 185, 195);
    pdf.setLineWidth(0.007);
    pdf.setLineDashPattern([0.05, 0.05], 0);
    pdf.line(x1, y1, x2, y2);
    pdf.restoreGraphicsState();
  };

  // Slice items into sheets of size cardsPerSheet
  const sheetChunks = [];
  for (let offset = 0; offset < renderedCards.length; offset += cardsPerSheet) {
    sheetChunks.push(renderedCards.slice(offset, offset + cardsPerSheet));
  }

  // 6. Build PDF according to the chosen configuration and slot layout
  let pageIndex = 0;

  for (let s = 0; s < sheetChunks.length; s++) {
    const chunk = sheetChunks[s];

    // ========================================================================
    // CONFIGURATION 1: Single-sided printout, single-sided nametag
    // ========================================================================
    if (configType === 'single_single') {
      if (pageIndex > 0) pdf.addPage();
      pageIndex++;

      for (let j = 0; j < chunk.length; j++) {
        const slot = slots[j];
        if (!slot) continue;

        if (!slot.isRotated) {
          pdf.addImage(chunk[j].dataUrl, 'JPEG', slot.x, slot.y, T_W, T_H);
          drawHairlineGuides(slot.x, slot.y, T_W, T_H);
        } else {
          pdf.addImage(chunk[j].dataUrlRotated90, 'JPEG', slot.x, slot.y, T_H, T_W);
          drawHairlineGuides(slot.x, slot.y, T_H, T_W);
        }
      }

      onProgress({
        step: 2,
        current: pageIndex,
        total: metrics.totalPages,
        text: `Writing sheet ${s + 1} of ${sheetChunks.length}...`
      });
      await new Promise(r => setTimeout(r, 0));
    }

    // ========================================================================
    // CONFIGURATION 2: Single-sided printout, double-sided nametag (Fold-in-Half)
    // ========================================================================
    else if (configType === 'single_double') {
      if (pageIndex > 0) pdf.addPage();
      pageIndex++;

      for (let j = 0; j < chunk.length; j++) {
        const slot = slots[j];
        if (!slot) continue;

        if (!slot.isRotated) {
          // Unrotated (2W x H) Macro-Cell
          const xLeft = slot.x;
          const yLeft = slot.y;
          const xRight = xLeft + T_W;
          const yRight = yLeft;

          // Left twin
          pdf.addImage(chunk[j].dataUrl, 'JPEG', xLeft, yLeft, T_W, T_H);
          // Right twin
          pdf.addImage(chunk[j].dataUrl, 'JPEG', xRight, yRight, T_W, T_H);

          // Vertical fold line between twins
          drawFoldLine(xRight, yLeft, xRight, yLeft + T_H);
          drawHairlineGuides(xLeft, yLeft, 2 * T_W, T_H);
        } else {
          // Rotated 90° (H x 2W) Macro-Cell
          const xTop = slot.x;
          const yTop = slot.y;
          const xBottom = xTop;
          const yBottom = yTop + T_W;

          // Top twin
          pdf.addImage(chunk[j].dataUrlRotated90, 'JPEG', xTop, yTop, T_H, T_W);
          // Bottom twin
          pdf.addImage(chunk[j].dataUrlRotated90, 'JPEG', xBottom, yBottom, T_H, T_W);

          // Horizontal fold line between twins
          drawFoldLine(xTop, yBottom, xTop + T_H, yBottom);
          drawHairlineGuides(xTop, yTop, T_H, 2 * T_W);
        }
      }

      onProgress({
        step: 2,
        current: pageIndex,
        total: metrics.totalPages,
        text: `Writing foldout sheet ${s + 1} of ${sheetChunks.length}...`
      });
      await new Promise(r => setTimeout(r, 0));
    }

    // ========================================================================
    // CONFIGURATION 3: Double-sided printout, single-sided nametag (Blank Backs)
    // ========================================================================
    else if (configType === 'double_single') {
      // Front Page (Odd)
      if (pageIndex > 0) pdf.addPage();
      pageIndex++;

      for (let j = 0; j < chunk.length; j++) {
        const slot = slots[j];
        if (!slot) continue;

        if (!slot.isRotated) {
          pdf.addImage(chunk[j].dataUrl, 'JPEG', slot.x, slot.y, T_W, T_H);
          drawHairlineGuides(slot.x, slot.y, T_W, T_H);
        } else {
          pdf.addImage(chunk[j].dataUrlRotated90, 'JPEG', slot.x, slot.y, T_H, T_W);
          drawHairlineGuides(slot.x, slot.y, T_H, T_W);
        }
      }

      // Back Page (Even) - Left 100% blank!
      pdf.addPage();
      pageIndex++;

      onProgress({
        step: 2,
        current: pageIndex,
        total: metrics.totalPages,
        text: `Writing duplex sheet ${s + 1} with blank reverse...`
      });
      await new Promise(r => setTimeout(r, 0));
    }

    // ========================================================================
    // CONFIGURATION 4: Double-sided printout, double-sided nametag (DUPLEX MIRROR)
    // ========================================================================
    else if (configType === 'double_double') {
      // Front Page (Odd)
      if (pageIndex > 0) pdf.addPage();
      pageIndex++;

      for (let j = 0; j < chunk.length; j++) {
        const slot = slots[j];
        if (!slot) continue;

        if (!slot.isRotated) {
          pdf.addImage(chunk[j].dataUrl, 'JPEG', slot.x, slot.y, T_W, T_H);
          drawHairlineGuides(slot.x, slot.y, T_W, T_H);
        } else {
          pdf.addImage(chunk[j].dataUrlRotated90, 'JPEG', slot.x, slot.y, T_H, T_W);
          drawHairlineGuides(slot.x, slot.y, T_H, T_W);
        }
      }

      // Back Page (Even) - Duplex Mirror Alignment
      pdf.addPage();
      pageIndex++;

      for (let j = 0; j < chunk.length; j++) {
        const slot = slots[j];
        if (!slot) continue;

        if (!slot.isRotated) {
          // Unrotated card horizontal mirror: X_back = P_W - X_front - T_W
          const xBack = numPageW - slot.x - T_W;
          const yBack = slot.y;
          pdf.addImage(chunk[j].dataUrl, 'JPEG', xBack, yBack, T_W, T_H);
          drawHairlineGuides(xBack, yBack, T_W, T_H);
        } else {
          // Rotated card horizontal mirror: X_back = P_W - X_front - T_H
          // Backside rotation angle is -90° (dataUrlRotatedMinus90)
          const xBack = numPageW - slot.x - T_H;
          const yBack = slot.y;
          pdf.addImage(chunk[j].dataUrlRotatedMinus90, 'JPEG', xBack, yBack, T_H, T_W);
          drawHairlineGuides(xBack, yBack, T_H, T_W);
        }
      }

      onProgress({
        step: 2,
        current: pageIndex,
        total: metrics.totalPages,
        text: `Writing mirrored duplex sheet ${s + 1} of ${sheetChunks.length}...`
      });
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // 7. Complete PDF Assembly
  onProgress({ step: 3, current: metrics.totalPages, total: metrics.totalPages, text: "Assembling final PDF file..." });

  const safeRetreat = (retreatTitle || 'Retreat').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `SKY_${safeRetreat}_${configType}_Nametags_${dateStr}.pdf`;

  const blob = pdf.output('blob');
  return { blob, filename };
}
