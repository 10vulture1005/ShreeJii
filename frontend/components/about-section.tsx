"use client"

import { useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export function AboutSection() {
  const containerRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Content scroll animation
    gsap.from(contentRef.current!.children, {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: "power3.out",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
      },
    })

    // Stats scroll animation
    gsap.from(statsRef.current!.children, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: {
        trigger: statsRef.current,
        start: "top 85%",
      },
    })
  }, { scope: containerRef })

  return (
    <section id="about" ref={containerRef} className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div ref={contentRef}>
            <div className="inline-block mb-6 px-4 py-2 bg-primary/10 rounded-full">
              <span className="text-sm font-medium text-primary uppercase tracking-wide">Our Story</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-serif font-light mb-8 text-balance text-foreground">
              Crafting Timeless Elegance Since 2025
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-6 text-pretty">
              Founded by Shilpa Saxena, Shree Ji was born from a passion for celebrating Indian heritage through fashion.
              We believe that every woman deserves to feel beautiful, confident, and connected to her roots.
            </p>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 text-pretty">
              Our mission is simple yet profound: to offer elegant women's clothing that honors traditional values while
              embracing modern aesthetics. Each piece in our collection is thoughtfully curated to bring you the finest in
              ethnic, Indo-western, and contemporary wear.
            </p>
          </div>

          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-serif font-semibold text-primary mb-2">100+</div>
              <div className="text-sm text-muted-foreground">Unique Designs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif font-semibold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif font-semibold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Customer Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
