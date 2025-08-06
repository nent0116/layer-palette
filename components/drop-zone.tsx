"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload } from "lucide-react"
import { Card } from "@/components/ui/card"

interface DropZoneProps {
  onFileSelect: (file: File) => void
}

export function DropZone({ onFileSelect }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const excelFile = files.find((file) => file.name.endsWith(".xlsx") || file.name.endsWith(".csv"))

      if (excelFile) {
        onFileSelect(excelFile)
      }
    },
    [onFileSelect],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  return (
    <Card
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
        isDragOver
          ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/5"
          : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-primary))]/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <Upload className="w-12 h-12 text-[rgb(var(--color-text-sub))] mx-auto mb-4" />
      <h3 className="text-lg font-medium text-[rgb(var(--color-text-base))] mb-2">
        ファイルをドロップまたはクリックして選択
      </h3>
      <p className="text-[rgb(var(--color-text-sub))] text-sm">.xlsx または .csv ファイルをサポート</p>
      <input id="file-input" type="file" accept=".xlsx,.csv" onChange={handleFileInput} className="hidden" />
    </Card>
  )
}
