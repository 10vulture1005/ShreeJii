"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiVsUpload } from "@/lib/api-vsupload"
import { 
  CheckSquare, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  UploadCloud, 
  RefreshCw,
  Image as ImageIcon
} from "lucide-react"

export default function VSUploadDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")
      
      const data = await apiVsUpload.getDashboardStats(token)
      setStats(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <button 
          onClick={fetchStats}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          title="Refresh stats"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Needs Review Card */}
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform">
            <CheckSquare className="w-16 h-16 text-yellow-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-yellow-800 mb-1">Needs Review</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{stats?.in_review || 0}</h2>
            <Link 
              href="/admin/vsupload/review" 
              className="text-sm font-medium text-yellow-700 hover:text-yellow-800 flex items-center"
            >
              Go to Review Queue →
            </Link>
          </div>
        </div>

        {/* Processing Card */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin-slow" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-blue-800 mb-1">Processing Jobs</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{stats?.processing || 0}</h2>
            <Link 
              href="/admin/vsupload/batches" 
              className="text-sm font-medium text-blue-700 hover:text-blue-800 flex items-center"
            >
              View Active Batches →
            </Link>
          </div>
        </div>

        {/* Published Today Card */}
        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-green-800 mb-1">Published Today</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{stats?.published_today || 0}</h2>
            <Link 
              href="/admin/vsupload/review?status=published" 
              className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center"
            >
              View Published →
            </Link>
          </div>
        </div>

        {/* Failed Jobs Card */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-red-800 mb-1">Failed Jobs</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{stats?.failed || 0}</h2>
            <Link 
              href="/admin/vsupload/batches" 
              className="text-sm font-medium text-red-700 hover:text-red-800 flex items-center"
            >
              View Failures →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            href="/admin/vsupload/upload"
            className="flex items-center p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mr-4 group-hover:bg-indigo-100 transition-colors">
              <UploadCloud className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Upload New Batch</h3>
              <p className="text-sm text-gray-500">Drag and drop folders of garment photos to generate AI model listings.</p>
            </div>
          </Link>

          <Link 
            href="/admin/vsupload/review"
            className="flex items-center p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mr-4 group-hover:bg-yellow-100 transition-colors">
              <ImageIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">Review Generated Listings</h3>
              <p className="text-sm text-gray-500">Approve AI photos, edit metadata, and publish products to the store.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
