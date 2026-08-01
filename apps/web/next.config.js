/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@mizpah-pulse/types',
    '@mizpah-pulse/ui',
    '@mizpah-pulse/database',
    '@mizpah-pulse/stellar',
  ],
  experimental: {
    optimizePackageImports: [
      '@mizpah-pulse/ui',
      'lucide-react',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
