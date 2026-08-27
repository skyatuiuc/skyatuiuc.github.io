/**
 * Hero Background Gallery Configuration
 * 
 * To add your own photos:
 * 1. Place your image files in the `/public/assets/gallery/` folder (e.g. `photo1.jpg`, `photo2.jpg`).
 * 2. Update or add entries to the `HERO_GALLERY_IMAGES` array below.
 * 3. Supported formats: .jpg, .jpeg, .png, .webp, .avif
 */

export const getGalleryAsset = (filename) => `/assets/gallery/${filename}`;

export const HERO_GALLERY_IMAGES = [
  {
    id: 'slide-1',
    src: getGalleryAsset('photo1.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=2000&q=80',
    title: 'SKY Breathwork & Meditation',
    caption: 'Deep calm, mental clarity, and autonomic stress regulation'
  },
  {
    id: 'slide-2',
    src: getGalleryAsset('photo2.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=2000&q=80',
    title: 'Friends that become family',
    caption: 'Building lasting friendships and global community'
  },
  {
    id: 'slide-3',
    src: getGalleryAsset('photo3.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=2000&q=80',
    title: 'Community',
    caption: 'Building a strong loving community on campus and beyond.'
  },
  {
    id: 'slide-4',
    src: getGalleryAsset('photo4.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=2000&q=80',
    title: 'Interactive Sessions',
    caption: 'Experiential learning and fun activities'
  },
  {
    id: 'slide-5',
    src: getGalleryAsset('photo5.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=2000&q=80',
    title: 'Fun and Celebration',
    caption: 'Always striving to Make Life a Celebration'
  },
  {
    id: 'slide-6',
    src: getGalleryAsset('photo6.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=2000&q=80',
    title: 'Fun and Celebration',
    caption: 'Always striving to Make Life a Celebration'
  },
  {
    id: 'slide-7',
    src: getGalleryAsset('photo7.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=2000&q=80',
    title: 'Volunteering and Service',
    caption: 'A loving team of volunteers to spread the joy across campus'
  },
  {
    id: 'slide-8',
    src: getGalleryAsset('photo8.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=80',
    title: 'UIUC Student Community',
    caption: 'Over 500+ Students trained!'
  }
];

export const GALLERY_AUTO_ROTATE_INTERVAL_MS = 6000; // 6 seconds per photo
