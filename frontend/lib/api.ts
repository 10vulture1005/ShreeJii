import type { Product } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = {
  getProducts: async (): Promise<Product[]> => {
    const res = await fetch(`${API_URL}/api/products`)
    if (!res.ok) throw new Error("Failed to fetch products")
    return res.json()
  },
  
  login: async (credentials: any) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(credentials),
    })
    if (!res.ok) throw new Error("Failed to login")
    return res.json()
  },
  
  register: async (data: any) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to register")
    }
    return res.json()
  },
  
  getCurrentUser: async (token: string) => {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch user")
    return res.json()
  },
  
  bulkCheckout: async (items: { sku_id: string; quantity_purchased: number }[]) => {
    const res = await fetch(`${API_URL}/api/checkout/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    })
    if (!res.ok) throw new Error("Checkout failed")
    return res.json()
  },
  
  getAdminStats: async (token: string) => {
    const res = await fetch(`${API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch admin stats")
    return res.json()
  },
  
  getAllProductsAdmin: async (token: string): Promise<Product[]> => {
    const res = await fetch(`${API_URL}/api/admin/inventory/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch all products")
    return res.json()
  },
  
  updateProduct: async (token: string, skuId: string, data: any) => {
    if (!token) throw new Error("No token found")
    const res = await fetch(`${API_URL}/api/admin/inventory/product/${skuId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to update product")
    return res.json()
  },
  generateDescription: async (token: string, skuId: string) => {
    if (!token) throw new Error("No token found")
    const res = await fetch(`${API_URL}/api/admin/inventory/product/${skuId}/generate-description`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
    if (!res.ok) throw new Error("Failed to generate description")
    return res.json()
  },
  
  restockProduct: async (token: string, data: any) => {
    const res = await fetch(`${API_URL}/api/admin/inventory/restock`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to restock product")
    return res.json()
  }
}
