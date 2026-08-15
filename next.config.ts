import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.100.10.34", "100.92.7.44"],
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
