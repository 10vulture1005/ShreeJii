const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const apiVsUpload = {
  // ── Dashboard ───────────────────────────────────────────────────
  getDashboardStats: async (token: string) => {
    const res = await fetch(`${API_URL}/api/vsupload/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch dashboard stats")
    return res.json()
  },

  // ── Batches ─────────────────────────────────────────────────────
  getBatches: async (token: string, page = 1, limit = 20) => {
    const res = await fetch(`${API_URL}/api/vsupload/batches?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch batches")
    return res.json()
  },

  submitBatch: async (token: string, batchName: string, jobsJson: string, files: File[]) => {
    const formData = new FormData()
    formData.append("batch_name", batchName)
    formData.append("jobs", jobsJson)
    files.forEach((file) => {
      formData.append("files", file)
    })

    const res = await fetch(`${API_URL}/api/vsupload/jobs/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: Do not set Content-Type for FormData, browser sets it with boundary
      },
      body: formData,
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to submit batch")
    }
    return res.json()
  },

  // ── Jobs ────────────────────────────────────────────────────────
  getJobStatus: async (token: string, jobId: string) => {
    const res = await fetch(`${API_URL}/api/vsupload/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch job status")
    return res.json()
  },

  retryJob: async (token: string, jobId: string) => {
    const res = await fetch(`${API_URL}/api/vsupload/jobs/${jobId}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to retry job")
    return res.json()
  },

  // ── Review Queue & Products ─────────────────────────────────────
  getReviewQueue: async (token: string, params?: { status?: string; batch_id?: string; page?: number; limit?: number }) => {
    const url = new URL(`${API_URL}/api/vsupload/review-queue`)
    if (params?.status) url.searchParams.append("status_filter", params.status)
    if (params?.batch_id) url.searchParams.append("batch_id", params.batch_id)
    if (params?.page) url.searchParams.append("page", params.page.toString())
    if (params?.limit) url.searchParams.append("limit", params.limit.toString())

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch review queue")
    return res.json()
  },

  getProduct: async (token: string, productId: string) => {
    const res = await fetch(`${API_URL}/api/vsupload/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to fetch product")
    return res.json()
  },

  updateProduct: async (token: string, productId: string, data: any) => {
    const res = await fetch(`${API_URL}/api/vsupload/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to update product")
    return res.json()
  },

  publishProduct: async (token: string, productId: string) => {
    const res = await fetch(`${API_URL}/api/vsupload/products/${productId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      if (errorData.detail?.missing) {
        throw new Error(`Missing required fields: ${errorData.detail.missing.join(", ")}`)
      }
      throw new Error(errorData.detail || "Failed to publish product")
    }
    return res.json()
  },

  rejectProduct: async (token: string, productId: string, reason = "") => {
    const res = await fetch(`${API_URL}/api/vsupload/products/${productId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) throw new Error("Failed to reject product")
    return res.json()
  },

  regenerateImages: async (token: string, productId: string) => {
    const res = await fetch(`${API_URL}/api/vsupload/products/${productId}/regenerate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Failed to regenerate images")
    return res.json()
  },
}
