
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Essential for browser extensions
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
  // If your app uses trailing slashes, set this, otherwise Next.js static export might create folder structures
  // that don't work well with extension popup paths (e.g. /page/index.html instead of /page.html)
  // trailingSlash: false, // Set to true or false based on your routing needs, false is often simpler for extensions.
};

export default nextConfig;
