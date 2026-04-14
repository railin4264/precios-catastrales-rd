/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  },
  // Allow Railway and other cloud build systems to pass these at build time
  experimental: {
    // Disable static generation for pages that need runtime env vars
  },
  output: 'standalone',
};

export default nextConfig;
