import { createRequire } from 'module'
const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@potbot/sdk', '@potbot/ui'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'bs58': require.resolve('bs58'),
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
      stream: false,
      zlib: false,
      net: false,
      tls: false,
      toml: false,
    }

    return config
  },
}

export default config
