import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CTASection() {
  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-light mb-6 text-balance">Stay Connected</h2>

          <p className="text-lg mb-8 text-pretty opacity-90">
            Subscribe to receive exclusive updates about new collections, special offers, and style inspiration
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              className="bg-primary-foreground text-foreground border-0"
            />
            <Button variant="secondary" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Subscribe
            </Button>
          </div>

          <p className="text-sm mt-4 opacity-75">We respect your privacy. Unsubscribe at any time.</p>
        </div>
      </div>
    </section>
  )
}
