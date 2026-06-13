"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiVsUpload } from "@/lib/api-vsupload"
import { UploadZone, FileGroup } from "@/components/vsupload/UploadZone"
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react"

export default function UploadBatchPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<FileGroup[]>([])
  const [batchName, setBatchName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!batchName.trim()) {
      setError("Please enter a batch name")
      return
    }
    if (groups.length === 0) {
      setError("Please select at least one folder of images")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      
      const token = localStorage.getItem("token")
      if (!token) throw new Error("Not authenticated")

      // We need to flatten all files into a single array, and pass indices
      const allFiles: File[] = []
      const jobsConfig: any[] = []

      groups.forEach((group) => {
        const fileIndices: number[] = []
        group.files.forEach((file) => {
          fileIndices.push(allFiles.length)
          allFiles.push(file)
        })
        jobsConfig.push({
          group_name: group.groupName,
          file_indices: fileIndices
        })
      })

      const jobsJson = JSON.stringify(jobsConfig)
      
      await apiVsUpload.submitBatch(token, batchName, jobsJson, allFiles)
      
      setSuccess(true)
      setTimeout(() => {
        router.push("/admin/vsupload/batches")
      }, 2000)
      
    } catch (err: any) {
      setError(err.message || "Failed to submit batch")
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Batch Submitted Successfully!</h2>
        <p className="text-gray-500 mb-6">Your images are now being processed by the AI pipeline.</p>
        <p className="text-sm text-gray-400 flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Redirecting to batch history...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload New Batch</h1>
        <p className="text-sm text-gray-500 mt-1">Upload folders containing photos of garments. Each folder represents one clothing item.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
        <div>
          <label htmlFor="batchName" className="block text-sm font-medium text-gray-700 mb-1">
            Batch Name
          </label>
          <input
            type="text"
            id="batchName"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="e.g. Summer Collection 2026"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Garment Folders
          </label>
          <UploadZone onGroupsChange={setGroups} />
        </div>

        <div className="pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || groups.length === 0 || !batchName.trim()}
            className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              `Submit ${groups.length} Items`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
