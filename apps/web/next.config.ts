import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['zeus'],
  transpilePackages: [
    '@open-design/components',
    '@open-design/contracts',
    '@open-design/model-registry',
  ],
};

export default nextConfig;
