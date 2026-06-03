"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLImageElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Parallax background
    gsap.to(bgRef.current, {
      yPercent: 30,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    })

    // Text intro animation (delayed to wait for splash screen)
    gsap.from(contentRef.current!.children, {
      y: 50,
      opacity: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: "power3.out",
      delay: 2.8,
    })
  }, { scope: containerRef })

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background image placeholder */}
      <div className="absolute inset-0 z-0">
        <img
          ref={bgRef}
          src="/elegant-indian-woman-wearing-traditional-saree-in-.jpg"
          alt="Hero background"
          className="w-full h-[130%] object-cover -top-[15%] relative"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 pt-24 md:pt-32">
        <div ref={contentRef} className="max-w-2xl">
          <div className="inline-block mb-4 px-4 py-2 bg-primary/10 rounded-full">
            <span className="text-sm font-medium text-primary">Established 2025</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-light leading-tight mb-6 text-balance text-foreground">
            Where Elegance Meets Tradition
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 text-pretty">
            Discover timeless beauty in every thread. Shree Ji brings you an exquisite collection of women's clothing
            that celebrates heritage while embracing contemporary style.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/collections">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/collections">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent w-full sm:w-auto"
              >
                Explore Collection
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="ghost"
                className="text-foreground hover:text-primary hover:bg-primary/10 w-full sm:w-auto"
              >
                Order Request
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-tl from-accent/20 to-transparent rounded-full blur-3xl" />
    </section>
  )
}
