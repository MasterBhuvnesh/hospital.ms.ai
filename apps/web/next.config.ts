import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // apps/web is deliberately excluded from the monorepo package manager
  // workspace; keep Next from inferring the repo root via its lockfile.
  outputFileTracingRoot: path.join(import.meta.dirname),
};

export default nextConfig;
