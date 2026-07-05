import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Keep Node-only libs out of the bundle (nodemailer requires 'stream' etc.).
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
