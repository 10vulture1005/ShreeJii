import Image from "next/image"

export function GallerySection() {
  const galleryImages = [
    { src: "/gallery-boutique-interior.jpg", alt: "Boutique Interior" },
    { src: "/gallery-saree-collection.jpg", alt: "Saree Collection" },
    { src: "/gallery-designer-wear.jpg", alt: "Designer Wear" },
    { src: "/gallery-bridal-showcase.jpg", alt: "Bridal Showcase" },
    { src: "/gallery-fashion-details.jpg", alt: "Fashion Details" },
    { src: "/gallery-elegant-draping.jpg", alt: "Elegant Draping" },
  ]

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-semibold text-foreground mb-4">Our Gallery</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A glimpse into our exquisite collection and the artistry behind each piece
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer hover:shadow-xl transition-all duration-300"
            >
              <Image
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
