"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useState, useEffect } from "react"
import type { Product } from "@/lib/types"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

const categories = [
  { id: "all", label: "All" },
  { id: "sarees", label: "Sarees" },
  { id: "indo-western", label: "Indo-Western" },
  { id: "bridal", label: "Bridal" },
  { id: "festive", label: "Festive" },
  { id: "ethnic", label: "Ethnic Wear" },
  { id: "party-wear", label: "Party Wear" },
  { id: "others", label: "Others" },
]

const priceRanges = [
  { id: "all", label: "All Prices" },
  { id: "0-5000", label: "Under ₹5,000", min: 0, max: 5000 },
  { id: "5000-10000", label: "₹5,000 - ₹10,000", min: 5000, max: 10000 },
  { id: "10000-20000", label: "₹10,000 - ₹20,000", min: 10000, max: 20000 },
  { id: "20000+", label: "Above ₹20,000", min: 20000, max: Number.POSITIVE_INFINITY },
]

export default function CollectionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedPriceRange, setSelectedPriceRange] = useState("all")
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.getProducts()
      .then((data) => {
        setProducts(data)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err)
        setIsLoading(false)
      })
  }, [])

  const filteredProducts = products.filter((product) => {
    const predefined = ["sarees", "indo-western", "bridal", "festive", "ethnic", "party-wear"]
    let categoryMatch = false
    
    if (selectedCategory === "all") {
      categoryMatch = true
    } else if (selectedCategory === "others") {
      categoryMatch = !predefined.includes(product.clothing_type)
    } else {
      categoryMatch = product.clothing_type === selectedCategory
    }

    let priceMatch = true
    if (selectedPriceRange !== "all") {
      const range = priceRanges.find((r) => r.id === selectedPriceRange)
      if (range && "min" in range && "max" in range) {
        priceMatch = product.price >= range.min! && product.price <= range.max!
      }
    }

    const searchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        product.clothing_type.toLowerCase().includes(searchQuery.toLowerCase())

    return categoryMatch && priceMatch && searchMatch
  })

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-serif font-semibold text-center text-foreground mb-4">
            Our Collections
          </h1>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto text-lg">
            Explore our curated selection of elegant women's clothing, from traditional sarees to contemporary
            indo-western wear
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6">
            {/* Search Bar */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Search</h3>
              <div className="relative max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-8 bg-background border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={
                      selectedCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Price Range</h3>
              <div className="flex flex-wrap gap-2">
                {priceRanges.map((range) => (
                  <Button
                    key={range.id}
                    variant={selectedPriceRange === range.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPriceRange(range.id)}
                    className={
                      selectedPriceRange === range.id
                        ? "bg-primary text-primary-foreground"
                        : "border-border hover:border-primary"
                    }
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground text-lg">Loading collection...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.sku_id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">No products found matching your filters</p>
              <Button
                onClick={() => {
                  setSelectedCategory("all")
                  setSelectedPriceRange("all")
                  setSearchQuery("")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
