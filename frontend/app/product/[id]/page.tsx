"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { useWishlist } from "@/contexts/wishlist-context"
import { useState, useEffect } from "react"
import type { Product } from "@/lib/types"
import Image from "next/image"
import { ArrowLeft, ShoppingCart, Heart, Share2, Check } from "lucide-react"
import Link from "next/link"
import { ProductCard } from "@/components/product-card"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { cart, addToCart } = useCart()
  const { isLiked, toggleLike } = useWishlist()

  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addedToCart, setAddedToCart] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    api.getProducts()
      .then((data: Product[]) => {
        const found = data.find((p) => p.sku_id === productId) || null
        setProduct(found)
        if (found) {
          setSelectedImage(found.image_url || (found.image_urls && found.image_urls.length > 0 ? found.image_urls[0] : null))
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
    const success = addToCart(product)
    if (success) {
      setAddedToCart(true)
      toast.success("Added to cart")
      setTimeout(() => setAddedToCart(false), 2000)
    } else {
      toast.error("Not enough stock available")
    }
  }

  const isInCart = cart.some((item) => item.product.sku_id === product.sku_id)

  const handleBuyNow = () => {
    if (isInCart) {
      // If already in cart, don't add another one. Just go to cart.
      router.push("/cart")
    } else {
      // If not in cart, add it and go to cart.
      const success = addToCart(product)
      if (success || product.stock_count > 0) {
        router.push("/cart")
      } else {
        toast.error("Product is out of stock")
      }
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard!")
    } catch (err) {
      toast.error("Failed to copy link")
    }
  }

  const liked = isLiked(product.sku_id)

  const allImages = Array.from(new Set([product.image_url, ...(product.image_urls || [])].filter(Boolean))) as string[]
  const displayImage = selectedImage || allImages[0] || "/placeholder.svg"

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
          <div className="flex flex-col items-center md:items-end lg:pr-8 space-y-4">
            <div className="relative aspect-[3/4] w-full max-w-[450px] overflow-hidden rounded-lg bg-muted border border-border/50 shadow-sm">
              <Image
                src={displayImage}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 w-full max-w-[450px] overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`relative w-20 aspect-[3/4] flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                      displayImage === img ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} - ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
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
              {product.stock_count <= 0 ? (
                <div className="bg-destructive/10 text-destructive text-center py-3 rounded-md font-semibold mb-4">
                  Sold Out
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    {!isInCart && (
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
                    )}
                    {isInCart && (
                      <Button onClick={() => router.push("/cart")} className="flex-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground" size="lg">
                        <Check className="mr-2 h-5 w-5" />
                        In Cart (Go to Cart)
                      </Button>
                    )}
                    <Button 
                      onClick={() => toggleLike(product.sku_id)} 
                      variant="outline" 
                      size="lg"
                      className={liked ? "text-red-500 border-red-200 bg-red-50 hover:bg-red-50 hover:text-red-600" : ""}
                    >
                      <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"} />
                    </Button>
                    <Button onClick={handleShare} variant="outline" size="lg">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button onClick={handleBuyNow} variant="outline" className="w-full bg-transparent" size="lg">
                    Buy Now
                  </Button>
                </>
              )}
              <Link href="/contact" className="block">
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
