import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.100.10.34", "100.92.7.44"],
  output: "export",
  trailingSlash: true,
  basePath: isGitHubPages ? "/luckydraw-picker" : "",
  assetPrefix: isGitHubPages ? "/luckydraw-picker/" : "",
};

export default nextConfig;
