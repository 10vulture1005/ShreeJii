import { Metadata, ResolvingMetadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProductClient } from "./product-client"
import type { Product } from "@/lib/types"

// Fetch product data on the server
async function getProductData(id: string): Promise<{ product: Product | null, relatedProducts: Product[] }> {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    // Use Next.js fetch with revalidation or cache based on your needs
    const res = await fetch(`${API_URL}/api/products`, { 
      next: { revalidate: 60 } // Revalidate every 60 seconds
    })
    
    if (!res.ok) {
      return { product: null, relatedProducts: [] }
    }
    
    const data: Product[] = await res.json()
    const product = data.find((p) => p.sku_id === id) || null
    let relatedProducts: Product[] = []
    
    if (product) {
      relatedProducts = data
        .filter((p) => p.clothing_type === product.clothing_type && p.sku_id !== product.sku_id)
        .slice(0, 4)
    }
    
    return { product, relatedProducts }
  } catch (error) {
    console.error("Failed to fetch products:", error)
    return { product: null, relatedProducts: [] }
  }
}

type Props = {
  params: Promise<{ id: string }>
}

// Generate dynamic metadata for SEO
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // read route params
  const resolvedParams = await params
  const id = resolvedParams.id
  
  const { product } = await getProductData(id)
  
  if (!product) {
    return {
      title: "Product Not Found | Shree Ji",
      description: "The product you are looking for does not exist.",
    }
  }

  const previousImages = (await parent).openGraph?.images || []
  const productImages = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls 
    : (product.image_url ? [product.image_url] : [])

  return {
    title: `${product.name} | Shree Ji`,
    description: product.description,
    openGraph: {
      title: `${product.name} | Shree Ji`,
      description: product.description,
      images: [...productImages, ...previousImages],
      type: 'website',
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const resolvedParams = await params
  const { product, relatedProducts } = await getProductData(resolvedParams.id)

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-32 text-center">
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">The product you're looking for doesn't exist.</p>
          <Link href="/collections">
            <Button>Back to Collections</Button>
          </Link>
        </div>
        <Footer />
      </main>
    )
  }
  
  const productImages = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls 
    : (product.image_url ? [product.image_url] : [])
    
  const mainImage = productImages.length > 0 ? productImages[0] : ''

  // Structured Data (JSON-LD) for SEO Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: productImages,
    sku: product.sku_id,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability: product.stock_count > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <div className="container mx-auto px-4 py-24">
        <Link href="/collections" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Collections
        </Link>
        
        <ProductClient product={product} relatedProducts={relatedProducts} />
      </div>
      <Footer />
    </main>
  )
}
