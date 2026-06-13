"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { useWishlist } from "@/contexts/wishlist-context"
import type { Product } from "@/lib/types"
import Image from "next/image"
import { ShoppingCart, Heart, Share2, Check } from "lucide-react"
import Link from "next/link"
import { ProductCard } from "@/components/product-card"
import { toast } from "sonner"

export function ProductClient({ 
  product, 
  relatedProducts 
}: { 
  product: Product, 
  relatedProducts: Product[] 
}) {
  const router = useRouter()
  const { cart, addToCart } = useCart()
  const { isLiked, toggleLike } = useWishlist()

  const [addedToCart, setAddedToCart] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(
    product.image_url || (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : null)
  )

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
      router.push("/cart")
    } else {
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
    <>
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
    </>
  )
}
