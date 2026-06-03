import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = {
  title: "Terms of Service | Shree Ji",
  description: "Read the Terms of Service for using Shree Ji's website and services.",
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 container mx-auto px-4 py-32 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-center text-foreground mb-12">
          Terms of Service
        </h1>

        <div className="space-y-8">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6 md:p-8 space-y-8 text-foreground/80 leading-relaxed">
              
              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using the Shree Ji website, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this website's particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Intellectual Property Rights</h2>
                <p>
                  All content included on this site, such as text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, is the property of Shree Ji or its content suppliers and protected by international copyright laws. The compilation of all content on this site is the exclusive property of Shree Ji.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. Product Descriptions</h2>
                <p>
                  Shree Ji attempts to be as accurate as possible. However, we do not warrant that product descriptions, colors, sizes, or other content of this site are perfectly accurate, complete, reliable, current, or error-free. If a product offered by Shree Ji itself is not as described, your sole remedy is to return it in unused condition.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Pricing</h2>
                <p>
                  All prices are subject to change without notice. We reserve the right to modify or discontinue any product or service at any time. In the event a product is listed at an incorrect price due to a typographical error or error in pricing information, we shall have the right to refuse or cancel any orders placed for the product listed at the incorrect price.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">5. User Accounts</h2>
                <p>
                  If you create an account on our website, you are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer, and you agree to accept responsibility for all activities that occur under your account or password.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
                <p>
                  Shree Ji shall not be liable for any special or consequential damages that result from the use of, or the inability to use, the materials on this site or the performance of the products, even if Shree Ji has been advised of the possibility of such damages.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">7. Governing Law</h2>
                <p>
                  These Terms of Service and any separate agreements whereby we provide you services shall be governed by and construed in accordance with the laws of India, with jurisdiction in Raipur, Chhattisgarh.
                </p>
              </section>

            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </main>
  )
}
