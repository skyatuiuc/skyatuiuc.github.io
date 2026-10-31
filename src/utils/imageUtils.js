// Shared by the template studios: read an uploaded image file into a data URL plus its natural size.

/**
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, image: HTMLImageElement, width: number, height: number }>}
 */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type).startsWith('image/')) {
      reject(new Error('Please upload an image file (PNG, JPG or WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = () => {
      const dataUrl = reader.result;
      const image = new Image();
      image.onload = () => resolve({ dataUrl, image, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
      image.onerror = () => reject(new Error('That file could not be opened as an image.'));
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
