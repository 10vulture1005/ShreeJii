"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useCart } from "@/contexts/cart-context"
import { api } from "@/lib/api"
import Link from "next/link"

function PaymentStatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const transactionId = searchParams?.get("transactionId")
  const { token, isLoading: authLoading } = useAuth()
  const { clearCart } = useCart()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // Wait until auth is loaded
    if (authLoading) return

    if (!token) {
      router.push("/login")
      return
    }

    if (!transactionId) {
      setStatus("error")
      setErrorMessage("No transaction ID found. Payment might not have been initiated.")
      return
    }

    const verifyPayment = async () => {
      try {
        const response = await api.verifyPhonePePayment(token, {
          transaction_id: transactionId,
        })

        if (response.success) {
          clearCart()
          setStatus("success")
        } else {
          setStatus("error")
          setErrorMessage(response.message || "Payment verification failed. It may be pending or failed.")
        }
      } catch (err: any) {
        setStatus("error")
        setErrorMessage(err.message || "Failed to verify payment with the server.")
      }
    }

    verifyPayment()
  }, [transactionId, token, authLoading, router, clearCart])

  return (
    <div className="container mx-auto px-4 py-32 flex justify-center items-center min-h-[60vh]">
      <Card className="max-w-md w-full border-border">
        <CardContent className="p-8 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="text-xl font-serif font-semibold text-foreground">
                Verifying Payment...
              </h2>
              <p className="text-muted-foreground text-sm">
                Please do not close or refresh this page. We are securely checking your payment status with PhonePe.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Payment Successful!
              </h2>
              <p className="text-muted-foreground mb-4">
                Thank you for shopping with Shree Ji. Your order has been placed securely.
              </p>
              <div className="flex gap-4 w-full pt-4">
                <Link href="/collections" className="flex-1">
                  <Button variant="outline" className="w-full">Continue Shopping</Button>
                </Link>
                <Link href="/orders" className="flex-1">
                  <Button className="w-full">View Orders</Button>
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-16 w-16 text-destructive mb-2" />
              <h2 className="text-2xl font-serif font-semibold text-foreground">
                Payment Failed or Pending
              </h2>
              <p className="text-muted-foreground mb-4">
                {errorMessage}
              </p>
              <div className="flex gap-4 w-full pt-4">
                <Link href="/checkout" className="flex-1">
                  <Button className="w-full">Try Again</Button>
                </Link>
                <Link href="/contact" className="flex-1">
                  <Button variant="outline" className="w-full">Support</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentStatusPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <PaymentStatusContent />
      </Suspense>
      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  )
}
