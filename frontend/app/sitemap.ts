import { MetadataRoute } from 'next'
import type { Product } from '@/lib/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shreeji.com'
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Fetch all products to dynamically generate sitemap URLs
  let products: Product[] = []
  try {
    const res = await fetch(`${API_URL}/api/products`, { next: { revalidate: 3600 } })
    if (res.ok) {
      products = await res.json()
    }
  } catch (e) {
    console.error("Failed to fetch products for sitemap")
  }

  const productUrls = products.map((product) => ({
    url: `${baseUrl}/product/${product.sku_id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...productUrls,
  ]
}
