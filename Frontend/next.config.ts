import type { NextConfig } from "next";

// Proxies frontend -> backend so calls stay same-origin (no CORS, no exposed URL).
// API_URL points to the deployed Express API in production and localhost:4000 locally.
const API_URL = process.env.API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
