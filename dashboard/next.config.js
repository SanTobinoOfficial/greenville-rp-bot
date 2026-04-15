const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
  },
};

module.exports = nextConfig;
