import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = {
  title: "Shipping & Returns Policy | Shree Ji",
  description: "Learn about Shree Ji's shipping methods, delivery times, and return and refund policies.",
}

export default function ShippingAndReturnsPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 container mx-auto px-4 py-32 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-center text-foreground mb-12">
          Shipping & Return Policy
        </h1>

        <div className="space-y-12">
          {/* Shipping Policy Section */}
          <section>
            <h2 className="text-3xl font-serif font-semibold text-foreground border-b border-border pb-4 mb-6">
              Shipping Policy
            </h2>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-6 text-foreground/80 leading-relaxed">
                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Order Processing</h3>
                  <p>
                    All orders are processed within 1 to 3 business days (excluding weekends and holidays) after receiving your order confirmation email. You will receive another notification when your order has shipped. 
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Domestic Shipping Rates</h3>
                  <p>
                    We offer standard and expedited shipping options across India. Shipping charges for your order will be calculated and displayed at checkout. Enjoy free standard shipping on all orders over ₹2,500.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Delivery Timelines</h3>
                  <p>
                    Standard delivery typically takes 5-7 business days, depending on your location. Expedited shipping options can deliver your beautiful pieces in 2-4 business days. Please note that custom or made-to-order garments may require additional processing time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Return Policy Section */}
          <section>
            <h2 className="text-3xl font-serif font-semibold text-foreground border-b border-border pb-4 mb-6">
              Return & Refund Policy
            </h2>
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-6 md:p-8 space-y-6 text-foreground/80 leading-relaxed">
                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">General Return Guidelines</h3>
                  <p>
                    We want you to be completely satisfied with your Shree Ji purchase. If you are not entirely happy with your item, we accept returns within 7 days of delivery. 
                  </p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>Items must be unused, unworn, and in the exact same condition that you received them.</li>
                    <li>All original tags, labels, and packaging must be completely intact and attached.</li>
                    <li>Custom-stitched or highly personalized garments are strictly non-returnable.</li>
                  </ul>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 mt-6">
                  <h3 className="text-xl font-semibold text-primary mb-2">How Returns & Refunds Work</h3>
                  <p className="font-medium text-foreground">
                    1. Send it back to us:
                  </p>
                  <p className="mb-4">
                    Please securely package your item and return it to us via post to our official store address:
                    <br />
                    <strong>Shree Ji Biotique, Sarona, Raipur, Chhattisgarh</strong>
                  </p>
                  
                  <p className="font-medium text-foreground">
                    2. Inspection & Contact:
                  </p>
                  <p>
                    Once the item is returned to us and received at our given address, our quality team will thoroughly check the item. After the inspection is complete, we will directly contact you to initiate the refund process.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-foreground mb-2">Refund Processing</h3>
                  <p>
                    Approved refunds will be processed back to your original method of payment. Please allow 5-7 business days for the credit to appear on your statement after we have successfully contacted you following the inspection.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
