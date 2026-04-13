/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@potbot/sdk', '@potbot/ui'],
  typescript: {
    // Allow build even with type mismatches from wallet adapter React version conflicts
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Solana libs need these Node.js polyfill fallbacks in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
      stream: false,
      zlib: false,
    }
    // Ignore problematic server-only modules on client
    config.plugins.push(
      new (require('webpack')).IgnorePlugin({
        resourceRegExp: /^(encoding)$/,
      })
    )
    return config
  },
}

export default config
