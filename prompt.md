# SYSTEM DIRECTIVE: AUTOMATED NAMETAG TEMPLATE STUDIO & DUPLEX PDF PRINTING ENGINE

> **CRITICAL OPERATING INSTRUCTION FOR THE IMPLEMENTING AGENT:**  
> You are tasked with implementing a mission-critical, enterprise-grade feature in the SKY at UIUC platform: the **Nametag Template Studio & Automated Printable Sheet PDF Engine**.  
> **You MUST frequently re-read, reference, and check off every section of this prompt document during execution.**  
> Keep this document active in your context. Whenever you complete a component, module, or algorithm, return to this prompt to cross-check requirements, edge cases, formulas, and constraints before proceeding.  
>  
> **DEPLOYMENT SAFETY WARNING:**  
> All code changes in this task will be deployed directly to production upon completion with **ZERO staging tests**. You must exercise extreme precision. Any degradation, regression, or breakage of existing backend systems (Firestore security rules, Google Apps Script email/campaign relay, registrations collection, or volunteer workflows) is strictly intolerable. At the end of implementation, you are required to perform a comprehensive **Adversarial Backend & System Review** following the protocol in Section 9.

---

## 1. Feature Overview & Architecture

### 1.1 Objective
Empower administrators to:
1. **Design & Store Nametag Templates (Admin Hub - Global & Retreat-Independent):** Under a new **Nametag Templates** tab in the Admin Hub (`Admin.jsx`), Super Admins can upload background nametag artwork (PNG, JPG, WebP), specify physical print footprints with aspect-ratio locking, and visually configure two dynamic text boxes:
   - **Text Box 1:** Participant First Name (with intelligent retreat-level name disambiguation).
   - **Text Box 2:** Participant Team / Group Name.
   Each text box has configurable center coordinates, bounding box width/height, maximum font size, font family, color, and drop shadows, with dynamic word-wrapping and auto-downscaling to guarantee that text never overflows its bounding box.
   **Crucial Note:** Unlike flyer templates, **nametag templates are 100% retreat-independent and global**. A nametag template can be used across any and all retreats without needing to be recreated or tied to a specific retreat ID.
2. **Download Printable Nametag Sheets with Flexible Candidate Filtering (Group Assignment Tab):** Inside `GroupAssignmentTab.jsx`, a new **Print Nametag Sheets** action opens a configuration modal where admins configure **WHICH participants to print** (by default selecting **ALL applicants for the retreat**, or filtering by interview/application status such as Approved, Pending, Uncontacted, etc., with individual participant selection), select a saved template, target paper size, margins, extra blank nametags count, and printout configuration (including complex double-sided duplex alignment). The system dynamically packs the nametags tightly and compiles a high-resolution, print-ready PDF using `jspdf`.

### 1.2 Architectural Touchpoints
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND ARCHITECTURE                             │
│                                                                                  │
│   src/pages/Admin.jsx                                                            │
│     └── New Tab: "nametag_templates"                                             │
│           └── src/components/NametagTemplateTab.jsx                              │
│                 ├── Image upload & Aspect-Ratio Lock footprint calculator        │
│                 ├── Visual interactive canvas position & bounding box editor     │
│                 └── Template persistence via src/services/nametagChunkService.js │
│                                                                                  │
│   src/components/GroupAssignmentTab.jsx                                          │
│     └── "Print Nametag Sheets" Trigger Button                                    │
│           └── src/components/NametagDownloadModal.jsx                            │
│                 ├── Renders setup: paper size, margins, 4 print configurations   │
│                 ├── Live packing statistics (cards/page, sheets required)        │
│                 └── Generates PDF via src/utils/nametagPdfUtils.js               │
│                       ├── Retreat name disambiguation algorithm                  │
│                       ├── Canvas text fitting & multi-line wrapping              │
│                       ├── Duplex geometric mirroring & tight sheet packing       │
│                       └── jsPDF document compilation                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                BACKEND & SECURITY                                │
│                                                                                  │
│   firestore.rules                                                                │
│     └── Add collection rules: /nametag_templates/{id} & /chunks/{chunkId}        │
│         (Strict: Super Admin write/delete, Volunteer read-only)                  │
│                                                                                  │
│   storage.rules                                                                  │
│     └── Add: match /nametag_templates/{allPaths=**} { read: true, write: Admin } │
│                                                                                  │
│   Existing Systems (ZERO REGRESSION GUARANTEE):                                  │
│     ├── apps-script/Code.js (DO NOT TOUCH - Email Relay & Sheets)                │
│     ├── /registrations collection (READ-ONLY for nametags, rules UNTOUCHED)      │
│     └── Group Drag-and-Drop & Auto-Assignment Logic (100% PRESERVED)             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Specification 1: Nametag Template Studio (`Admin.jsx` & `NametagTemplateTab.jsx`)

### 2.1 Tab Integration in Admin Hub
In `src/pages/Admin.jsx`:
- Add a new tab identifier: `'nametag_templates'` to the tabs list:
  `'volunteers' | 'retreats' | 'groups' | 'emails' | 'flyer_templates' | 'nametag_templates' | 'campaign_analytics' | 'usage'`
- Add a tab header button matching the existing UI aesthetic (styled with Lucide icon `Tag` or `Contact` or `BadgeAlert`, active indicator styling matching brand tokens).
- Render `<NametagTemplateTab />` inside the tab content area. **Notice:** Nametag templates are global; they do NOT require a `retreats` prop or retreat selector dropdown!

