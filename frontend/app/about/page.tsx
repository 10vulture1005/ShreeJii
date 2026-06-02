import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Users, Award, Sparkles } from "lucide-react"
import Image from "next/image"

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: "Quality First",
      description: "Every piece is carefully selected and crafted with the finest fabrics and attention to detail.",
    },
    {
      icon: Users,
      title: "Customer Centric",
      description: "Your satisfaction is our priority. We provide personalized service for every customer.",
    },
    {
      icon: Award,
      title: "Expert Craftsmanship",
      description: "Years of experience in traditional and contemporary fashion design.",
    },
    {
      icon: Sparkles,
      title: "Timeless Elegance",
      description: "Designs that blend traditional aesthetics with modern sensibilities.",
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-serif font-semibold text-center text-foreground mb-4">
            About Shree Ji
          </h1>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto text-lg">Where Elegance Meets Tradition</p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
              <Image src="/founder-shilpa-saxena.jpg" alt="Shilpa Saxena - Founder" fill className="object-cover" />
            </div>
            <div>
              <h2 className="text-4xl font-serif font-semibold text-foreground mb-6">Our Story</h2>
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p>
                  Founded in 2025 by Shilpa Saxena, Shree Ji was born from a passion for celebrating women's elegance
                  through clothing that honors tradition while embracing contemporary style. With a keen eye for detail
                  and a deep appreciation for Indian craftsmanship, Shilpa envisioned a boutique where every woman could
                  find pieces that make her feel confident and beautiful.
                </p>
                <p>
                  What started as a dream has blossomed into a curated collection of exquisite sarees, lehengas,
                  indo-western outfits, and designer pieces. Each garment is carefully selected to ensure the highest
                  quality fabrics, impeccable tailoring, and timeless design.
                </p>
                <p>
                  At Shree Ji, we believe that clothing is more than just fabric - it's an expression of identity,
                  culture, and personal style. Whether you're attending a wedding, celebrating a festival, or simply
                  want to feel special, our collection offers something for every occasion and every woman.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-border">
              <CardContent className="p-8">
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-4">Our Mission</h3>
                <p className="text-foreground/80 leading-relaxed">
                  To provide elegant women's clothing that celebrates traditional values while embracing modern design.
                  We aim to make every woman feel confident, beautiful, and connected to her heritage through our
                  carefully curated collections.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-8">
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-4">Our Vision</h3>
                <p className="text-foreground/80 leading-relaxed">
                  To become the premier destination for women seeking timeless, elegant clothing that bridges tradition
                  and contemporary fashion. We envision a community where every woman can express her unique style with
                  confidence and grace.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-serif font-semibold text-center text-foreground mb-12">Why Choose Shree Ji</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <Card key={index} className="border-border text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-foreground mb-3">{value.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-serif font-semibold text-center text-foreground mb-12">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">Authenticity</h3>
                <p className="text-sm text-muted-foreground">
                  We honor traditional craftsmanship and authentic designs that celebrate our cultural heritage.
                </p>
              </div>
              <div className="text-center">
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">Excellence</h3>
                <p className="text-sm text-muted-foreground">
                  Every piece meets our high standards of quality, from fabric selection to final stitching.
                </p>
              </div>
              <div className="text-center">
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">Innovation</h3>
                <p className="text-sm text-muted-foreground">
                  We blend timeless tradition with contemporary design to create unique, modern pieces.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
