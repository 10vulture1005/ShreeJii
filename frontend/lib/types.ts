export interface Product {
  sku_id: string
  name: string
  source_name: string
  clothing_type: string
  color: string
  price: number
  image_url?: string | null
  image_urls?: string[]
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

export interface Address {
  id: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
}