### 2.2 Template Data Model
Each nametag template document stored in Firestore collection `nametag_templates` is **global and retreat-independent** and must conform to the following schema:
```javascript
{
  id: string,                 // Unique ID (e.g. "tpl_nametag_1710000000000")
  title: string,              // e.g. "Universal Floral Nametag"
  createdAt: string,          // ISO timestamp
  updatedAt: string,          // ISO timestamp
  
  // Natural image dimensions
  width: number,              // Natural pixel width of template image (e.g. 1800)
  height: number,             // Natural pixel height of template image (e.g. 1200)
  aspectRatio: number,        // width / height (e.g. 1.50)
  
  // Physical print footprint on paper
  physicalDimensions: {
    unit: 'in' | 'cm' | 'mm',  // Default: 'in'
    width: number,             // e.g. 3.0
    height: number             // e.g. 2.0 (dynamically locked to aspectRatio)
  },

  // First Name Text Box Configuration
  firstNameBox: {
    centerX: number,           // Pixel X coordinate of bounding box center (0 to width)
    centerY: number,           // Pixel Y coordinate of bounding box center (0 to height)
    width: number,             // Bounding box pixel width
    height: number,            // Bounding box pixel height
    maxFontSize: number,       // Max font size in px (e.g. 64)
    fontFamily: string,        // e.g. "'Source Sans 3', sans-serif"
    color: string,             // Hex or RGBA (e.g. "#161942")
    bold: boolean,             // Default: true
    hasShadow: boolean,        // Default: false
    shadowColor: string,       // Default: "rgba(0,0,0,0.3)"
    textAlign: 'center' | 'left' | 'right' // Default: 'center'
  },

  // Team Name Text Box Configuration
  teamNameBox: {
    centerX: number,           // Pixel X coordinate of bounding box center
    centerY: number,           // Pixel Y coordinate of bounding box center
    width: number,             // Bounding box pixel width
    height: number,            // Bounding box pixel height
    maxFontSize: number,       // Max font size in px (e.g. 40)
    fontFamily: string,        // e.g. "'Source Sans 3', sans-serif"
    color: string,             // Hex or RGBA (e.g. "#D97706")
    bold: boolean,             // Default: true
    hasShadow: boolean,        // Default: false
    shadowColor: string,       // Default: "rgba(0,0,0,0.3)"
    textAlign: 'center' | 'left' | 'right' // Default: 'center'
  },

  // Image storage metadata (via chunking service)
  thumbnailBase64: string,     // Lightweight preview data URL (max dimension ~320px)
  chunkCount: number,          // Number of Firestore subcollection slices
  chunkSize: number,           // Slicing chunk size (e.g. 950000 bytes)
  totalLength: number          // Total base64 string length
}
```

### 2.3 Image Handling & Chunked Storage (`nametagChunkService.js`)
- Model after the existing, battle-tested `src/services/flyerChunkService.js`.
- Never store raw high-res Base64 payloads directly in the parent document to avoid Firestore's strict 1 MiB document size limit.
- Automatically create a lightweight thumbnail (`generateThumbnailBase64`, max 320px) stored on the parent doc for instantaneous list rendering.
- Slice the full Base64 image into chunk subdocuments:
  `nametag_templates/{templateId}/chunks/{index}`
- Implement an in-memory runtime cache `imageMemoryCache` (keyed by `templateId`) to eliminate redundant Firestore downloads during repetitive operations.
- Provide functions:
  - `saveNametagTemplateWithChunks(db, templateMetadata, fullBase64)`
  - `loadNametagTemplateImage(db, templateId)`
  - `deleteNametagTemplateWithChunks(db, templateId)`
  - `getNametagTemplates(db)`

### 2.4 Physical Footprint & Aspect Ratio Lock Logic
When the admin uploads an image, calculate:
```javascript
const img = new Image();
img.onload = () => {
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;
  const ratio = naturalW / naturalH;
  // Initialize physical dimensions (default: 3.0 in width)
  const defaultWidth = 3.0;
  const defaultHeight = parseFloat((defaultWidth / ratio).toFixed(3));
};
```
In the template editor UI:
- User can choose unit: `in` (inches), `cm` (centimeters), `mm` (millimeters).
- If the user changes `width`, `height` automatically recalculates:
  `height = parseFloat((newWidth / aspectRatio).toFixed(3))`
- If the user changes `height`, `width` automatically recalculates:
  `width = parseFloat((newHeight * aspectRatio).toFixed(3))`
- An aspect-ratio lock badge/icon displays: "Aspect Ratio Locked (W:H = {ratio.toFixed(2)}:1)".

### 2.5 Visual Interactive Template Editor Canvas
The right column of `NametagTemplateTab.jsx` renders a live HTML5 canvas showing:
1. The uploaded template background image.
2. Overlay guides for **First Name Bounding Box**:
   - Drawn with a distinct accent color (e.g. Sky Blue `#0284C7`), dashed bounding border.
   - Crosshair reticle at `(centerX, centerY)`.
   - Dimensions badge: `${boxWidth} × ${boxHeight} px`.
3. Overlay guides for **Team Name Bounding Box**:
   - Drawn with a distinct accent color (e.g. Sun Gold/Orange `#D97706`), dashed bounding border.
   - Crosshair reticle at `(centerX, centerY)`.
