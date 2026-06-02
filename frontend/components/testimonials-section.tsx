import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Priya Sharma",
      location: "Mumbai",
      rating: 5,
      text: "The bridal lehenga I purchased from Shree Ji was absolutely stunning. The quality and craftsmanship exceeded my expectations. Shilpa's attention to detail made my special day even more memorable!",
    },
    {
      name: "Ananya Patel",
      location: "Delhi",
      rating: 5,
      text: "I'm a regular customer at Shree Ji. Their saree collection is unmatched, and the fabrics are always premium quality. The staff is incredibly helpful in selecting the perfect outfit.",
    },
    {
      name: "Meera Reddy",
      location: "Bangalore",
      rating: 5,
      text: "Found the perfect indo-western outfit for my cousin's wedding. The fit was impeccable, and I received so many compliments. Shree Ji is now my go-to boutique for all special occasions.",
    },
    {
      name: "Kavya Iyer",
      location: "Chennai",
      rating: 5,
      text: "The custom order service at Shree Ji is exceptional. They brought my vision to life perfectly. The personalized attention and quality workmanship make them stand out from other boutiques.",
    },
  ]

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-semibold text-foreground mb-4">What Our Customers Say</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Read the experiences of women who chose Shree Ji for their special moments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-border/50 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground/80 mb-4 leading-relaxed">{testimonial.text}</p>
                <div className="border-t border-border/50 pt-4">
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
