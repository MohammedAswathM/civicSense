const disablePWA = process.env.NODE_ENV === 'development' || process.env.NEXT_DISABLE_PWA === 'true';

const withPWA = disablePWA
  ? (config) => config
  : require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'firebase-storage',
            expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
      ],
    });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