4. Sample Text Previews:
   - Provide a toggle or dropdown to preview with sample names:
     - Short Name: `"John D."` / `"Team Alpha"`
     - Long Name: `"Christopher Alexander"` / `"The Grounding Warriors"`
     - Multi-Word Name: `"Mary-Jane Watson"` / `"Inner Peace Explorers"`
   - Watch the dynamic line wrapping and auto-downscaling render immediately on the canvas as bounding box sliders are adjusted!
5. Toggle Button: "Hide Overlay Guides" to see the final pristine nametag appearance.

---

## 3. Core Specification 2: Participant Name Disambiguation Engine

The template requires that nametags display the participant's First Name, but participants must be unambiguously identifiable in a crowded retreat. The disambiguation must be scoped strictly **per retreat**.

### 3.1 Disambiguation Rules
Given all approved participants in the target retreat:
1. **Rule 1 (Unique First Name):** If only one participant in the retreat has that first name:
   $$\text{Display Name} = \text{FirstName}$$
   *Example:* Retreat has "Alice Smith" and "Bob Jones" $\rightarrow$ **"Alice"** and **"Bob"**.
2. **Rule 2 (Duplicate First Name, Distinct Last Initials):** If multiple participants in the retreat share the same first name, but their last initials are all distinct:
   $$\text{Display Name} = \text{FirstName} + \text{" "} + \text{LastInitial} + \text{"."}$$
   *Example:* Retreat has "John Doe" and "John White" $\rightarrow$ **"John D."** and **"John W."**.
   *(If another retreat has "John Douglas", it does NOT affect this retreat — scoping is strictly per retreat).*
3. **Rule 3 (Duplicate First Name, Colliding Last Initials):** If multiple participants in the retreat share the same first name AND the same last initial:
   $$\text{Display Name} = \text{FirstName} + \text{" "} + \text{LastName}$$
   *Example:* Retreat has "John Doe", "John Douglas", and "John White":
   - "John Doe" and "John Douglas" share the last initial `'D'`, so they are displayed with their full last names: **"John Doe"** and **"John Douglas"**.
   - "John White" has unique initial `'W'` (or can be displayed as **"John White"** for uniformity in that name collision cluster). To prevent any possible ambiguity, whenever any last initial collision occurs within a first-name collision group, all members with colliding initials use their full last names.
4. **Edge Cases:**
   - Single-word names or missing last name: Use the available name string.
   - Multi-word first names (e.g. "Mary Jane"): Keep first name intact, use initial of last name.
   - Hyphenated last names (e.g. "Smith-Jones"): Initial is the first letter (`'S'`).

### 3.2 Reference Implementation Helper
Implement in `src/utils/nametagPdfUtils.js`:
```javascript
export function resolveParticipantDisplayName(participant, retreatRoster) {
  const cleanFirst = (participant.firstName || '').trim();
  const cleanLast = (participant.lastName || '').trim();
  if (!cleanFirst) return cleanLast || participant.name || 'Participant';
  if (!cleanLast) return cleanFirst;

  const targetFirstLower = cleanFirst.toLowerCase();

  // Find all participants in the same retreat roster with the same first name
  const peers = retreatRoster.filter(p => 
    (p.firstName || '').trim().toLowerCase() === targetFirstLower
  );

  // If unique within retreat
  if (peers.length <= 1) {
    return cleanFirst;
  }

  // Count occurrences of last initials among peers
  const initialCounts = {};
  peers.forEach(p => {
    const l = (p.lastName || '').trim();
    const init = l ? l.charAt(0).toUpperCase() : '?';
    initialCounts[init] = (initialCounts[init] || 0) + 1;
  });

  const myInitial = cleanLast.charAt(0).toUpperCase();

  // If this participant's initial is unique among all with the same first name
  if (initialCounts[myInitial] === 1) {
    return `${cleanFirst} ${myInitial}.`;
  }

  // Otherwise initial collides: use full first and last name
  return `${cleanFirst} ${cleanLast}`;
}
```

### 3.3 Team Name Resolution
- If participant is assigned to a group (e.g. `groupId = 'group-1'`) and custom group name is configured in retreat settings (e.g. `groupNames['group-1'] = 'Team Phoenix'`), use that name.
- If assigned to `group-1` without custom name, use `'Group 1'`.
- If participant is unassigned (`groupId = 'unassigned'` or null): display `''` (empty string) or `'Unassigned'` depending on setting; for clean aesthetics, leave blank.
- For extra nametags (last-minute entries): First Name and Team Name are both left blank (`''`).

### 3.4 Candidate Selection & Application / Interview Status Filter Logic
When downloading the PDF, the admin must be able to configure **WHICH names/participants to print**:
1. **Default State:**
   - By default, **ALL applicants for the target retreat** are selected (regardless of status: Approved, Pending, Uncontacted, Waitlisted, etc.).
   - The retreat applicant pool is derived from `registrations` where `retreatId === activeRetreat.id` (or matching title). Unlike the group arrangement board which shows only approved members, the nametag generator has access to the full applicant roster.
2. **Interview / Application Status Multi-Select Filter:**
   - Status is extracted via:
     ```javascript
     const status = reg.orientationStatus || reg.interviewStatus || reg.status || 'Uncontacted';
     ```
   - Admins can toggle which status categories are included using multi-select filter chips or checkboxes:
     - `Approved`
     - `Pending` (or `Pending Orientation` / `Pending Interview`)
     - `Uncontacted`
     - `Waitlisted`
     - Any other custom statuses detected in the roster
   - Quick Preset Buttons:
     - **"All Applicants (Default)"** — Selects all statuses.
     - **"Approved Only"** — Selects only approved participants.
     - **"Pending / Uncontacted"** — Selects applicants still undergoing review.
