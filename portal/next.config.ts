import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },

  // Bundle Chainrails so its CSS is processed (avoids "Unknown file extension .css" in external loader)
  transpilePackages: ['@chainrails/react', '@chainrails/sdk', '@chainrails/common'],

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Externalize Reown/WalletConnect packages to prevent SSR bundling issues
  // These packages are client-only and should not be bundled for server-side rendering
  serverExternalPackages: [
    '@reown/appkit',
    '@reown/appkit-react',
    '@reown/appkit-adapter-wagmi',
    '@reown/appkit-polyfills',
    '@reown/appkit-wallet',
    '@wagmi/core',
    'wagmi',
    'viem',
  ],
  // Ensure these packages are treated as external during server builds
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },
};

export default nextConfig;
