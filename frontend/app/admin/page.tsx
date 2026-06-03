"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IndianRupee, ShoppingBag, Package, Edit, Plus, RefreshCw, X, Sparkles } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { Product } from "@/lib/types"

type DashboardStats = {
  total_revenue: number
  total_orders: number
  items_sold: number
  recent_sales: any[]
}

export default function AdminPage() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isFetching, setIsFetching] = useState(true)
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({ name: "", price: 0, image_url: "", description: "" })
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  
  // Form states
  const [restockForm, setRestockForm] = useState({
    source_name: "", clothing_type: "", color: "", name: "", price: "", quantity_to_add: "", image_url: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    if (!token) return
    setIsFetching(true)
    try {
      const [statsData, productsData] = await Promise.all([
        api.getAdminStats(token),
        api.getAllProductsAdmin(token)
      ])
      setStats(statsData)
      setProducts(productsData)
    } catch (err) {
      console.error(err)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== "admin") {
        router.push("/login")
      } else if (token) {
        fetchData()
      }
    }
  }, [user, isLoading, token, router])

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !token) return
    setIsSubmitting(true)
    try {
      await api.updateProduct(token, editingProduct.sku_id, {
        name: editForm.name,
        price: Number(editForm.price),
        image_url: editForm.image_url || undefined,
        description: editForm.description || undefined
      })
      setIsEditModalOpen(false)
      fetchData()
    } catch (error) {
      console.error("Failed to update", error)
      alert("Failed to update product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateDescription = async () => {
    if (!editingProduct) return
    setIsGeneratingDesc(true)
    try {
      const res = await api.generateDescription(editingProduct.sku_id)
      setEditForm({ ...editForm, description: res.description })
      toast.success("Description generated successfully!")
    } catch (error) {
      toast.error("Failed to generate description")
    } finally {
      setIsGeneratingDesc(false)
    }
  }

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setIsSubmitting(true)
    try {
      await api.restockProduct(token, {
        ...restockForm,
        price: Number(restockForm.price),
        quantity_to_add: Number(restockForm.quantity_to_add),
        image_url: restockForm.image_url || undefined
      })
      setIsRestockModalOpen(false)
      fetchData()
    } catch (error) {
      console.error("Failed to restock", error)
      alert("Failed to restock product")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      price: product.price,
      image_url: product.image_url || "",
      description: product.description || ""
    })
    setIsEditModalOpen(true)
  }

  const openRestockModal = (product?: Product) => {
    if (product) {
      setRestockForm({
        source_name: product.source_name,
        clothing_type: product.clothing_type,
        color: product.color,
        name: product.name,
        price: product.price.toString(),
        quantity_to_add: "1",
        image_url: product.image_url || ""
      })
    } else {
      setRestockForm({
        source_name: "", clothing_type: "", color: "", name: "", price: "", quantity_to_add: "1", image_url: ""
      })
    }
    setIsRestockModalOpen(true)
  }

  if (isLoading || isFetching || !user || user.role !== "admin") {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-32 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 pt-32 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}. Here is what's happening today.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats?.total_revenue?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_orders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Items Sold</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.items_sold || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-semibold text-foreground">Inventory Management</h2>
            <Button onClick={() => openRestockModal()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>
          
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No inventory items found.</td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.sku_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{product.sku_id}</td>
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 capitalize">{product.clothing_type.replace("-", " ")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${product.stock_count > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {product.stock_count} in stock
                        </span>
                      </td>
                      <td className="px-4 py-3">₹{product.price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditModal(product)}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openRestockModal(product)}>
                            <RefreshCw className="h-4 w-4 mr-1" /> Restock
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <h2 className="text-2xl font-serif font-semibold text-foreground mb-6">Recent Sales</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {stats?.recent_sales?.length ? (
            <div className="divide-y divide-border">
              {stats.recent_sales.map((sale: any) => (
                <div key={sale._id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">SKU: {sale.sku_id}</p>
                    <p className="text-sm text-muted-foreground">{new Date(sale.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{sale.total_amount?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Qty: {sale.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No sales recorded yet.
            </div>
          )}
        </div>
      </div>
      <Footer />

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border shadow-xl relative">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setIsEditModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-serif font-semibold mb-6">Edit Product</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">Product Name</label>
                  <Input 
                    id="edit-name" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-price" className="text-sm font-medium">Price (₹)</label>
                  <Input 
                    id="edit-price" 
                    type="number" 
                    value={editForm.price} 
                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-image" className="text-sm font-medium">Image URL</label>
                  <Input 
                    id="edit-image" 
                    value={editForm.image_url} 
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="edit-desc" className="text-sm font-medium">Description</label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingDesc}
                      className="h-8 text-xs flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      {isGeneratingDesc ? "Generating..." : "Generate AI"}
                    </Button>
                  </div>
                  <textarea 
                    id="edit-desc"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Elegant e-commerce description..."
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock/Add Modal */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border shadow-xl relative max-h-[90vh] overflow-y-auto">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setIsRestockModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-serif font-semibold mb-6">Restock / Add Product</h2>
            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Product Name</label>
                <input 
                  type="text" required 
                  className="w-full p-2 mt-1 rounded-md border border-input bg-background"
                  value={restockForm.name} onChange={e => setRestockForm({...restockForm, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Source / Vendor</label>
                  <input 
                    type="text" required 
                    className="w-full p-2 mt-1 rounded-md border border-input bg-background"
                    value={restockForm.source_name} onChange={e => setRestockForm({...restockForm, source_name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <input 
                    type="text" required placeholder="e.g. sarees"
                    className="w-full p-2 mt-1 rounded-md border border-input bg-background"
                    value={restockForm.clothing_type} onChange={e => setRestockForm({...restockForm, clothing_type: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <input 
                    type="text" required 
                    className="w-full p-2 mt-1 rounded-md border border-input bg-background"
                    value={restockForm.color} onChange={e => setRestockForm({...restockForm, color: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price (₹)</label>
                  <input 
                    type="number" required min="1" step="0.01"
                    className="w-full p-2 mt-1 rounded-md border border-input bg-background"
                    value={restockForm.price} onChange={e => setRestockForm({...restockForm, price: e.target.value})} 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity to Add</label>
                <input 
                  type="number" required min="1"
                  className="w-full p-2 mt-1 rounded-md border border-input bg-background"
                  value={restockForm.quantity_to_add} onChange={e => setRestockForm({...restockForm, quantity_to_add: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Image URL (optional)</label>
                <input 
                  type="url" 
                  className="w-full p-2 mt-1 rounded-md border border-input bg-background"
                  value={restockForm.image_url} onChange={e => setRestockForm({...restockForm, image_url: e.target.value})} 
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsRestockModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Product"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
