"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { useState, useEffect } from "react"
import type { Product } from "@/lib/types"
import Image from "next/image"
import { ArrowLeft, ShoppingCart, Heart, Share2, Check } from "lucide-react"
import Link from "next/link"
import { ProductCard } from "@/components/product-card"
import { api } from "@/lib/api"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToCart } = useCart()

  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    api.getProducts()
      .then((data: Product[]) => {
        const found = data.find((p) => p.sku_id === productId) || null
        setProduct(found)
        if (found) {
          setRelatedProducts(
            data
              .filter(
                (p) => p.clothing_type === found.clothing_type && p.sku_id !== found.sku_id
              )
              .slice(0, 4)
          )
        }
        setIsLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setIsLoading(false)
      })
  }, [productId])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-32 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product...</p>
        </div>
        <Footer />
      </main>
    )
  }

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

  const hasDiscount = false
  const discountPercentage = 0

  const handleAddToCart = () => {
    addToCart(product)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleBuyNow = () => {
    addToCart(product)
    router.push("/cart")
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-24">
        {/* Back Button */}
        <Link href="/collections" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Collections
        </Link>

        {/* Product Details */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
              <Image
                src={product.image_url || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
                {product.clothing_type.replace("-", " ")}
              </p>
              <h1 className="text-4xl font-serif font-semibold text-foreground mb-4">{product.name}</h1>

              <div className="flex items-center gap-3 mb-4">
                <p className="text-3xl font-semibold text-foreground">₹{product.price.toLocaleString()}</p>
              </div>

              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>

            {/* Fabric Info */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">Fabric</h3>
              <p className="text-muted-foreground">{product.fabric}</p>
            </div>

            {/* Color Info */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">Color</h3>
              <p className="text-muted-foreground">{product.color}</p>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-border pt-6 space-y-3">
              <div className="flex gap-3">
                <Button onClick={handleAddToCart} className="flex-1 bg-primary hover:bg-primary/90" size="lg">
                  {addedToCart ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Add to Cart
                    </>
                  )}
                </Button>
                <Button variant="outline" size="lg">
                  <Heart className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
              <Button onClick={handleBuyNow} variant="outline" className="w-full bg-transparent" size="lg">
                Buy Now
              </Button>
              <Link href="/contact">
                <Button variant="ghost" className="w-full" size="lg">
                  Request Custom Order
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="border-t border-border pt-16">
            <h2 className="text-3xl font-serif font-semibold text-foreground mb-8">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.sku_id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  )
}
