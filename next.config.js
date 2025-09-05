// next.config.js
const repo = 'coachnova-ui';

// Only enable GitHub Pages mode when explicitly requested
// This prevents accidental activation during development
const isPages = process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Auto-configure for GitHub Pages when detected
  output: isPages ? 'export' : undefined,
  trailingSlash: isPages ? true : false,
  
  // Dynamic basePath and assetPrefix
  basePath: isPages ? `/${repo}` : '',
  assetPrefix: isPages ? `/${repo}/` : '',
  
  env: {
    // Make base path available to components
    NEXT_PUBLIC_BASE_PATH: isPages ? `/${repo}` : '',
  },
  
  images: {
    domains: ['api.builder.io'],
    // For GitHub Pages, we need to handle images differently
    unoptimized: isPages ? true : false,
  },
};

module.exports = nextConfig;
