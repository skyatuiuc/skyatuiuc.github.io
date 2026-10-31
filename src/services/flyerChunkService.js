import { createChunkedImageStore } from './chunkedImageStore';

// Flyer artwork lives in flyer_templates/{id} + chunks subcollection
const store = createChunkedImageStore('flyer_templates');

export const saveFlyerTemplateWithChunks = store.saveWithChunks;
export const loadFlyerTemplateImage = store.loadImage;
export const deleteFlyerTemplateWithChunks = store.deleteWithChunks;
