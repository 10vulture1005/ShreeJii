"use client"

import type React from "react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail, MessageCircle, Instagram } from "lucide-react"
import { useState } from "react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log("[v0] Form submitted:", formData)
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: "", phone: "", email: "", message: "" })
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-serif font-semibold text-center text-foreground mb-4">
            Get in Touch
          </h1>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto text-lg">
            Have a question or want to place a custom order? We'd love to hear from you.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-serif font-semibold text-foreground mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                    Your Name *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                    Phone Number *
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your inquiry or custom order requirements..."
                    rows={6}
                    required
                    className="w-full"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90">
                  {submitted ? "Message Sent!" : "Send Message"}
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-serif font-semibold text-foreground mb-6">Contact Information</h2>
                <div className="space-y-4">
                  <Card className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Visit Our Boutique</h3>
                        <p className="text-sm text-muted-foreground">
                          123 Fashion Street, Shopping District
                          <br />
                          Mumbai, Maharashtra 400001
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Call Us</h3>
                        <p className="text-sm text-muted-foreground">
                          +91 98765 43210
                          <br />
                          Mon-Sat: 10:00 AM - 8:00 PM
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">Email Us</h3>
                        <p className="text-sm text-muted-foreground">contact@shreeji.com</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div>
                <h3 className="text-xl font-serif font-semibold text-foreground mb-4">Quick Connect</h3>
                <div className="space-y-3">
                  <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-transparent" size="lg">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                      <span>WhatsApp for Fast Enquiries</span>
                    </Button>
                  </a>
                  <a href="https://instagram.com/shreeji" target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 h-12 bg-transparent" size="lg">
                      <Instagram className="h-5 w-5 text-pink-600" />
                      <span>Follow us on Instagram</span>
                    </Button>
                  </a>
                </div>
              </div>

              {/* Business Hours */}
              <Card className="border-border bg-muted/30">
                <CardContent className="p-6">
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-4">Business Hours</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-foreground/80">
                      <span>Monday - Saturday</span>
                      <span className="font-medium">10:00 AM - 8:00 PM</span>
                    </div>
                    <div className="flex justify-between text-foreground/80">
                      <span>Sunday</span>
                      <span className="font-medium">11:00 AM - 6:00 PM</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
