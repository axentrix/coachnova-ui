// next.config.js
const repo = 'coachnova-ui';             // e.g. "coachnova"
const isPages = process.env.GITHUB_PAGES === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only enable static export when explicitly building for GitHub Pages
  output: isPages ? 'export' : undefined,
  // trailingSlash only needed for Pages
  trailingSlash: isPages ? true : false,

  // Only prepend /<repo> when building for Pages
  basePath: isPages ? `/${repo}` : '',
  assetPrefix: isPages ? `/${repo}/` : '',
  env: {
    // Use this for manual asset URLs in <img src=""> etc.
    NEXT_PUBLIC_BASE_PATH: isPages ? `/${repo}` : '',
  },
};

module.exports = nextConfig;
