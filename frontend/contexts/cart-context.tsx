"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { CartItem, Product } from "@/lib/types"
import { useAuth } from "./auth-context"
import { api } from "@/lib/api"

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: Product) => boolean
  removeFromCart: (sku_id: string) => void
  updateQuantity: (sku_id: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const { token } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("shreeji-cart")
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error("Failed to parse local cart", e)
      }
    }
    setIsInitialized(true)
  }, [])

  // Sync with backend when token becomes available
  useEffect(() => {
    if (token && isInitialized) {
      api.getUserCart(token).then((res) => {
        if (res.cart) {
          setCart((prevCart) => {
            if (prevCart.length === 0) return res.cart
            
            // Merge logic: keep local cart items, add missing backend items
            const merged = [...prevCart]
            let changed = false
            for (const bItem of res.cart) {
              if (!merged.find(i => i.product.sku_id === bItem.product.sku_id)) {
                merged.push(bItem)
                changed = true
              }
            }
            return changed ? merged : prevCart
          })
        }
      }).catch(console.error)
    }
  }, [token, isInitialized])

  // Save cart to localStorage AND backend whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("shreeji-cart", JSON.stringify(cart))
      if (token) {
        api.saveUserCart(token, cart).catch(console.error)
      }
    }
  }, [cart, token, isInitialized])

  const addToCart = (product: Product): boolean => {
    let success = false
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.sku_id === product.sku_id,
      )

      if (existingItem) {
        if (existingItem.quantity >= product.stock_count) {
          success = false
          return prevCart
        }
        success = true
        return prevCart.map((item) =>
          item.product.sku_id === product.sku_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      if (product.stock_count <= 0) {
        success = false
        return prevCart
      }
      success = true
      return [...prevCart, { product, quantity: 1 }]
    })
    return success
  }

  const removeFromCart = (sku_id: string) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) => item.product.sku_id !== sku_id,
      ),
    )
  }

  const updateQuantity = (sku_id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(sku_id)
      return
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.sku_id === sku_id) {
          if (quantity > item.product.stock_count) return item; // Prevent exceeding stock
          return { ...item, quantity }
        }
        return item
      }),
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
