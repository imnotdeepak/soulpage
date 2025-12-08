import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Disable source maps to avoid parsing errors
  productionBrowserSourceMaps: false,
};

export default nextConfig;
