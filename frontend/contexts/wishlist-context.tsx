"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth-context"
import { api } from "@/lib/api"

interface WishlistContextType {
  wishlist: string[]
  toggleLike: (sku_id: string) => void
  isLiked: (sku_id: string) => boolean
  clearWishlist: () => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([])
  const { token } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const savedWishlist = localStorage.getItem("shreeji-wishlist")
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (e) {
        console.error("Failed to parse local wishlist", e)
      }
    }
    setIsInitialized(true)
  }, [])

  // Sync with backend when token becomes available
  useEffect(() => {
    if (token && isInitialized) {
      api.getUserWishlist(token).then((res) => {
        if (res.wishlist) {
          setWishlist((prevWishlist) => {
            if (prevWishlist.length === 0) return res.wishlist
            
            // Merge logic: keep local items, add missing backend items
            const merged = [...prevWishlist]
            let changed = false
            for (const bId of res.wishlist) {
              if (!merged.includes(bId)) {
                merged.push(bId)
                changed = true
              }
            }
            return changed ? merged : prevWishlist
          })
        }
      }).catch(console.error)
    }
  }, [token, isInitialized])

  // Save wishlist to localStorage AND backend whenever it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("shreeji-wishlist", JSON.stringify(wishlist))
      if (token) {
        api.saveUserWishlist(token, wishlist).catch(console.error)
      }
    }
  }, [wishlist, token, isInitialized])

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

  const clearWishlist = () => {
    setWishlist([])
  }

  return (
    <WishlistContext.Provider value={{ wishlist, toggleLike, isLiked, clearWishlist }}>
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
