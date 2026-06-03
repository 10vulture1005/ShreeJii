"use client"

import { useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)
  const subRef = useRef<HTMLParagraphElement>(null)
  const [isVisible, setIsVisible] = useState(true)

  useGSAP(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false)
        onComplete()
      }
    })

    gsap.set(textRef.current, { opacity: 0, y: 30 })
    gsap.set(subRef.current, { opacity: 0, y: 20 })

    tl.to(textRef.current, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" })
      .to(subRef.current, { opacity: 1, y: 0, duration: 1, ease: "power3.out" }, "-=0.6")
      .to([textRef.current, subRef.current], { opacity: 0, y: -20, duration: 0.8, ease: "power3.in", delay: 1.2 })
      .to(containerRef.current, { yPercent: -100, duration: 0.8, ease: "power4.inOut" })

  }, { scope: containerRef })

  if (!isVisible) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      <h1 ref={textRef} className="text-6xl md:text-8xl font-serif font-semibold text-primary mb-6">
        Shree Ji
      </h1>
      <p ref={subRef} className="text-xl md:text-2xl text-muted-foreground uppercase tracking-[0.4em]">
        Elegance Meets Tradition
      </p>
    </div>
  )
}
