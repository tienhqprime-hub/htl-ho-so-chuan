import type { MetadataRoute } from 'next';

const baseUrl = 'https://htl-ho-so-chuan.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/kiem-tra`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}
