
import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/Network-Intrusion-ML" : "";

const nextConfig: NextConfig = {
  output: "export",
  allowedDevOrigins: ["10.7.22.84"],
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
