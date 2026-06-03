import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Size Guide | Shree Ji",
  description: "Find your perfect fit with Shree Ji's comprehensive size guide for sarees, lehengas, and indo-western wear.",
}

export default function SizeGuidePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="flex-1 container mx-auto px-4 py-32 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-center text-foreground mb-4">
          Size Guide
        </h1>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto text-lg mb-12">
          Use our comprehensive measuring guide to find your perfect fit for every occasion.
        </p>

        <div className="space-y-12">
          {/* How to Measure Section */}
          <section>
            <h2 className="text-3xl font-serif font-semibold text-foreground border-b border-border pb-4 mb-6">
              How to Measure
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Bust</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80">
                  Measure under your arms, around the fullest part of your chest. Make sure the measuring tape is comfortably loose.
                </CardContent>
              </Card>
              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Waist</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80">
                  Measure around your natural waistline, which is the narrowest part of your waist. Keep the tape slightly loose for breathing room.
                </CardContent>
              </Card>
              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-serif">Hips</CardTitle>
                </CardHeader>
                <CardContent className="text-foreground/80">
                  Stand with your feet together and measure around the fullest part of your hips, approximately 8 inches below your natural waist.
                </CardContent>
              </Card>
            </div>
          </section>

          {/* General Size Chart */}
          <section>
            <h2 className="text-3xl font-serif font-semibold text-foreground border-b border-border pb-4 mb-6">
              Women's Apparel Size Chart
            </h2>
            <Card className="border-border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-foreground">
                      <th className="p-4 border-b font-semibold">Size</th>
                      <th className="p-4 border-b font-semibold">US/UK</th>
                      <th className="p-4 border-b font-semibold">Bust (inches)</th>
                      <th className="p-4 border-b font-semibold">Waist (inches)</th>
                      <th className="p-4 border-b font-semibold">Hips (inches)</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground/80">
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 border-b font-medium">XS</td>
                      <td className="p-4 border-b">2 / 6</td>
                      <td className="p-4 border-b">32" - 33"</td>
                      <td className="p-4 border-b">24" - 25"</td>
                      <td className="p-4 border-b">34" - 35"</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 border-b font-medium">S</td>
                      <td className="p-4 border-b">4 / 8</td>
                      <td className="p-4 border-b">34" - 35"</td>
                      <td className="p-4 border-b">26" - 27"</td>
                      <td className="p-4 border-b">36" - 37"</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 border-b font-medium">M</td>
                      <td className="p-4 border-b">6 / 10</td>
                      <td className="p-4 border-b">36" - 37"</td>
                      <td className="p-4 border-b">28" - 29"</td>
                      <td className="p-4 border-b">38" - 39"</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 border-b font-medium">L</td>
                      <td className="p-4 border-b">8 / 12</td>
                      <td className="p-4 border-b">38" - 39"</td>
                      <td className="p-4 border-b">30" - 32"</td>
                      <td className="p-4 border-b">40" - 42"</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 border-b font-medium">XL</td>
                      <td className="p-4 border-b">10 / 14</td>
                      <td className="p-4 border-b">40" - 42"</td>
                      <td className="p-4 border-b">33" - 35"</td>
                      <td className="p-4 border-b">43" - 45"</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 border-b font-medium">XXL</td>
                      <td className="p-4 border-b">12 / 16</td>
                      <td className="p-4 border-b">43" - 45"</td>
                      <td className="p-4 border-b">36" - 38"</td>
                      <td className="p-4 border-b">46" - 48"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* Garment Specific Information */}
          <section>
            <h2 className="text-3xl font-serif font-semibold text-foreground border-b border-border pb-4 mb-6">
              Garment Specific Notes
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-foreground">Sarees</h3>
                <p className="text-foreground/80 leading-relaxed">
                  Our sarees are standard free size (typically 5.5 meters in length) with a 0.8 meter unstitched blouse piece attached unless otherwise specified.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-foreground">Lehengas</h3>
                <p className="text-foreground/80 leading-relaxed">
                  Lehenga skirts come with a standard waist tie-up or adjustable waistbands. Please ensure to check the maximum waist expansion and standard length (usually 40-42 inches) in the product description.
                </p>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
              <h3 className="text-xl font-medium text-primary mb-2">Need Custom Sizing?</h3>
              <p className="text-foreground/80">
                We offer custom tailoring for select pieces to ensure the perfect fit for your unique body type. Please contact our support team at sizing@shreeji.com with the product details and your exact measurements.
              </p>
            </div>
          </section>

        </div>
      </div>
      
      <Footer />
    </main>
  )
}
