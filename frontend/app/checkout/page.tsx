"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useCart } from "@/contexts/cart-context"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import type { Address } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import {
  MapPin,
  Plus,
  CheckCircle2,
  ShieldCheck,
  Truck,
  CreditCard,
  Loader2,
  ChevronRight,
  Package,
} from "lucide-react"

declare global {
  interface Window {
    Razorpay: any
  }
}

// ── Indian states for the address dropdown ──────────────────────
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh",
  "Chandigarh", "Puducherry", "Lakshadweep",
  "Andaman & Nicobar Islands", "Dadra & Nagar Haveli and Daman & Diu",
]

export default function CheckoutPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()
  const { cart, getCartTotal, clearCart } = useCart()

  // ── State ─────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [showAddressForm, setShowAddressForm] = useState(false)

  const [addressForm, setAddressForm] = useState({
    full_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
  })
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)

  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const deliveryCharge = cart.length > 0 ? 99 : 0
  const subtotal = getCartTotal()
  const total = subtotal + deliveryCharge

  // ── Auth gate ─────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  // ── Fetch addresses ───────────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    if (!token) return
    setIsLoadingAddresses(true)
    try {
      const data = await api.getAddresses(token)
      setAddresses(data)
      if (data.length > 0 && !selectedAddressId) {
        setSelectedAddressId(data[0].id)
      }
    } catch {
      setAddresses([])
    } finally {
      setIsLoadingAddresses(false)
    }
  }, [token, selectedAddressId])

  useEffect(() => {
    if (token) fetchAddresses()
  }, [token, fetchAddresses])

  // ── Save new address ──────────────────────────────────────────
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setIsSavingAddress(true)
    setAddressError(null)

    try {
      const saved = await api.addAddress(token, {
        full_name: addressForm.full_name.trim(),
        phone: addressForm.phone.trim(),
        address_line1: addressForm.address_line1.trim(),
        address_line2: addressForm.address_line2.trim() || undefined,
        city: addressForm.city.trim(),
        state: addressForm.state,
        pincode: addressForm.pincode.trim(),
      })
      setAddresses((prev) => [...prev, saved])
      setSelectedAddressId(saved.id)
      setShowAddressForm(false)
      setAddressForm({
        full_name: "",
        phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
      })
    } catch (err: any) {
      setAddressError(err.message || "Failed to save address")
    } finally {
      setIsSavingAddress(false)
    }
  }

  // ── Razorpay checkout ─────────────────────────────────────────
  const handlePayment = async () => {
    if (!token || !selectedAddressId || cart.length === 0) return

    setIsCheckingOut(true)
    setCheckoutError(null)

    try {
      const items = cart.map((item) => ({
        sku_id: item.product.sku_id,
        quantity: item.quantity,
        price: item.product.price,
      }))

      const orderData = await api.createRazorpayOrder(
        token,
        items,
        deliveryCharge,
        selectedAddressId,
      )

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Shree Ji",
        description: "Purchase from Shree Ji",
        order_id: orderData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            await api.verifyPayment(token, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            clearCart()
            router.push("/checkout-success")
          } catch (verifyError: any) {
            setCheckoutError(
              verifyError.message ||
                "Payment verification failed. Please contact support.",
            )
            setIsCheckingOut(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsCheckingOut(false)
          },
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#7c3aed",
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on("payment.failed", (response: any) => {
        setCheckoutError(
          response.error?.description || "Payment failed. Please try again.",
        )
        setIsCheckingOut(false)
      })
      razorpay.open()
    } catch (error: any) {
      setCheckoutError(error.message)
      setIsCheckingOut(false)
    }
  }

  // ── Loading / empty states ────────────────────────────────────
  if (authLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </main>
    )
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-32 text-center">
          <Package className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-4">
            Your cart is empty
          </h1>
          <p className="text-muted-foreground mb-8">
            Add items to your cart before checking out.
          </p>
          <Link href="/collections">
            <Button size="lg">Browse Collections</Button>
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId)

  // ── Render ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-24">
        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-semibold text-foreground mb-2">
            Checkout
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/cart" className="hover:text-primary transition-colors">
              Cart
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Checkout</span>
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────────── */}
        {checkoutError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {checkoutError}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ══════════════ LEFT COLUMN ══════════════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Step 1: Delivery Address ─────────────────────── */}
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    1
                  </div>
                  <h2 className="text-xl font-serif font-semibold text-foreground">
                    Delivery Address
                  </h2>
                  {selectedAddress && !showAddressForm && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                  )}
                </div>

                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Existing addresses */}
                    {addresses.length > 0 && !showAddressForm && (
                      <div className="space-y-3 mb-4">
                        {addresses.map((addr) => (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedAddressId === addr.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <MapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                selectedAddressId === addr.id
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground">
                                  {addr.full_name}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {addr.address_line1}
                                  {addr.address_line2 && `, ${addr.address_line2}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {addr.city}, {addr.state} — {addr.pincode}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  📞 {addr.phone}
                                </p>
                              </div>
                              {selectedAddressId === addr.id && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          className="w-full bg-transparent"
                          onClick={() => setShowAddressForm(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Address
                        </Button>
                      </div>
                    )}

                    {/* Address form — shown when no addresses exist or user clicks "Add New" */}
                    {(addresses.length === 0 || showAddressForm) && (
                      <form onSubmit={handleSaveAddress} className="space-y-4">
                        {addresses.length === 0 && (
                          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm mb-4">
                            <MapPin className="h-5 w-5 flex-shrink-0" />
                            <span>
                              Please add a delivery address to continue with your order.
                            </span>
                          </div>
                        )}

                        {addressError && (
                          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                            {addressError}
                          </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                              Full Name *
                            </label>
                            <Input
                              required
                              placeholder="Full name"
                              value={addressForm.full_name}
                              onChange={(e) =>
                                setAddressForm((p) => ({
                                  ...p,
                                  full_name: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                              Phone Number *
                            </label>
                            <Input
                              required
                              type="tel"
                              placeholder="10-digit phone"
                              minLength={10}
                              maxLength={15}
                              value={addressForm.phone}
                              onChange={(e) =>
                                setAddressForm((p) => ({
                                  ...p,
                                  phone: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Address Line 1 *
                          </label>
                          <Input
                            required
                            placeholder="House no., building, street"
                            value={addressForm.address_line1}
                            onChange={(e) =>
                              setAddressForm((p) => ({
                                ...p,
                                address_line1: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">
                            Address Line 2
                          </label>
                          <Input
                            placeholder="Landmark, area (optional)"
                            value={addressForm.address_line2}
                            onChange={(e) =>
                              setAddressForm((p) => ({
                                ...p,
                                address_line2: e.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                              City *
                            </label>
                            <Input
                              required
                              placeholder="City"
                              value={addressForm.city}
                              onChange={(e) =>
                                setAddressForm((p) => ({
                                  ...p,
                                  city: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                              State *
                            </label>
                            <select
                              required
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={addressForm.state}
                              onChange={(e) =>
                                setAddressForm((p) => ({
                                  ...p,
                                  state: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select state</option>
                              {INDIAN_STATES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">
                              Pincode *
                            </label>
                            <Input
                              required
                              placeholder="6-digit"
                              minLength={6}
                              maxLength={6}
                              pattern="[0-9]{6}"
                              value={addressForm.pincode}
                              onChange={(e) =>
                                setAddressForm((p) => ({
                                  ...p,
                                  pincode: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button
                            type="submit"
                            disabled={isSavingAddress}
                            className="flex-1"
                          >
                            {isSavingAddress ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Address"
                            )}
                          </Button>
                          {addresses.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              className="bg-transparent"
                              onClick={() => {
                                setShowAddressForm(false)
                                setAddressError(null)
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </form>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Step 2: Order Items ──────────────────────────── */}
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    2
                  </div>
                  <h2 className="text-xl font-serif font-semibold text-foreground">
                    Order Items
                  </h2>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                  </span>
                </div>

                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.product.sku_id}
                      className="flex gap-4 pb-4 border-b border-border last:border-b-0 last:pb-0"
                    >
                      <div className="relative w-16 h-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={item.product.image_url || "/placeholder.svg"}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.product.color} · Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground whitespace-nowrap">
                        ₹{(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ══════════════ RIGHT COLUMN — Order Summary ══════════════ */}
          <div className="lg:col-span-1">
            <Card className="border-border sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-serif font-semibold text-foreground mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-foreground/80">
                    <span>
                      Subtotal (
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                      items)
                    </span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-foreground/80">
                    <span>Delivery</span>
                    <span>
                      {deliveryCharge === 0
                        ? "FREE"
                        : `₹${deliveryCharge}`}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between text-lg font-semibold text-foreground">
                    <span>Total</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Delivery address summary */}
                {selectedAddress && (
                  <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        Delivering to
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium">
                      {selectedAddress.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAddress.city}, {selectedAddress.state} —{" "}
                      {selectedAddress.pincode}
                    </p>
                  </div>
                )}

                {/* Pay button */}
                <Button
                  className="w-full mb-3 bg-primary hover:bg-primary/90"
                  size="lg"
                  onClick={handlePayment}
                  disabled={
                    isCheckingOut ||
                    !selectedAddressId ||
                    isLoadingAddresses ||
                    cart.length === 0
                  }
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : !selectedAddressId ? (
                    "Add Address to Continue"
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay ₹{total.toLocaleString()}
                    </>
                  )}
                </Button>

                <Link href="/cart">
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    size="lg"
                  >
                    Back to Cart
                  </Button>
                </Link>

                {/* Trust badges */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    <span>Secure checkout powered by Razorpay</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="px-3 py-2 border border-border rounded text-xs text-muted-foreground">
                      Credit Card
                    </div>
                    <div className="px-3 py-2 border border-border rounded text-xs text-muted-foreground">
                      Debit Card
                    </div>
                    <div className="px-3 py-2 border border-border rounded text-xs text-muted-foreground">
                      UPI
                    </div>
                    <div className="px-3 py-2 border border-border rounded text-xs text-muted-foreground">
                      Net Banking
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
