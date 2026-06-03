import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = {
  title: "Privacy Policy | Shree Ji",
  description: "Learn how Shree Ji collects, uses, and protects your personal information.",
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 container mx-auto px-4 py-32 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-center text-foreground mb-12">
          Privacy Policy
        </h1>

        <div className="space-y-8">
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-6 md:p-8 space-y-8 text-foreground/80 leading-relaxed">
              
              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">1. Introduction</h2>
                <p>
                  At Shree Ji, we value your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, use, and safeguard your information when you visit our website, purchase our beautiful garments, or interact with our boutique.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">2. Information We Collect</h2>
                <p className="mb-3">We may collect and process the following data about you:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Identity Data:</strong> Name, username, or similar identifier.</li>
                  <li><strong>Contact Data:</strong> Billing address, delivery address, email address, and telephone numbers.</li>
                  <li><strong>Financial Data:</strong> Payment card details (processed securely by our payment partners; we do not store full card numbers).</li>
                  <li><strong>Transaction Data:</strong> Details about payments to and from you and other details of products you have purchased from us.</li>
                  <li><strong>Technical Data:</strong> Internet protocol (IP) address, browser type and version, time zone setting, and operating system.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
                <p className="mb-3">We use your personal data to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Process and deliver your orders, including managing payments and returns.</li>
                  <li>Provide customer support and respond to your inquiries.</li>
                  <li>Send you important updates about our services or changes to our terms.</li>
                  <li>Personalize your shopping experience and recommend products that may interest you (with your consent).</li>
                  <li>Improve our website, products, and marketing efforts.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">4. Data Security</h2>
                <p>
                  We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. Access to your personal data is limited to those employees, agents, contractors, and other third parties who have a business need to know.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">5. Your Rights</h2>
                <p>
                  Depending on your location, you may have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, or to object to processing. If you wish to exercise any of these rights, please contact us at privacy@shreeji.com.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">6. Changes to this Policy</h2>
                <p>
                  We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page. You are advised to review this privacy policy periodically for any changes.
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
