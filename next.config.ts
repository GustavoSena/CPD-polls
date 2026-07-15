import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Proposals can carry several images (up to 4 MB each).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
