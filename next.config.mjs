/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: Static export ('output: export') disabled due to dynamic routes (/subject/[id])
  // For Capacitor, use live reload mode during development (server.url in capacitor.config.ts)
  // For production: host on Vercel and configure Capacitor to load from that URL

  // Optimize package imports for tree-shaking
  // This transforms barrel file imports to direct imports at build time
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-avatar',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-separator',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      'date-fns',
      'framer-motion',
      'cmdk',
      'react-day-picker',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
  },

  // Enable React strict mode for catching issues
  reactStrictMode: true,

  // Compiler options
  compiler: {
    // Remove console.log in production (keep error and warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
