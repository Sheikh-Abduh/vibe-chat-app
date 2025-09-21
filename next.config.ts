import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Webpack configuration to help prevent chunk loading errors
  webpack: (config, { dev, isServer }) => {
    // Add date-fns locale optimization to reduce bundle size
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /^date-fns[\/\\]locale$/,
        new RegExp(`\\.[/\\\\](en-US)[/\\\\]index\\.js$`)
      )
    );

    // Fix module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    if (!dev && !isServer) {
      // Optimize chunk splitting for production
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Create a separate chunk for Radix UI components
          radixui: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 15,
          },
          // Create a separate chunk for vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/](?!@radix-ui[\\/])/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Create a separate chunk for common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  // Experimental features that can help with chunk loading
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'c.tenor.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.tenor.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;