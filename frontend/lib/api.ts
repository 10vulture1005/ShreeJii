import type { Product, Address } from "./types"

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

  // ── Cart Synchronization ────────────────────────────────────────

  getUserCart: async (token: string) => {
    const res = await fetch(`${API_URL}/api/user/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch cart")
    return res.json()
  },

  saveUserCart: async (token: string, cart: any[]) => {
    const res = await fetch(`${API_URL}/api/user/cart`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cart }),
    })
    if (!res.ok) throw new Error("Failed to save cart")
    return res.json()
  },

  // ── Wishlist Synchronization ──────────────────────────────────────

  getUserWishlist: async (token: string) => {
    const res = await fetch(`${API_URL}/api/user/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch wishlist")
    return res.json()
  },

  saveUserWishlist: async (token: string, wishlist: string[]) => {
    const res = await fetch(`${API_URL}/api/user/wishlist`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ wishlist }),
    })
    if (!res.ok) throw new Error("Failed to save wishlist")
    return res.json()
  },

  // ── Address Management ──────────────────────────────────────────

  getAddresses: async (token: string): Promise<Address[]> => {
    const res = await fetch(`${API_URL}/api/user/address`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to fetch addresses")
    }
    return res.json()
  },

  addAddress: async (token: string, data: Omit<Address, "id">): Promise<Address> => {
    const res = await fetch(`${API_URL}/api/user/address`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to save address")
    }
    return res.json()
  },

  // ── Checkout ────────────────────────────────────────────────────
  
  bulkCheckout: async (items: { sku_id: string; quantity_purchased: number }[]) => {
    const res = await fetch(`${API_URL}/api/checkout/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    })
    if (!res.ok) throw new Error("Checkout failed")
    return res.json()
  },
  
  // ── Admin ───────────────────────────────────────────────────────

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
  },

  // ── Payment (Razorpay) ─────────────────────────────────────────

  createRazorpayOrder: async (
    token: string,
    items: { sku_id: string; quantity: number; price: number }[],
    deliveryCharge: number,
    addressId: string,
  ) => {
    const res = await fetch(`${API_URL}/api/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items,
        delivery_charge: deliveryCharge,
        address_id: addressId,
      }),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to create payment order")
    }
    return res.json()
  },

  createTestRazorpayOrder: async () => {
    const res = await fetch(`${API_URL}/api/payment/create-test-order`, {
      method: "POST",
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to create test payment order")
    }
    return res.json()
  },

  verifyPayment: async (
    token: string,
    data: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    },
  ) => {
    const res = await fetch(`${API_URL}/api/payment/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || "Payment verification failed")
    }
    return res.json()
  },
}
