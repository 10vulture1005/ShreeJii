import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/lib/types"
import { Heart } from "lucide-react"
import { useWishlist } from "@/contexts/wishlist-context"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { isLiked, toggleLike } = useWishlist()
  const hasDiscount = false
  const discountPercentage = 0
  
  const liked = isLiked(product.sku_id)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation to product page
    toggleLike(product.sku_id)
  }

  return (
    <Link href={`/product/${product.sku_id}`}>
      <Card className="group overflow-hidden border-border hover:shadow-xl transition-all duration-300 cursor-pointer h-full relative">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <Image
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-contain group-hover:scale-110 transition-transform duration-500"
          />
          {hasDiscount && product.stock_count > 0 && (
            <Badge className="absolute top-3 right-14 bg-accent text-accent-foreground">{discountPercentage}% OFF</Badge>
          )}
          {product.stock_count <= 0 ? (
            <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground">Sold Out</Badge>
          ) : product.featured ? (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">Featured</Badge>
          ) : null}
          
          <button 
            onClick={handleLike}
            className="absolute top-3 right-3 p-2 bg-background/80 hover:bg-background rounded-full transition-colors z-10"
          >
            <Heart 
              className={`h-5 w-5 ${liked ? "text-red-500" : "text-muted-foreground"}`} 
              fill={liked ? "currentColor" : "none"} 
            />
          </button>
        </div>
        <CardContent className="p-4">
          <div className="mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {product.clothing_type.replace("-", " ")}
            </p>
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xl font-semibold text-foreground">₹{product.price.toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">
              {product.color}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
