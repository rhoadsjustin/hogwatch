import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // HogWatch keeps its agent guidance in the repository root AGENTS.md; the
  // generated per-app copies would duplicate and drift from it.
  agentRules: false,
  // Keeps the dev overlay out of the screenshots used as PR evidence.
  devIndicators: false,
};

export default nextConfig;
