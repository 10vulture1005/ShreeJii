"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react"

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4 py-32">
        <div className="max-w-md mx-auto text-center">
          {/* Success Animation */}
          <div className="relative inline-flex items-center justify-center w-28 h-28 mb-8">
            <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-green-500/15 border-2 border-green-500/30">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
            </div>
          </div>

          <h1 className="text-4xl font-serif font-semibold text-foreground mb-4">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground text-lg mb-2">
            Thank you for shopping with Shree Ji.
          </p>
          <p className="text-muted-foreground mb-10">
            Your payment was successful and your order is being prepared. You will receive a confirmation shortly.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/collections">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="gap-2 bg-transparent w-full sm:w-auto">
                Need Help?
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
