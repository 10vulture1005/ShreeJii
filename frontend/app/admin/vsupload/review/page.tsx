"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { apiVsUpload } from "@/lib/api-vsupload"
import { 
  Loader2, 
  AlertCircle, 
  Search,
  Filter,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

// A sub-component to handle the actual fetching and logic that uses searchParams
function ReviewQueueContent() {
  const searchParams = useSearchParams()
  const batchIdParam = searchParams.get("batch_id")
  const initialStatus = searchParams.get("status") || "under_review"

  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [page, setPage] = useState(1)
  const limit = 20

  const fetchQueue = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      const data = await apiVsUpload.getReviewQueue(token, {
        status: statusFilter,
        batch_id: batchIdParam || undefined,
        page,
        limit
      })
      
      setProducts(data.items)
      setTotal(data.total)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load review queue")
    } finally {
      setLoading(false)
    }
  }

  // Refetch when filters or page change
  useEffect(() => {
    fetchQueue()
  }, [statusFilter, batchIdParam, page])

  const tabs = [
    { id: "under_review", label: "Needs Review", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
    { id: "published", label: "Published", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
    { id: "rejected", label: "Rejected", icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {batchIdParam 
              ? <>Showing items from batch <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded">{batchIdParam}</span></>
              : "Review AI-generated listings, edit metadata, and publish."}
          </p>
        </div>
        
        {batchIdParam && (
          <Link 
            href="/admin/vsupload/review" 
            className="text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full flex items-center transition-colors"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Clear Batch Filter
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id)
                  setPage(1)
                }}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${isActive 
                    ? "border-indigo-500 text-indigo-600" 
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                `}
              >
                <Icon className={`w-5 h-5 mr-2 ${isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Grid */}
      {loading && products.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
          <p className="text-gray-500 text-sm">
            There are no products with the status '{statusFilter}' {batchIdParam ? "in this batch" : "at the moment"}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const primaryImageUrl = product.image_urls?.[0] || product.raw_photo_urls?.[0] || "/placeholder.png"
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
            const fullImageUrl = primaryImageUrl.startsWith("http") ? primaryImageUrl : `${baseUrl}${primaryImageUrl}`

            return (
              <Link 
                href={`/admin/vsupload/review/${product.id}`}
                key={product.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col"
              >
                <div className="aspect-[3/4] relative bg-gray-100 overflow-hidden">
                  <img 
                    src={fullImageUrl} 
                    alt={product.title || "Product Image"}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'
                    }}
                  />
                  {product.image_urls?.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                      +{product.image_urls.length - 1} more
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1" title={product.title}>
                    {product.title || "Untitled Product"}
                  </h3>
                  <div className="text-xs text-gray-500 mb-3 flex-grow line-clamp-2">
                    {product.description || "No description generated."}
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-900">
                      {product.price ? `₹${product.price}` : <span className="text-gray-400 italic">No Price</span>}
                    </span>
                    {statusFilter === "under_review" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                        Review
                      </span>
                    )}
                    {statusFilter === "published" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                        Published
                      </span>
                    )}
                    {statusFilter === "rejected" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
          </p>
          <div className="flex items-center space-x-2">
            <button 
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              disabled={page * limit >= total || loading}
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <ReviewQueueContent />
    </Suspense>
  )
}
