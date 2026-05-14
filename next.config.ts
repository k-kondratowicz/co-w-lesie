import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
  },
  compress: true,
};

export default nextConfig;
