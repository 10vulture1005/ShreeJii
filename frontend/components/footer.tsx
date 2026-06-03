import Link from "next/link"
import { Instagram, Facebook, Mail, Phone } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-2xl font-serif font-semibold mb-4 text-foreground">Shree Ji</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Where Elegance Meets Tradition</p>
          </div>

          <div>
            <h4 className="font-medium mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/collections" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Collections
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4 text-foreground">Policies</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/policies/shipping-and-returns" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/size-guide" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Size Guide
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4 text-foreground">Connect</h4>
            <div className="flex gap-4 mb-4">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
                <span className="sr-only">Email</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-5 w-5" />
                <span className="sr-only">Phone</span>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              <a href="tel:+917869739172" className="hover:text-primary transition-colors">
                +91 78697 39172
              </a>
            </p>
            <p className="text-sm text-muted-foreground">
              <a href="mailto:store@shreeji.com" className="hover:text-primary transition-colors">
                store@shreeji.com
              </a>
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Shree Ji. Founded by Shilpa Saxena. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
