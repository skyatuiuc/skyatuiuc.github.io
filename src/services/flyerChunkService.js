import { doc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

export const PRIMARY_CHUNK_SIZE = 950 * 1000; // 950,000 bytes (~98.5 KB safety margin below 1 MiB)
export const FALLBACK_CHUNK_SIZE = 500 * 1000; // 500,000 bytes (Ultra-conservative fallback)

// In-memory runtime cache for reassembled full-resolution template images
const imageMemoryCache = new Map();

/**
 * Slice a Base64 image string into an array of indexed chunks
 * @param {string} base64String Full Base64 image payload
 * @param {number} chunkSize Target maximum bytes per slice
 * @returns {Array<{ index: number, data: string }>}
 */
export function sliceIntoChunks(base64String, chunkSize = PRIMARY_CHUNK_SIZE) {
  if (!base64String || typeof base64String !== 'string') return [];
  const chunks = [];
  let index = 0;
  for (let offset = 0; offset < base64String.length; offset += chunkSize) {
    chunks.push({
      index,
      data: base64String.slice(offset, offset + chunkSize)
    });
    index++;
  }
  return chunks;
}

/**
 * Generate a lightweight, screen-optimized thumbnail for fast list previews
 * @param {string} fullBase64 
 * @param {number} maxDimension 
 * @returns {Promise<string>}
 */
export function generateThumbnailBase64(fullBase64, maxDimension = 320) {
  return new Promise((resolve) => {
    if (!fullBase64 || typeof fullBase64 !== 'string' || !fullBase64.startsWith('data:image')) {
      return resolve(null);
    }
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxDimension || h > maxDimension) {
        const ratio = Math.min(maxDimension / w, maxDimension / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.60));
    };
    img.onerror = () => resolve(null);
    img.src = fullBase64;
  });
}

/**
 * Save flyer template parent document and all chunk subdocuments atomically
 * @param {any} db Firestore instance
 * @param {object} templateMetadata Parent document data
 * @param {string} fullBase64 Full resolution image payload
 * @returns {Promise<{ chunkCount: number, chunkSize: number, thumbnailBase64: string }>}
 */
export async function saveFlyerTemplateWithChunks(db, templateMetadata, fullBase64) {
  const templateId = templateMetadata.id;
  
  // 1. Generate lightweight thumbnail for instant card displays
  const thumbnailBase64 = await generateThumbnailBase64(fullBase64);

  // Helper to attempt committing chunks with a specific size
  const attemptCommit = async (chunkSize) => {
    const chunks = sliceIntoChunks(fullBase64, chunkSize);

    // Fetch existing chunks to clean up orphan chunk documents from previous uploads
    let existingDocs = [];
    try {
      const oldSnap = await getDocs(collection(db, 'flyer_templates', templateId, 'chunks'));
      existingDocs = oldSnap.docs;
    } catch (e) {
      // Ignore if new template
    }

    const batch = writeBatch(db);

    // Parent Document
    const parentDocRef = doc(db, 'flyer_templates', templateId);
    const parentPayload = {
      ...templateMetadata,
      thumbnailBase64: thumbnailBase64 || null,
      chunkCount: chunks.length,
      chunkSize,
      totalLength: fullBase64.length,
      updatedAt: new Date().toISOString()
    };
    // Ensure large payload fields are removed from parent doc
    delete parentPayload.bgImageUrl;
    delete parentPayload.bgImageDataUrl;

    batch.set(parentDocRef, parentPayload);

    // Delete any obsolete chunks that exceed the new chunk count
    existingDocs.forEach((d) => {
      const idx = d.data().index;
      if (typeof idx === 'number' && idx >= chunks.length) {
        batch.delete(d.ref);
      }
    });

    // Chunk Subdocuments: flyer_templates/{templateId}/chunks/{index}
    chunks.forEach((chunk) => {
      const chunkDocRef = doc(db, 'flyer_templates', templateId, 'chunks', String(chunk.index));
      batch.set(chunkDocRef, {
        index: chunk.index,
        data: chunk.data,
        length: chunk.data.length
      });
    });

    await batch.commit();
    return { chunkCount: chunks.length, chunkSize, thumbnailBase64 };
  };

  // 2. Try Primary Chunk Size (950,000 bytes), fallback to 500,000 bytes on error
  try {
    const result = await attemptCommit(PRIMARY_CHUNK_SIZE);
    imageMemoryCache.set(templateId, fullBase64);
    return result;
  } catch (primaryErr) {
    console.warn("Primary chunk batch notice, retrying with 500KB fallback:", primaryErr);
    const fallbackResult = await attemptCommit(FALLBACK_CHUNK_SIZE);
    imageMemoryCache.set(templateId, fullBase64);
    return fallbackResult;
  }
}

/**
 * Load and reassemble the full lossless image payload from subcollection chunks
 * @param {any} db Firestore instance
 * @param {string} templateId Template Document ID
 * @returns {Promise<string|null>}
 */
export async function loadFlyerTemplateImage(db, templateId) {
  if (!templateId) return null;

  // 1. Check in-memory runtime cache
  if (imageMemoryCache.has(templateId)) {
    return imageMemoryCache.get(templateId);
  }

  // 2. Query subcollection chunks and parent metadata from Firestore
  if (!db) return null;

  try {
    const parentDocRef = doc(db, 'flyer_templates', templateId);
    const chunksCollRef = collection(db, 'flyer_templates', templateId, 'chunks');

    const [parentSnap, chunksSnapshot] = await Promise.all([
      getDoc(parentDocRef),
      getDocs(chunksCollRef)
    ]);

    if (chunksSnapshot.empty) {
      return null;
    }

    const parentData = parentSnap.exists() ? parentSnap.data() : null;
    const expectedChunkCount = (parentData && typeof parentData.chunkCount === 'number') ? parentData.chunkCount : null;
    const expectedTotalLength = (parentData && typeof parentData.totalLength === 'number') ? parentData.totalLength : null;

    // Filter out any stale/orphan chunks with index >= expectedChunkCount and sort ascending
    const sortedDocs = chunksSnapshot.docs
      .map((d) => d.data())
      .filter((d) => typeof d.index === 'number' && (expectedChunkCount === null || d.index < expectedChunkCount))
      .sort((a, b) => a.index - b.index);

    let fullBase64 = sortedDocs.map((d) => d.data).join('');

    // If exact total length is specified in metadata, slice exactly to prevent trailing junk
    if (expectedTotalLength && fullBase64.length > expectedTotalLength) {
      fullBase64 = fullBase64.slice(0, expectedTotalLength);
    }

    if (fullBase64 && fullBase64.startsWith('data:image')) {
      imageMemoryCache.set(templateId, fullBase64);
      return fullBase64;
    }

    return fullBase64 || null;
  } catch (err) {
    console.warn("Failed to fetch flyer template image chunks:", err);
    return null;
  }
}

/**
 * Delete parent template document and all its subcollection chunk documents
 * @param {any} db Firestore instance
 * @param {string} templateId Template Document ID
 */
export async function deleteFlyerTemplateWithChunks(db, templateId) {
  if (!db || !templateId) return;

  try {
    const chunksCollRef = collection(db, 'flyer_templates', templateId, 'chunks');
    const snapshot = await getDocs(chunksCollRef);

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    batch.delete(doc(db, 'flyer_templates', templateId));

    await batch.commit();
    imageMemoryCache.delete(templateId);
  } catch (err) {
    console.warn("Error deleting flyer template chunks:", err);
  }
}
