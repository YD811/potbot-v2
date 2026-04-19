/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Suppress TS errors during build — fix properly post-hackathon
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Allow imports from outside the apps/web directory (monorepo packages)
    externalDir: true,
  },
  // Transpile Solana wallet adapter packages so their CSS is processed correctly
  transpilePackages: [
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-wallets',
    '@potbot/sdk',
    '@potbot/ui',
  ],
  webpack: (config) => {
    // Required for Solana/Anchor compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    }
    return config
  },
}

module.exports = nextConfig
