"use client"

import React, { useRef, useState, useCallback } from "react"
import { UploadCloud, Folder, X, Image as ImageIcon } from "lucide-react"

export interface FileGroup {
  groupName: string
  files: File[]
}

interface UploadZoneProps {
  onGroupsChange: (groups: FileGroup[]) => void
}

export function UploadZone({ onGroupsChange }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [groups, setGroups] = useState<FileGroup[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract files keeping track of their parent folder name
  const processFiles = (fileList: FileList | File[]) => {
    const newGroups: Record<string, File[]> = {}
    
    Array.from(fileList).forEach(file => {
      // Only accept images
      if (!file.type.startsWith("image/")) return

      // Attempt to get folder name from webkitRelativePath (e.g., "Folder/image.jpg")
      let groupName = "Ungrouped"
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split("/")
        if (parts.length > 1) {
          groupName = parts[parts.length - 2] // Parent folder
        }
      }

      if (!newGroups[groupName]) {
        newGroups[groupName] = []
      }
      newGroups[groupName].push(file)
    })

    // Merge with existing groups
    setGroups(prev => {
      const updated = [...prev]
      Object.entries(newGroups).forEach(([name, files]) => {
        const existingIdx = updated.findIndex(g => g.groupName === name)
        if (existingIdx >= 0) {
          // Merge files avoiding duplicates by name
          const existingNames = new Set(updated[existingIdx].files.map(f => f.name))
          const newUnique = files.filter(f => !existingNames.has(f.name))
          updated[existingIdx].files = [...updated[existingIdx].files, ...newUnique]
        } else {
          updated.push({ groupName: name, files })
        }
      })
      
      onGroupsChange(updated)
      return updated
    })
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    // Note: To properly support dropping folders, you'd use e.dataTransfer.items and webkitGetAsEntry.
    // For simplicity here, if the user drags a folder, modern browsers populate e.dataTransfer.files 
    // but the relative paths might be lost. Using the file input with webkitdirectory is more reliable.
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
    // Reset input so the same folder can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeGroup = (groupName: string) => {
    setGroups(prev => {
      const updated = prev.filter(g => g.groupName !== groupName)
      onGroupsChange(updated)
      return updated
    })
  }

  return (
    <div className="space-y-6">
      <div 
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:bg-gray-50 bg-white"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-indigo-600" : "text-gray-400"}`} />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Upload Garment Folders</h3>
        <p className="text-sm text-gray-500 mb-6">
          Each folder represents one clothing item. Images inside will be grouped together.
        </p>
        
        <div className="flex justify-center space-x-4">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Select Folders
          </button>
          
          <input 
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            // @ts-ignore - webkitdirectory is a non-standard but widely supported attribute
            webkitdirectory="true"
            directory="true"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {groups.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Queued Items ({groups.length})</h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
            {groups.map((group) => (
              <li key={group.groupName} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center mr-4">
                    <Folder className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{group.groupName}</h4>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {group.files.length} photos
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => removeGroup(group.groupName)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Remove group"
                >
                  <X className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
