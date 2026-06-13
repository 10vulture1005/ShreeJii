"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiVsUpload } from "@/lib/api-vsupload"
import { 
  Loader2, 
  AlertCircle, 
  ChevronRight, 
  Package
} from "lucide-react"

export default function BatchHistoryPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetchBatches = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      const data = await apiVsUpload.getBatches(token, page, 20)
      setBatches(data.items)
      setTotal(data.total)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load batches")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [page])

  if (loading && batches.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch History</h1>
          <p className="text-sm text-gray-500 mt-1">View the status of all uploaded photo batches.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {batches.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No batches found. Upload your first batch to see it here.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Name & ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status Breakdown</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => {
                const date = new Date(batch.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                })
                const counts = batch.status_counts || {}

                return (
                  <tr key={batch.batch_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{batch.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{batch.batch_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{date}</div>
                      <div className="text-xs text-gray-500">by {batch.submitted_by}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {batch.total_jobs} jobs
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2 text-xs font-medium">
                        {counts.queued > 0 && <span className="text-gray-500" title="Queued">{counts.queued} Q</span>}
                        {counts.processing > 0 && <span className="text-blue-600" title="Processing">{counts.processing} P</span>}
                        {counts.under_review > 0 && <span className="text-yellow-600" title="Under Review">{counts.under_review} R</span>}
                        {counts.published > 0 && <span className="text-green-600" title="Published">{counts.published} ✓</span>}
                        {counts.failed > 0 && <span className="text-red-600" title="Failed">{counts.failed} ✗</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/admin/vsupload/review?batch_id=${batch.batch_id}`}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end"
                      >
                        View Items
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination (Simplified) */}
      {total > 20 && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page}
          </span>
          <button 
            disabled={batches.length < 20}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
