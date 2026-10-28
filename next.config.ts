import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets a phone or iPad on the home Wi-Fi load the dev server's scripts.
  allowedDevOrigins: ["192.168.1.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
