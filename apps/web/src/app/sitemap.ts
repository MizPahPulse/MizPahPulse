import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://mizpah-pulse.vercel.app', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://mizpah-pulse.vercel.app/dashboard', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://mizpah-pulse.vercel.app/dashboard/feed', lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: 'https://mizpah-pulse.vercel.app/dashboard/analytics', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mizpah-pulse.vercel.app/dashboard/wallets', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mizpah-pulse.vercel.app/dashboard/contracts', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://mizpah-pulse.vercel.app/dashboard/search', lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
  ];
}
