import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Exclude test files and test support utilities from build
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Ignore test support files in production builds
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/test-support/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
    };
    
    return config;
  },
};

export default nextConfig;
