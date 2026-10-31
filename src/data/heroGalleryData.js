/**
 * Hero Background Gallery Configuration
 * 
 * To add your own photos:
 * 1. Place your image files in the `/public/assets/gallery/` folder (e.g. `photo1.webp`, `photo2.webp`).
 * 2. Update or add entries to the `HERO_GALLERY_IMAGES` array below.
 * 3. Supported formats: .webp, .avif, .jpg, .jpeg, .png
 */

export const getGalleryAsset = (filename) => `/assets/gallery/${filename}`;

export const HERO_GALLERY_IMAGES = [
  {
    id: 'slide-1',
    src: getGalleryAsset('photo1.webp'),
    title: 'SKY Breathwork & Meditation',
    caption: 'Deep calm, mental clarity, and autonomic stress regulation'
  },
  {
    id: 'slide-2',
    src: getGalleryAsset('photo2.webp'),
    title: 'Friends that become family',
    caption: 'Building lasting friendships and global community'
  },
  {
    id: 'slide-3',
    src: getGalleryAsset('photo3.webp'),
    title: 'Community',
    caption: 'Building a strong loving community on campus and beyond.'
  },
  {
    id: 'slide-4',
    src: getGalleryAsset('photo4.webp'),
    title: 'Interactive Sessions',
    caption: 'Experiential learning and fun activities'
  },
  {
    id: 'slide-5',
    src: getGalleryAsset('photo5.webp'),
    title: 'Fun and Celebration',
    caption: 'Always striving to Make Life a Celebration'
  },
  {
    id: 'slide-6',
    src: getGalleryAsset('photo6.webp'),
    title: 'Fun and Celebration',
    caption: 'Always striving to Make Life a Celebration'
  },
  {
    id: 'slide-7',
    src: getGalleryAsset('photo7.webp'),
    title: 'Volunteering and Service',
    caption: 'A loving team of volunteers to spread the joy across campus'
  },
  {
    id: 'slide-8',
    src: getGalleryAsset('photo8.webp'),
    title: 'UIUC Student Community',
    caption: 'Over 500+ Students trained!'
  }
];

export const GALLERY_AUTO_ROTATE_INTERVAL_MS = 6000; // 6 seconds per photo
