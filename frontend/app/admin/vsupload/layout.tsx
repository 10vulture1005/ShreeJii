"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  UploadCloud, 
  CheckSquare, 
  History, 
  ArrowLeft 
} from "lucide-react"

export default function VSUploadLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", href: "/admin/vsupload", icon: LayoutDashboard, exact: true },
    { name: "Upload", href: "/admin/vsupload/upload", icon: UploadCloud, exact: false },
    { name: "Review Queue", href: "/admin/vsupload/review", icon: CheckSquare, exact: false },
    { name: "Batch History", href: "/admin/vsupload/batches", icon: History, exact: false },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">VSUpload</h1>
        </div>
        
        <div className="p-4">
          <Link 
            href="/admin" 
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Admin
          </Link>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname?.startsWith(item.href)
              
              const Icon = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? "bg-indigo-50 text-indigo-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? "text-indigo-700" : "text-gray-400"}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