3. **Granular Participant Checklist:**
   - An interactive candidate list table/checklist where each participant has a toggle checkbox.
   - Includes a search filter input (search by name, email, or group).
   - Allows fine-grained inclusion or exclusion of individual attendees (e.g. excluding a participant who notified staff they cannot attend).
4. **Disambiguation Interaction:**
   - The name disambiguation algorithm (`resolveParticipantDisplayName`) runs against the **filtered list of selected candidates** (or against the full retreat roster), ensuring that all names printed on the sheets are uniquely identifiable.

---

## 4. Core Specification 3: Dynamic Multi-Line Wrapping & Auto-Downscaling

Text MUST fit inside the template's bounding box without overflowing or truncating. If a participant has a long name, the engine must:
1. Attempt to fit at the configured maximum font size.
2. If text exceeds bounding box width, roll words onto new lines.
3. If text still exceeds bounding box width or height, progressively scale down font size until all lines fit comfortably within the bounding box boundaries.

### 4.1 Fitting & Wrapping Algorithm
Implement in `src/utils/nametagPdfUtils.js`:
```javascript
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
  maxFontSize, 
  fontFamily, 
  bold = true, 
  minFontSize = 8
) {
  if (!text || !text.trim()) {
    return { lines: [], fontSize: maxFontSize, totalHeight: 0, lineHeight: maxFontSize * 1.18 };
  }

  const words = text.trim().split(/\s+/);
  let low = minFontSize;
  let high = maxFontSize;
  let bestFit = null;

  // Binary search or descending search for the largest font size that fits
  for (let size = maxFontSize; size >= minFontSize; size -= 1) {
    const lineHeight = size * 1.18;
    const maxAllowedLines = Math.max(1, Math.floor(boxHeight / lineHeight));
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${fontFamily}`;

    // Helper: try greedy word wrapping into lines
    const lines = [];
    let currentLine = words[0];

    // Check if even a single word is wider than boxWidth
    let singleWordOverflow = false;
    for (const w of words) {
      if (ctx.measureText(w).width > boxWidth) {
        singleWordOverflow = true;
        break;
      }
    }
    if (singleWordOverflow) continue; // size too big for word

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
        break; // Found largest fitting font size!
      }
    }
  }

  // Fallback: If even at minFontSize a single word overflows, force hyphenation/clamping
  if (!bestFit) {
    const size = minFontSize;
    const lineHeight = size * 1.18;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${fontFamily}`;
    bestFit = {
      lines: [text],
      fontSize: size,
      totalHeight: lineHeight,
      lineHeight
    };
  }

  return bestFit;
}
```

### 4.2 Canvas Drawing with Center Alignment
When rendering a nametag to canvas:
```javascript
export function drawFittedTextOnCanvas(ctx, text, box, defaultFontFamily = "'Source Sans 3', sans-serif") {
  if (!text || !box) return;
  const { centerX, centerY, width, height, maxFontSize, color, bold, hasShadow, shadowColor, fontFamily, textAlign } = box;
  const activeFont = fontFamily || defaultFontFamily;

  const fit = calculateFittedText(ctx, text, width, height, maxFontSize || 48, activeFont, bold !== false);
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
```

---

## 5. Core Specification 4: Printable PDF Sheet Packing & Duplex Mirroring Engine

### 5.1 Default Print Parameters
As explicitly mandated in requirements:
- **Units:** `in` (inches) — (Options: `in`, `cm`, `mm`)
- **Page Width:** `8.5 in` (US Letter standard width)
- **Page Height:** `11.0 in` (US Letter standard height)
- **Margins:** `0.5 in` on all four borders
- **Printout Type:** `Double-sided printout, double-sided nametag`
- **Number of Extra Blank Nametags:** `10`

### 5.2 Unit Conversions
Standardize all internal PDF placement calculations to inches or points:
- $1\text{ in} = 25.4\text{ mm} = 2.54\text{ cm} = 72\text{ pt}$
When creating the `jsPDF` instance:
```javascript
import { jsPDF } from 'jspdf';
const pdf = new jsPDF({
  orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
  unit: selectedUnit, // 'in' | 'mm' | 'cm'
  format: [pageWidth, pageHeight]
});
```

### 5.3 Usable Printable Space & Grid Math
Let:
- $P_W$ = Page Width (e.g. 8.5 in)
- $P_H$ = Page Height (e.g. 11.0 in)
- $M$ = Margin on all borders (e.g. 0.5 in)
- $U_W = P_W - 2M$ (Usable Width, e.g. 7.5 in)
- $U_H = P_H - 2M$ (Usable Height, e.g. 10.0 in)
- $T_W$ = Nametag Footprint Width (e.g. 3.0 in)
- $T_H$ = Nametag Footprint Height (e.g. 2.0 in)

Nametags must be packed as tightly as possible on the page in accordance with these constraints.
Extra slack within margins should be centered:
$$slackX = U_W - (cols \times cellW)$$
$$slackY = U_H - (rows \times cellH)$$
$$originX = M + \frac{slackX}{2}$$
$$originY = M + \frac{slackY}{2}$$

---

### 5.4 The 4 Printout & Nametag Configurations (EXACT GEOMETRY)

#### Configuration 1: Single-sided printout, single-sided nametag
- **Description:** Each participant's nametag appears exactly once in the PDF, and every page contains a unique sheet of nametags.
- **Cell Dimensions:** $cellW = T_W$, $cellH = T_H$.
- **Grid Capacity:**
  - $cols = \lfloor U_W / cellW \rfloor$
  - $rows = \lfloor U_H / cellH \rfloor$
  - $N_{\text{page}} = cols \times rows$
- **PDF Construction:**
  - Sequential single-sided pages.
  - Cell at column $c$ ($0 \le c < cols$), row $r$ ($0 \le r < rows$):
    $$X = originX + c \times cellW$$
    $$Y = originY + r \times cellH$$
  - Once $N_{\text{page}}$ nametags are drawn, call `pdf.addPage()`.

---

#### Configuration 2: Single-sided printout, double-sided nametag (Side-by-Side Foldout)
- **Description:** Each nametag is allocated double its width and same height (e.g. 3 in $\times$ 2 in footprint becomes 6 in $\times$ 2 in space). Two consecutive identical nametags are printed side by side so the cutout can be folded in half along the vertical center.
- **Cell Dimensions:** $cellW = 2 \times T_W$, $cellH = T_H$.
- **Grid Capacity:**
  - $cols = \lfloor U_W / (2 \times T_W) \rfloor$
  - $rows = \lfloor U_H / T_H \rfloor$
  - $N_{\text{page}} = cols \times rows$
- **PDF Construction:**
  - In each cell $(c, r)$ for participant $i$:
    - Left half nametag:
      $$X_{\text{left}} = originX + c \times cellW$$
      $$Y_{\text{left}} = originY + r \times cellH$$
      Render participant $i$'s nametag with width $T_W$ and height $T_H$.
    - Right half nametag (identical twin):
      $$X_{\text{right}} = originX + c \times cellW + T_W$$
      $$Y_{\text{right}} = originY + r \times cellH$$
      Render participant $i$'s nametag with width $T_W$ and height $T_H$.
    - Optional fold line: Draw a subtle, light gray dotted line down the seam between $X_{\text{left}} + T_W$ from $Y$ to $Y + T_H$ as a fold guide.

---

#### Configuration 3: Double-sided printout, single-sided nametag (Duplex Blank Backs)
- **Description:** Each page is sent to a duplex printer, but each nametag only appears once in the PDF. Every odd page contains a unique sheet of nametags, and every even page is left completely blank so no backsides print.
- **Cell Dimensions:** $cellW = T_W$, $cellH = T_H$.
- **PDF Construction:**
  - Page 1 (Odd): Render first sheet of $N_{\text{page}}$ nametags.
  - Page 2 (Even): Call `pdf.addPage()`, leave 100% blank!
  - Page 3 (Odd): Render next sheet of $N_{\text{page}}$ nametags.
  - Page 4 (Even): Call `pdf.addPage()`, leave 100% blank!
  - Repeat until all participants and extra blank nametags are printed.

---

#### Configuration 4: Double-sided printout, double-sided nametag (DUPLEX MIRROR ALIGNMENT)
- **Description:** Printed double-sided on duplex printers. Every physical nametag has the identical nametag printed on front and back.
- **CRITICAL DUPLEX ALIGNMENT MATHEMATICS:**
  When a sheet of paper is flipped horizontally (standard duplex book/long-edge flip), a shape located at distance $d$ from the **left** edge of the front side appears at distance $d$ from the **right** edge of the backside.
  - Front Page (Odd Page):
    For cell at column $c$ and row $r$:
    $$X_{\text{front}} = originX + c \times T_W$$
    $$Y_{\text{front}} = originY + r \times T_H$$
    Render participant $i$'s nametag at $(X_{\text{front}}, Y_{\text{front}})$ with size $(T_W, T_H)$.
  - Back Page (Immediately Following Even Page):
    The same participant $i$'s nametag MUST appear directly behind their front nametag:
    $$\text{Right-edge distance on back} = X_{\text{front}}$$
    $$\implies X_{\text{back}} = P_W - X_{\text{front}} - T_W$$
    $$Y_{\text{back}} = Y_{\text{front}} = originY + r \times T_H$$
    Render identical participant $i$'s nametag at $(X_{\text{back}}, Y_{\text{back}})$ with size $(T_W, T_H)$.
- **Proof of Symmetry:**
  If $P_W = 8.5\text{ in}$, $M = 0.5\text{ in}$, $T_W = 3\text{ in}$, $T_H = 2\text{ in}$, $cols = 2$:
  - Column 0 Front: $X_{\text{front}} = 0.5 + 0 \times 3 = 0.5\text{ in}$.
    Back position: $X_{\text{back}} = 8.5 - 0.5 - 3 = 5.0\text{ in}$. (Which is exactly Column 1 on the back sheet!).
  - Column 1 Front: $X_{\text{front}} = 0.5 + 1 \times 3 = 3.5\text{ in}$.
    Back position: $X_{\text{back}} = 8.5 - 3.5 - 3 = 2.0\text{ in}$.
  When held up to a window or cut through with scissors, front and back align with millimeter accuracy!

---

### 5.5 Optional Crop / Cut Guides
Draw subtle, fine hairline crop marks or light dotted boundary rectangles (line width `0.5 pt`, color `#D1D5DB`) around each nametag cell so volunteers can quickly cut sheets with a paper cutter.

---

### 5.6 [OPTIONAL ADVANCED FEATURE] 90° Mixed-Orientation Sheet Packing Optimizer

> **NOTE ON OPTIONALITY:**  
> This feature is **entirely optional**. The implementing agent must first complete, verify, and lock in the standard uniform grid packing (Sections 5.1–5.4). **Only implement this feature if you are extremely confident about its mathematical correctness and execution.** If implemented, it should be exposed in the UI via an opt-in toggle (defaulting to standard uniform grid).

#### The Packing Optimization Problem
In uniform grid packing, all nametags are oriented identically (all $w \times h$ or all $h \times w$). However, for certain paper dimensions, margins, and card sizes, significant unused whitespace is left along one edge:
- For example, if usable width is $8.0\text{ in}$ and nametag width is $3.0\text{ in}$, 2 unrotated columns use $6.0\text{ in}$, leaving a $2.0\text{ in}$ unused strip.
- A 3in-wide card cannot fit into that $2.0\text{ in}$ strip. But if nametag height is $2.0\text{ in}$, rotated cards ($2.0\text{ in}$ wide $\times 3.0\text{ in}$ high) **can fit** in that leftover strip!
- Mixing unrotated ($w \times h$) and 90° rotated ($h \times w$) rectangles can increase the total number of nametags per sheet by 20% to 35%.

#### 2-Block Guillotine Packing Algorithm
To determine the maximum cards per sheet:
1. **Uniform Orientation A (Unrotated):**
   $$N_A = \lfloor U_W / w \rfloor \times \lfloor U_H / h \rfloor$$
2. **Uniform Orientation B (Rotated 90°):**
   $$N_B = \lfloor U_W / h \rfloor \times \lfloor U_H / w \rfloor$$
3. **Vertical Split Mixed Packing:**
   For $k \in [1, \lfloor U_W / w \rfloor]$:
   - Left Block: $k$ columns of unrotated $(w \times h) \implies k \times \lfloor U_H / h \rfloor$ cards.
   - Right Strip Width: $U_W - (k \times w)$.
   - If Right Strip Width $\ge h$:
     - Rotated Columns: $cols_{\text{rot}} = \lfloor (U_W - k \times w) / h \rfloor$.
     - Rotated Rows: $rows_{\text{rot}} = \lfloor U_H / w \rfloor$.
     - Combined Capacity: $N_{\text{vert}}(k) = (k \times \lfloor U_H / h \rfloor) + (cols_{\text{rot}} \times rows_{\text{rot}})$.
4. **Horizontal Split Mixed Packing:**
   For $m \in [1, \lfloor U_H / h \rfloor]$:
   - Top Block: $m$ rows of unrotated $(w \times h) \implies \lfloor U_W / w \rfloor \times m$ cards.
   - Bottom Strip Height: $U_H - (m \times h)$.
   - If Bottom Strip Height $\ge w$:
     - Rotated Rows: $rows_{\text{rot}} = \lfloor (U_H - m \times h) / w \rfloor$.
     - Rotated Columns: $cols_{\text{rot}} = \lfloor U_W / h \rfloor$.
     - Combined Capacity: $N_{\text{horiz}}(m) = (\lfloor U_W / w \rfloor \times m) + (cols_{\text{rot}} \times rows_{\text{rot}})$.
5. If $\max(N_{\text{vert}}, N_{\text{horiz}}) > \max(N_A, N_B)$, the mixed layout fits more cards per sheet!

#### Duplex Mirror Alignment Mathematics for 90° Rotated Nametags
When a rotated nametag is printed on a double-sided sheet (Configuration 4):
- **Front Page (Odd):**
  - Rotated nametag cell at $(X_F, Y_F)$ with dimensions $(h, w)$.
  - Nametag artwork is rendered rotated by **$+90^\circ$ (Clockwise)**.
- **Back Page (Even / Duplex Mirror):**
  - Bounding box horizontally mirrors to:
    $$X_B = P_W - X_F - h$$
    $$Y_B = Y_F$$
    Bounding box dimensions: $(h, w)$.
  - **Rotation Angle on Back Page:** Must be rendered rotated by **$-90^\circ$ (Counter-Clockwise, or $+270^\circ$)**.
  - **Geometric Proof:**  
    Flipping the paper around its vertical axis reverses the horizontal direction. On the front, $+90^\circ$ CW places the card's top edge pointing right. Through the sheet, the right edge is the back's left edge. Rotating the back card by $-90^\circ$ points its top edge to the left. Therefore, when held up to light or cut out, both sides share the exact same top and bottom edges!

#### Implementation Safety & UI Toggle
- If implemented, add a checkbox to `NametagDownloadModal.jsx`:
  `[ ] Max-Density 90° Mixed Packing (Experimental)` (Default: Unchecked).
- When unchecked: Uses standard uniform grid.
- When checked: Uses the 2-block optimizer if it yields more cards than uniform.

---

## 6. Core Specification 5: Group Assignment Tab Integration (`NametagDownloadModal.jsx`)

### 6.1 Trigger Button in `GroupAssignmentTab.jsx`
In the top action bar of `GroupAssignmentTab.jsx` (alongside `Auto-Arrange Non-Volunteers` and `Reset All`):
- Add a prominent, styled button:
  ```jsx
  <button
    type="button"
    className="btn btn-primary"
    onClick={() => setShowNametagModal(true)}
    style={{
      padding: '0.65rem 1.15rem',
      fontSize: '0.88rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
      boxShadow: 'var(--shadow-sm)'
    }}
    title="Generate printable PDF nametag sheets for this retreat"
  >
    <Tag size={16} />
    Print Nametag Sheets
  </button>
  ```

### 6.2 The Download Modal Component (`NametagDownloadModal.jsx`)
Create `src/components/NametagDownloadModal.jsx` with the following rich, interactive controls:
1. **Template Selection:**
   - Dropdown of all saved nametag templates (auto-fetches from Firestore).
   - **Global Templates:** All saved nametag templates are retreat-independent and universally available for any retreat.
   - Shows selected template's footprint (e.g. `3.0 in × 2.0 in`) and thumbnail preview.
   - If no templates exist, show an informational banner with a direct link/button to switch to the Nametag Templates Studio tab in Admin Hub.

2. **Candidate Selection & Interview / Application Status Filter (WHICH Names to Print):**
   - **Default Behavior:** By default, **ALL applicants for the retreat are selected** (all interview/orientation statuses).
   - **Status Multi-Select Filter:**
     - Interactive filter pills or checkboxes for each status:
       - `Approved`
       - `Pending` (or `Pending Orientation` / `Pending Interview`)
       - `Uncontacted`
       - `Waitlisted`
     - Quick Preset Buttons:
       - **"All Applicants (Default)"** — Checks all statuses.
       - **"Approved Only"** — Checks only approved participants.
       - **"Pending / Uncontacted"** — Checks only applicants in pipeline.
   - **Granular Candidate Review Table / Checklist (Collapsible):**
     - Displays a clean, scrollable roster of candidates matching the current filters:
       - Columns / Items: `[Checkbox]` `Name` `Email` `Status Badge` `Assigned Group`
       - Quick search bar to filter by applicant name or email.
       - "Select All" / "Deselect All" quick buttons.
       - Allows the admin to deselect specific individuals who notified staff they cannot attend, or include specific edge-case candidates.
   - **Selection Counter Badge:** Shows `{selectedCount} of {totalRetreatApplicants} applicants selected`.

3. **Paper Dimensions & Margins:**
   - Paper Size Preset Dropdown:
     - `US Letter (8.5 × 11 in)` (Default)
     - `A4 (8.27 × 11.69 in / 210 × 297 mm)`
     - `Legal (8.5 × 14 in)`
     - `Tabloid (11 × 17 in)`
     - `Custom Dimensions`
   - Units Selector: `in` | `cm` | `mm` (Default: `in`).
   - Margin Input: (Default: `0.5 in`).

4. **Printout Configuration Selector:**
   Render 4 selectable cards/radios with explanatory badges:
   - 🔘 **Double-Sided Printout, Double-Sided Nametag** *(Recommended / Default)*
     *Description: Printed duplex. Mirrored alignment ensures the nametag matches on front & back.*
   - 🔘 **Single-Sided Printout, Double-Sided Nametag (Fold-in-Half)**
     *Description: Prints two identical nametags side-by-side to fold in half after cutting.*
   - 🔘 **Single-Sided Printout, Single-Sided Nametag**
     *Description: Standard single-sided sheet. Each nametag appears once.*
   - 🔘 **Double-Sided Printout, Single-Sided Nametag (Blank Backs)**
     *Description: Duplex printing with blank reverse pages for single-sided badges.*

5. **Extra Blank Nametags Counter:**
   - Number input: default `10`, min `0`, max `200`.
   - Explanation: "Prints empty nametag blanks (with background only) for walk-ins and last-minute attendees."

6. **Live Sheet Packing Breakdown Panel:**
   Displays calculated metrics dynamically as options and candidate filters are toggled:
   - 🏷️ **Grid per Sheet:** `{cols} columns × {rows} rows ({cols * rows} nametags/sheet)`
   - 👥 **Total Nametags:** `{selectedCount} selected applicants + {extraCount} blanks = {totalNametags}`
   - 📄 **Total PDF Pages:** `{calculatedPageCount} pages ({physicalSheets} physical paper sheets)`

7. **Progress Indicator & Download Action:**
   - "Generate Printable PDF" button with download icon.
   - Progress bar when clicked:
     - "Step 1/3: Rendering high-resolution nametag graphics ({current}/{total})..."
     - "Step 2/3: Applying duplex layout and crop marks..."
     - "Step 3/3: Assembling PDF document..."
   - File saved as: `SKY_[RetreatTitle]_[ConfigType]_Nametags_[YYYY-MM-DD].pdf`.

---

## 7. Required Dependency & Environment Setup

### 7.1 Install `jspdf`
Add `jspdf` to `package.json` dependencies:
```bash
npm install jspdf
```
Verify `npm run build` succeeds after installation and that Vite bundles `jspdf` cleanly without issues.

---

## 8. Security & Database Rules (`firestore.rules` & `storage.rules`)

### 8.1 Firestore Security Rules
In `firestore.rules`, add strict security matching `flyer_templates`:
```javascript
    // 8. Retreat Nametag Templates Studio (Super Admin creates/edits, Volunteers read)
    match /nametag_templates/{document} {
      allow read: if isVolunteer();
      allow write, create, update, delete: if isAdmin();

      // Chunk Subcollection for Lossless Image Slices
      match /chunks/{chunkId} {
        allow read: if isVolunteer();
        allow write, create, update, delete: if isAdmin();
      }
    }
```
> **CRITICAL:** Do NOT modify, reorder, or alter any lines in the `registrations` collection matcher. That collection has strict validator constraints that must remain 100% untouched.

### 8.2 Storage Security Rules
In `storage.rules`:
```javascript
    // Nametag Templates Media (Public Read, Super Admin Write)
    match /nametag_templates/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
```

---

## 9. MANDATORY ADVERSARIAL SYSTEM & BACKEND REVIEW PROTOCOL

Because these changes will be immediately deployed to production without staging tests, the executing agent **MUST perform this adversarial review at the completion of implementation**. You must document this review explicitly in your completion walkthrough.

### Adversarial Checklist

| # | System / Component | Threat Model / Regression Risk | Verification Requirement |
|---|--------------------|--------------------------------|--------------------------|
| **1** | **Google Apps Script (`apps-script/Code.js`)** | Risk of inadvertent code edits breaking Google Sheet database, campaign analytics, or email relays. | **Inspect Git diff:** Verify `apps-script/` has **ZERO modified files**. Nametag generation must be 100% client-side. |
| **2** | **Registration Schema & Rules (`firestore.rules`)** | Risk of breaking applicant submissions or volunteer status changes by altering `registrations` match block. | **Inspect Git diff:** Verify lines for `/registrations/{document}` are **byte-for-byte identical**. Only `/nametag_templates` rules were added. |
| **3** | **Database Read/Write Quota Explosion** | Risk of mass-writing or batch updating participant documents when generating PDF. | **Code Inspection:** Verify PDF generation is **strictly READ-ONLY** with respect to Firestore `registrations`. Generating a PDF triggers **0 Firestore write operations**. |
| **4** | **Group Assignment Tab Drag-and-Drop & Auto-Arrange** | Risk of state corruption in `allManageableMembers`, drag-and-drop chips, or `handleAutoArrangeNonVolunteers`. | **Code Inspection:** Verify `GroupAssignmentTab.jsx` logic for groups, drag state, and saving to `retreat_history` was NOT modified. The nametag trigger is an isolated modal dialog. |
| **5** | **Memory Leak in Canvas Batch Rendering** | Risk of browser tab crashing with out-of-memory error when generating hundreds of high-res canvas images. | **Code Inspection:** In `nametagPdfUtils.js`, re-use a single offscreen `<canvas>` context for sequential rendering, or explicitly clean up temporary canvas instances. |
| **6** | **Build & Bundle Integrity** | Risk of Vite bundle failure or lint errors in production build. | **Execute:** Run `npm run lint` and `npm run build`. Must exit with **code 0 and 0 errors**. |

---

## 10. Step-by-Step Implementation Roadmap

Execute the implementation systematically across these phases:

### Phase 1: Dependencies & Security Rules
1. Run `npm install jspdf`.
2. Update `firestore.rules` to include `/nametag_templates/{document}` and `/chunks/{chunkId}`.
3. Update `storage.rules` to include `/nametag_templates/{allPaths=**}`.

### Phase 2: Services & Mathematical Utilities
1. Create `src/services/nametagChunkService.js`:
   - Implement `saveNametagTemplateWithChunks`, `loadNametagTemplateImage`, `deleteNametagTemplateWithChunks`, `getNametagTemplates`.
   - Add in-memory runtime cache for seamless performance.
2. Create `src/utils/nametagPdfUtils.js`:
   - Implement `resolveParticipantDisplayName(participant, retreatRoster)` (Name disambiguation).
   - Implement `calculateFittedText` and `drawFittedTextOnCanvas` (Dynamic wrapping & downscaling).
   - Implement `generateNametagsPdf(...)` supporting all 4 printout configurations (including duplex geometric mirroring).

### Phase 3: Admin Hub Nametag Template Studio
1. Create `src/components/NametagTemplateTab.jsx`:
   - Image upload, aspect-ratio lock footprint calculator.
   - Text Box 1 & 2 controls (center coordinates, width, height, max font size, color, font, shadows).
   - Live interactive canvas preview with toggleable sample data & overlay boundary guides.
   - Saved templates roster cards with edit/delete.
2. Update `src/pages/Admin.jsx`:
   - Add `'nametag_templates'` tab button and tab body rendering.

### Phase 4: Group Assignment Tab Printout Integration
1. Create `src/components/NametagDownloadModal.jsx`:
   - Candidate selection & status filter (defaults to all retreat applicants, allows filtering by Approved, Pending, Uncontacted, and granular checklist).
   - Template selection, paper dimensions, margins, 4 printout configuration cards, extra blank count.
   - Real-time packing calculation metrics.
   - Progress bar & PDF download trigger.
2. Update `src/components/GroupAssignmentTab.jsx`:
   - Compute `retreatAllApplicants` from `registrations` for the active retreat (enabling printing for all applicant statuses).
   - Add the "Print Nametag Sheets" button to the action bar.
   - Mount `<NametagDownloadModal applicants={retreatAllApplicants} activeRetreat={activeRetreat} ... />`.

### Phase 5: Verification & Adversarial Audit
1. Run `npm run lint` and fix any lint issues.
2. Run `npm run build` and ensure Vite compiles cleanly.
3. Perform the full Adversarial Review in Section 9 and verify zero regressions.
