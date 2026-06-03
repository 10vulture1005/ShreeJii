import { Card } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

const collections = [
  {
    title: "Ethnic Wear",
    description: "Traditional designs with contemporary flair",
    image: "/traditional-indian-ethnic-wear-kurta-salwar-kameez.jpg",
  },
  {
    title: "Sarees",
    description: "Timeless elegance in every drape",
    image: "/elegant-indian-saree-traditional-silk-saree.jpg",
  },
  {
    title: "Indo-Western",
    description: "Where east meets west beautifully",
    image: "/indo-western-fusion-wear-women.jpg",
  },
  {
    title: "Party Wear",
    description: "Make every celebration memorable",
    image: "/indian-party-wear-gown-lehenga.jpg",
  },
  {
    title: "Bridal",
    description: "Your dream wedding ensemble",
    image: "/indian-bridal-wear-wedding-lehenga.jpg",
  },
  {
    title: "Festive",
    description: "Celebrate traditions in style",
    image: "/indian-festive-wear-diwali-outfit.jpg",
  },
]

export function CollectionsSection() {
  return (
    <section id="collections" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-block mb-6 px-4 py-2 bg-primary/10 rounded-full">
            <span className="text-sm font-medium text-primary uppercase tracking-wide">Collections</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-serif font-light mb-4 text-balance text-foreground">
            Curated with Love
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Explore our diverse range of collections designed to make you feel special on every occasion
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {collections.map((collection, index) => (
            <Link key={index} href="/collections" className="group">
              <Card className="overflow-hidden border-border hover:shadow-xl transition-all duration-300">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={collection.image || "/placeholder.svg"}
                    alt={collection.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-serif font-medium text-background mb-2">{collection.title}</h3>
                    <p className="text-sm text-background/90 mb-4">{collection.description}</p>
                    <div className="flex items-center gap-2 text-background group-hover:gap-4 transition-all">
                      <span className="text-sm font-medium">Explore</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
