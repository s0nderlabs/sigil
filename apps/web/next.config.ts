import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  experimental: {
    proxyTimeout: 300_000, // 5 min — agent flows (Claude API + CRE) can take 60-120s
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    config.externals = [...(config.externals || []), "pino-pretty"];
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
