import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  trailingSlash: true,
   images: {
    domains: ['avatars.steamstatic.com',"esaki-jrr.com"],
  },
};

export default nextConfig;
