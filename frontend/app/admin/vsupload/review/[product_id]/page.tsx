"use client"

import { useEffect, useState, use, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiVsUpload } from "@/lib/api-vsupload"
import { 
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  ImageIcon
} from "lucide-react"

export default function ProductEditorPage({ params }: { params: Promise<{ product_id: string }> }) {
  const router = useRouter()
  // React 19 unwrapping of params
  const { product_id } = use(params)
  
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState<any>({})

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      const data = await apiVsUpload.getProduct(token, product_id)
      setProduct(data)
      
      // Initialize form data
      setFormData({
        title: data.title || "",
        description: data.description || "",
        price: data.price || "",
        stock_count: data.stock_count || "",
        sku: data.sku || "",
        category: data.category || "",
        sizes: (data.sizes || []).join(", "),
        color: data.color || "",
        style: data.style || "",
        occasion: (data.occasion || []).join(", "),
        sleeve: data.sleeve || "",
        neckline: data.neckline || "",
        fabric: data.fabric || "",
        length: data.length || "",
      })
      
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load product")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [product_id])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const preparePayload = () => {
    const payload = { ...formData }
    // Convert comma-separated strings back to arrays
    payload.sizes = payload.sizes ? payload.sizes.split(",").map((s: string) => s.trim()).filter(Boolean) : []
    payload.occasion = payload.occasion ? payload.occasion.split(",").map((s: string) => s.trim()).filter(Boolean) : []
    // Convert price to number
    if (payload.price) {
      payload.price = parseFloat(payload.price)
    } else {
      payload.price = null
    }
    if (payload.stock_count) {
      payload.stock_count = parseInt(payload.stock_count, 10)
    } else {
      payload.stock_count = null
    }
    return payload
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      setError(null)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      const payload = preparePayload()
      await apiVsUpload.updateProduct(token, product_id, payload)
      showSuccess("Draft saved successfully")
      // Refresh to get latest state
      await fetchProduct()
    } catch (err: any) {
      setError(err.message || "Failed to save draft")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      setActionLoading("publish")
      setError(null)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      // Save any pending changes first
      const payload = preparePayload()
      await apiVsUpload.updateProduct(token, product_id, payload)
      
      // Then publish
      await apiVsUpload.publishProduct(token, product_id)
      
      showSuccess("Product published successfully!")
      router.push("/admin/vsupload/review?status=published")
    } catch (err: any) {
      setError(err.message || "Failed to publish product")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    try {
      setActionLoading("reject")
      setError(null)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      await apiVsUpload.rejectProduct(token, product_id, rejectReason)
      
      setShowRejectModal(false)
      showSuccess("Product rejected")
      router.push("/admin/vsupload/review?status=rejected")
    } catch (err: any) {
      setError(err.message || "Failed to reject product")
      setActionLoading(null)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm("Are you sure you want to discard these images and regenerate them? This will send the job back to the processing queue.")) {
      return
    }
    
    try {
      setActionLoading("regenerate")
      setError(null)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      await apiVsUpload.regenerateImages(token, product_id)
      
      showSuccess("Image regeneration started")
      router.push("/admin/vsupload/batches")
    } catch (err: any) {
      setError(err.message || "Failed to regenerate images")
      setActionLoading(null)
    }
  }

  if (loading && !product) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-xl flex items-center justify-center max-w-2xl mx-auto mt-10">
        <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-lg">Error Loading Product</h3>
          <p>{error}</p>
          <Link href="/admin/vsupload/review" className="text-red-800 underline mt-2 inline-block">
            Return to Review Queue
          </Link>
        </div>
      </div>
    )
  }

  const isEditable = product?.status === "under_review"

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-0 z-10">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()}
            className="p-2 mr-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 line-clamp-1">
              {product.title || "Untitled Product"}
            </h1>
            <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
              <span className="font-mono">ID: {product.id.substring(0, 8)}...</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                product.status === "under_review" ? "bg-yellow-100 text-yellow-800" :
                product.status === "published" ? "bg-green-100 text-green-800" :
                "bg-red-100 text-red-800"
              }`}>
                {product.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {isEditable && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={!!actionLoading || saving}
              className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {actionLoading === "regenerate" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Regenerate
            </button>
            
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={!!actionLoading || saving}
              className="flex items-center px-3 py-2 bg-white border border-red-200 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </button>
            
            <button
              onClick={handleSaveDraft}
              disabled={!!actionLoading || saving}
              className="flex items-center px-3 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </button>
            
            <button
              onClick={handlePublish}
              disabled={!!actionLoading || saving}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {actionLoading === "publish" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Publish
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Images */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">AI Generated Model Photos</h2>
            </div>
            <div className="p-4">
              {product.image_urls?.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {product.image_urls.map((url: string, idx: number) => (
                    <div key={idx} className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      <img 
                        src={url.startsWith("http") ? url : `${baseUrl}${url}`} 
                        alt={`Generated Model ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p>No generated images</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900">Raw Uploaded Photos</h2>
            </div>
            <div className="p-4 overflow-x-auto">
              {product.raw_photo_urls?.length > 0 ? (
                <div className="flex gap-4">
                  {product.raw_photo_urls.map((url: string, idx: number) => (
                    <div key={idx} className="w-32 h-40 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      <img 
                        src={url.startsWith("http") ? url : `${baseUrl}${url}`} 
                        alt={`Raw Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4">No raw photos available</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="space-y-6">
          {/* Admin Required Fields */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-indigo-50 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-indigo-900">Store Requirements (Required for Publishing)</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="e.g. 2999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    name="stock_count"
                    value={formData.stock_count}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="e.g. SRJ-SS26-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="e.g. Sarees, Dresses"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma separated) *</label>
                <input
                  type="text"
                  name="sizes"
                  value={formData.sizes}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="e.g. S, M, L, XL"
                />
              </div>
            </div>
          </div>

          {/* AI Generated Metadata */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900">AI Generated Metadata</h2>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Auto-extracted</span>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={!isEditable}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Style</label>
                  <input
                    type="text"
                    name="style"
                    value={formData.style}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fabric</label>
                  <input
                    type="text"
                    name="fabric"
                    value={formData.fabric}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Occasion</label>
                  <input
                    type="text"
                    name="occasion"
                    value={formData.occasion}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sleeve</label>
                  <input
                    type="text"
                    name="sleeve"
                    value={formData.sleeve}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Neckline</label>
                  <input
                    type="text"
                    name="neckline"
                    value={formData.neckline}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Reject Product</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-500">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to reject this product? It will be moved to the Rejected tab and not shown in the store. You can optionally provide a reason.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                placeholder="e.g. Poor image generation quality..."
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 border-t border-gray-200">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === "reject"}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === "reject" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
