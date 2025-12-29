import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price
  const discountPercentage = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0

  return (
    <Link href={`/product/${product.id}`}>
      <Card className="group overflow-hidden border-border hover:shadow-xl transition-all duration-300 cursor-pointer h-full">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <Image
            src={product.images[0] || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {hasDiscount && (
            <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">{discountPercentage}% OFF</Badge>
          )}
          {product.featured && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">Featured</Badge>
          )}
        </div>
        <CardContent className="p-4">
          <div className="mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {product.category.replace("-", " ")}
            </p>
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xl font-semibold text-foreground">₹{product.price.toLocaleString()}</p>
            {hasDiscount && (
              <p className="text-sm text-muted-foreground line-through">₹{product.originalPrice?.toLocaleString()}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {product.colors.slice(0, 3).map((color, index) => (
              <span key={index} className="text-xs text-muted-foreground">
                {color}
                {index < Math.min(product.colors.length, 3) - 1 && ","}
              </span>
            ))}
            {product.colors.length > 3 && (
              <span className="text-xs text-muted-foreground">+{product.colors.length - 3}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
