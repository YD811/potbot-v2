import { createRequire } from 'module'
const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const config = {
  eslint: { ignoreDuringBuilds: true },
  experimental: { externalDir: true },
  // Serve the documentation at the docs.potbot.fun subdomain.
  // Requires the domain to be attached to this project in Vercel + a DNS
  // CNAME (docs → cname.vercel-dns.com). Once that resolves, the subdomain
  // root renders the /docs page; all asset paths (/_next/*) pass through.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [{ type: 'host', value: 'docs.potbot.fun' }],
          destination: '/docs',
        },
      ],
    }
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
