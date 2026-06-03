export interface Product {
  sku_id: string
  name: string
  source_name: string
  clothing_type: string
  color: string
  price: number
  image_url?: string | null
  qr_image_url?: string | null
  stock_count: number
  description?: string
  fabric?: string
  featured?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}
