import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse bundles a Node-only test file; keep it out of the client bundle.
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
};

export default nextConfig;
