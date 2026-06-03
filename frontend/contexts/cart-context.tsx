"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { CartItem, Product } from "@/lib/types"

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: Product) => void
  removeFromCart: (sku_id: string) => void
  updateQuantity: (sku_id: string, quantity: number) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("shreeji-cart")
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("shreeji-cart", JSON.stringify(cart))
  }, [cart])

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.sku_id === product.sku_id,
      )

      if (existingItem) {
        if (existingItem.quantity >= product.stock_count) return prevCart; // Prevent adding more than stock
        return prevCart.map((item) =>
          item.product.sku_id === product.sku_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      if (product.stock_count <= 0) return prevCart; // Prevent adding out of stock
      return [...prevCart, { product, quantity: 1 }]
    })
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
