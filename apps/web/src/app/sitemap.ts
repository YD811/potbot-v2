import type { MetadataRoute } from 'next'

const PAGES: [string, number, 'daily' | 'weekly' | 'monthly'][] = [
  ['', 1, 'daily'],
  ['/portfolios', 0.9, 'daily'],
  ['/portfolios/new', 0.7, 'weekly'],
  ['/learn', 0.8, 'weekly'],
  ['/roadmap', 0.8, 'weekly'],
  ['/careers', 0.7, 'weekly'],
  ['/integrate', 0.7, 'weekly'],
  ['/status', 0.6, 'weekly'],
  ['/mainnet', 0.6, 'weekly'],
  ['/faq', 0.6, 'monthly'],
  ['/docs', 0.5, 'monthly'],
  ['/signup', 0.7, 'monthly'],
  ['/worldsfair', 0.5, 'monthly'],
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PAGES.map(([path, priority, changeFrequency]) => ({ url: `https://potbot.fun${path}`, lastModified, changeFrequency, priority }))
}
