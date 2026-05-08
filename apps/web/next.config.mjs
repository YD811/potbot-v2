import { createRequire } from 'module'
const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const config = {
  eslint: { ignoreDuringBuilds: true },
  experimental: { externalDir: true },
  transpilePackages: [
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-wallets',
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
