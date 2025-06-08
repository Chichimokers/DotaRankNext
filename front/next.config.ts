import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  basePath: '/ranking',
  assetPrefix:'/ranking/',
  trailingSlash: true,
   images: {
    domains: ['avatars.steamstatic.com'],
  },
};

export default nextConfig;
