
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Essential for browser extensions
  assetPrefix: './', // Ensures relative asset paths
  trailingSlash: false, // Creates cleaner paths (e.g., /page.html)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Required for static export if using next/image
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
