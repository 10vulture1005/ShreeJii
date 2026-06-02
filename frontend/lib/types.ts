export interface Product {
  id: string
  name: string
  category: "sarees" | "indo-western" | "bridal" | "festive" | "ethnic" | "party-wear"
  price: number
  originalPrice?: number
  images: string[]
  description: string
  fabric: string
  sizes: string[]
  colors: string[]
  featured?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
  selectedSize: string
  selectedColor: string
}
