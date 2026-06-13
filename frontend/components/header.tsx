"use client"

import Link from "next/link"
import { ShoppingBag, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { useWishlist } from "@/contexts/wishlist-context"
import { useState } from "react"

export function Header() {
  const { getCartCount, clearCart } = useCart()
  const { clearWishlist } = useWishlist()
  const { user, logout } = useAuth()
  const cartCount = getCartCount()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-serif font-semibold tracking-wide text-foreground">Shree Ji</div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/collections" className="text-sm text-foreground hover:text-primary transition-colors">
            Collections
          </Link>
          <Link href="/about" className="text-sm text-foreground hover:text-primary transition-colors">
            About
          </Link>
          <Link href="/contact" className="text-sm text-foreground hover:text-primary transition-colors">
            Contact
          </Link>
          {user?.role === "admin" && (
            <Link href="/admin" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <Button variant="ghost" className="hidden md:inline-flex text-sm" onClick={() => {
              clearCart()
              clearWishlist()
              logout()
            }}>
              Logout
            </Button>
          ) : (
            <Link href="/login" className="hidden md:inline-flex">
              <Button variant="ghost" className="text-sm">Sign In</Button>
            </Link>
          )}
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="text-foreground relative">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <span className="sr-only">Shopping bag</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="md:hidden bg-background border-t border-border">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link
              href="/collections"
              className="text-sm text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Collections
            </Link>
            <Link
              href="/about"
              className="text-sm text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-foreground hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Panel
              </Link>
            )}
            {user ? (
              <button
                className="text-sm text-left text-foreground hover:text-primary transition-colors"
                onClick={() => {
                  clearCart()
                  clearWishlist()
                  logout()
                  setMobileMenuOpen(false)
                }}
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm text-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
