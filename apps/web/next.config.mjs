import { createRequire } from 'module'
const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const config = {
  experimental: { externalDir: true },
  // Old v2 routes: nothing 404s, every old link lands on the live product.
  async redirects() {
    return [
      // v2 vault product, retired: the live product is POTFolio. Source kept for reference.
      { source: '/pots', destination: '/portfolios', permanent: true },
      { source: '/pots/:path*', destination: '/portfolios', permanent: true },
      { source: '/my-pots', destination: '/portfolios', permanent: true },
      { source: '/vaults', destination: '/portfolios', permanent: true },
      { source: '/vaults/:path*', destination: '/portfolios', permanent: true },
      { source: '/create', destination: '/portfolios/new', permanent: true },
      { source: '/leaderboard', destination: '/portfolios', permanent: true },
      { source: '/for-agents', destination: '/integrate', permanent: true },
      { source: '/beta', destination: '/signup', permanent: true },
      { source: '/pricing', destination: '/learn', permanent: true },
    ]
  },
  transpilePackages: [
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-phantom',
    '@solana/wallet-adapter-solflare',
    '@potbot/sdk',
    '@potbot/ui',
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'bs58': require.resolve('bs58'),
      // pino is pulled in transitively by @walletconnect/logger but only
      // tries to require pino-pretty at runtime when NODE_ENV=development.
      // Stub it to false so webpack doesn't emit a "Module not found"
      // warning during the production build.
      'pino-pretty': false,
      // @privy-io/react-auth has an optional dynamic import for the
      // Farcaster mini-app integration. We don't ship that surface, so
      // stub it out to keep webpack from failing the build.
      '@farcaster/mini-app-solana': false,
      // @pythnetwork/solana-utils pulls jito-ts for optional Jito bundles; its nested
      // web3.js breaks the webpack build and we never send bundles from the browser.
      'jito-ts': false,
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, os: false, path: false, crypto: false,
      stream: false, zlib: false, net: false, tls: false, toml: false,
    }
    return config
  },
}
export default config
