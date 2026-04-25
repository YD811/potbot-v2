import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: 'https://potbot.fun', lastModified, changeFrequency: 'daily', priority: 1 },
    { url: 'https://potbot.fun/vaults', lastModified, changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://potbot.fun/leaderboard', lastModified, changeFrequency: 'daily', priority: 0.8 },
    { url: 'https://potbot.fun/create', lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://potbot.fun/for-agents', lastModified, changeFrequency: 'weekly', priority: 0.7 },
    { url: 'https://potbot.fun/signup', lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://potbot.fun/status', lastModified, changeFrequency: 'daily', priority: 0.6 },
    { url: 'https://potbot.fun/hackathon', lastModified, changeFrequency: 'monthly', priority: 0.6 },
  ]
}
