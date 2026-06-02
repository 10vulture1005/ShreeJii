"use client"

import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/contexts/cart-context"
import { getProductById, products } from "@/lib/products-data"
import { useState } from "react"
import Image from "next/image"
import { ArrowLeft, ShoppingCart, Heart, Share2, Check } from "lucide-react"
import Link from "next/link"
import { ProductCard } from "@/components/product-card"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToCart } = useCart()

  const productId = params.id as string
  const product = getProductById(productId)

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState("")
  const [selectedColor, setSelectedColor] = useState("")
  const [addedToCart, setAddedToCart] = useState(false)

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

  const hasDiscount = product.originalPrice && product.originalPrice > product.price
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0

  const relatedProducts = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      alert("Please select size and color")
      return
    }

    addToCart(product, selectedSize, selectedColor)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleBuyNow = () => {
    if (!selectedSize || !selectedColor) {
      alert("Please select size and color")
      return
    }

    addToCart(product, selectedSize, selectedColor)
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
                src={product.images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
              />
              {hasDiscount && (
                <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground text-sm">
                  {discountPercentage}% OFF
                </Badge>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square overflow-hidden rounded-md border-2 transition-all ${
                      selectedImage === index ? "border-primary" : "border-transparent hover:border-border"
                    }`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`${product.name} ${index + 1}`}
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
                {product.category.replace("-", " ")}
              </p>
              <h1 className="text-4xl font-serif font-semibold text-foreground mb-4">{product.name}</h1>

              <div className="flex items-center gap-3 mb-4">
                <p className="text-3xl font-semibold text-foreground">₹{product.price.toLocaleString()}</p>
                {hasDiscount && (
                  <p className="text-xl text-muted-foreground line-through">
                    ₹{product.originalPrice?.toLocaleString()}
                  </p>
                )}
              </div>

              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>

            {/* Fabric Info */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">Fabric</h3>
              <p className="text-muted-foreground">{product.fabric}</p>
            </div>

            {/* Size Selection */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Select Size</h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSize(size)}
                    className={selectedSize === size ? "bg-primary text-primary-foreground" : ""}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Select Color</h3>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <Button
                    key={color}
                    variant={selectedColor === color ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedColor(color)}
                    className={selectedColor === color ? "bg-primary text-primary-foreground" : ""}
                  >
                    {color}
                  </Button>
                ))}
              </div>
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
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  )
}
