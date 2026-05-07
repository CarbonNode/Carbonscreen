/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '../../dist/renderer',
  images: {
    unoptimized: true,
  },
  // Disable server-side features for Electron
  trailingSlash: true,
  assetPrefix: './',
};

module.exports = nextConfig;
