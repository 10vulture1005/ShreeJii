import Link from "next/link"
import { ShoppingBag, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-serif font-semibold tracking-wide text-foreground">Shree Ji</div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="#collections" className="text-sm text-foreground hover:text-primary transition-colors">
            Collections
          </Link>
          <Link href="#about" className="text-sm text-foreground hover:text-primary transition-colors">
            About
          </Link>
          <Link href="#contact" className="text-sm text-foreground hover:text-primary transition-colors">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-foreground">
            <ShoppingBag className="h-5 w-5" />
            <span className="sr-only">Shopping bag</span>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden text-foreground">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
