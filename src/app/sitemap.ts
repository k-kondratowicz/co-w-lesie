import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
