"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface WishlistContextType {
  wishlist: string[]
  toggleLike: (sku_id: string) => void
  isLiked: (sku_id: string) => boolean
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([])

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const savedWishlist = localStorage.getItem("shreeji-wishlist")
    if (savedWishlist) {
      setWishlist(JSON.parse(savedWishlist))
    }
  }, [])

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("shreeji-wishlist", JSON.stringify(wishlist))
  }, [wishlist])

  const toggleLike = (sku_id: string) => {
    setWishlist((prev) => {
      if (prev.includes(sku_id)) {
        return prev.filter((id) => id !== sku_id)
      }
      return [...prev, sku_id]
    })
  }

  const isLiked = (sku_id: string) => {
    return wishlist.includes(sku_id)
  }

  return (
    <WishlistContext.Provider value={{ wishlist, toggleLike, isLiked }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}
