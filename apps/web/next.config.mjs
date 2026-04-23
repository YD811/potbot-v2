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
      // `bigint-buffer` is a native addon pulled in transitively by
      // @solana/spl-token → @solana/buffer-layout-utils. Web-side callers
      // (SnsModal / TamagotchiNftModal / TokenizeSharesModal via @potbot/sdk)
      // don't hit the code paths that need it, so stub it out to avoid a
      // Module-not-found build error.
      'bigint-buffer': false,
    }

    return config
  },
}

export default config
