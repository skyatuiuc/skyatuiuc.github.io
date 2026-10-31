import { createChunkedImageStore } from './chunkedImageStore';

// Nametag artwork lives in nametag_templates/{id} + chunks subcollection
const store = createChunkedImageStore('nametag_templates');

export const saveNametagTemplateWithChunks = store.saveWithChunks;
export const loadNametagTemplateImage = store.loadImage;
export const deleteNametagTemplateWithChunks = store.deleteWithChunks;
export const getNametagTemplates = store.listTemplates;
