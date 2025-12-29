import type { Product } from "./types"

export const products: Product[] = [
  {
    id: "saree-001",
    name: "Royal Silk Saree",
    category: "sarees",
    price: 8999,
    originalPrice: 12999,
    images: ["/elegant-silk-saree-pastel-pink.jpg"],
    description:
      "Exquisite handwoven silk saree with intricate gold zari work. Perfect for weddings and special occasions.",
    fabric: "Pure Silk",
    sizes: ["Free Size"],
    colors: ["Pink", "Peach", "Gold"],
    featured: true,
  },
  {
    id: "saree-002",
    name: "Banarasi Elegance",
    category: "sarees",
    price: 15999,
    images: ["/banarasi-saree-cream-gold.jpg"],
    description: "Traditional Banarasi saree with classic motifs and rich gold border.",
    fabric: "Banarasi Silk",
    sizes: ["Free Size"],
    colors: ["Cream", "Beige", "Gold"],
    featured: true,
  },
  {
    id: "indo-001",
    name: "Contemporary Kurti Set",
    category: "indo-western",
    price: 4999,
    images: ["/modern-kurti-set-pastel.jpg"],
    description: "Modern kurti with palazzo pants, perfect blend of comfort and style.",
    fabric: "Cotton Silk",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Peach", "Mint", "Lavender"],
    featured: true,
  },
  {
    id: "indo-002",
    name: "Designer Gown",
    category: "indo-western",
    price: 7999,
    images: ["/designer-gown-elegant-pastel.jpg"],
    description: "Elegant floor-length gown with embroidered bodice and flowing silhouette.",
    fabric: "Georgette",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blush Pink", "Ivory", "Champagne"],
  },
  {
    id: "bridal-001",
    name: "Bridal Lehenga Set",
    category: "bridal",
    price: 45999,
    images: ["/bridal-lehenga-red-gold.jpg"],
    description: "Stunning bridal lehenga with heavy embroidery and intricate handwork.",
    fabric: "Silk with Zari Work",
    sizes: ["Custom"],
    colors: ["Red", "Maroon", "Pink"],
    featured: true,
  },
  {
    id: "bridal-002",
    name: "Wedding Ensemble",
    category: "bridal",
    price: 38999,
    images: ["/wedding-dress-peach-gold.jpg"],
    description: "Complete bridal outfit with lehenga, choli, and dupatta in pastel tones.",
    fabric: "Raw Silk",
    sizes: ["Custom"],
    colors: ["Peach", "Gold", "Ivory"],
  },
  {
    id: "festive-001",
    name: "Festive Anarkali",
    category: "festive",
    price: 6999,
    images: ["/anarkali-suit-festive-gold.jpg"],
    description: "Gorgeous anarkali suit with embellished yoke and flowing silhouette.",
    fabric: "Georgette",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Gold", "Red", "Green"],
  },
  {
    id: "ethnic-001",
    name: "Chanderi Suit Set",
    category: "ethnic",
    price: 5499,
    images: ["/chanderi-suit-traditional.jpg"],
    description: "Traditional chanderi suit with dupatta, perfect for ethnic occasions.",
    fabric: "Chanderi Cotton",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Cream", "Mint", "Peach"],
    featured: true,
  },
  {
    id: "party-001",
    name: "Cocktail Dress",
    category: "party-wear",
    price: 8499,
    images: ["/cocktail-dress-elegant-shimmer.jpg"],
    description: "Shimmering cocktail dress with contemporary cut and elegant draping.",
    fabric: "Sequin Georgette",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Champagne", "Rose Gold", "Silver"],
    featured: true,
  },
]

export const featuredProducts = products.filter((p) => p.featured)

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getProductsByCategory(category: Product["category"]): Product[] {
  return products.filter((p) => p.category === category)
}
