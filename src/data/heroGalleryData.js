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
    caption: 'Building a community on campus '
  },
  {
    id: 'slide-4',
    src: getGalleryAsset('photo4.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80',
    title: 'Joyful Connection & Growth',
    caption: 'Energizing breath practices and mindful campus living'
  },
  {
    id: 'slide-5',
    src: getGalleryAsset('photo5.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=2000&q=80',
    title: 'Restful Sleep & Rejuvenation',
    caption: 'Clinical trials show 3x improvement in deep sleep cycles'
  },
  {
    id: 'slide-6',
    src: getGalleryAsset('photo6.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2000&q=80',
    title: 'Campus Leadership & Teamwork',
    caption: 'Empowering student leaders across campus'
  },
  {
    id: 'slide-7',
    src: getGalleryAsset('photo7.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2000&q=80',
    title: 'Community Connection',
    caption: 'Supportive space for mental health and lifelong friendships'
  },
  {
    id: 'slide-8',
    src: getGalleryAsset('photo8.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=2000&q=80',
    title: 'Mindfulness & Meditation',
    caption: 'Tools for focus, emotional balance, and clarity'
  },
  {
    id: 'slide-9',
    src: getGalleryAsset('photo9.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=2000&q=80',
    title: 'Campus Happiness Workshops',
    caption: 'Experiential learning for inner peace and high performance'
  },
  {
    id: 'slide-10',
    src: getGalleryAsset('photo10.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=2000&q=80',
    title: 'UIUC Student Community',
    caption: 'Over 500 Illini students trained in SKY techniques'
  },
  {
    id: 'slide-11',
    src: getGalleryAsset('photo11.jpg'),
    fallbackSrc: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=80',
    title: 'Celebration & Graduation',
    caption: 'Celebrating transformation and campus resilience'
  }
];

export const GALLERY_AUTO_ROTATE_INTERVAL_MS = 6000; // 6 seconds per photo
