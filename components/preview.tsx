"use client"

import { useEffect, useState, useCallback } from "react"
import { useLayerPalette } from "@/contexts/layer-palette-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Edit, FileSpreadsheet, FileText } from 'lucide-react'
import { useRouter } from "next/navigation"
import { LivePreview } from "@/components/live-preview"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel, exportToCSV } from "@/utils/excel-export"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PreviewProps {
  mapId: string
}

export function Preview({ mapId }: PreviewProps) {
  const { state, dispatch } = useLayerPalette()
  const router = useRouter()
  const { toast } = useToast()
  const [exportData, setExportData] = useState<any>(null)

  useEffect(() => {
    if (mapId) {
      dispatch({ type: "LOAD_MAP", payload: mapId })
    }
  }, [mapId, dispatch])

  const currentMap = state.currentMap

  // Callback to receive export data from LivePreview
  const handleExportDataReady = useCallback((data: any) => {
    // Add the current map name to the export data
    const updatedData = {
      ...data,
      mapName: currentMap?.name || "LayerPalette Map"
    }
    setExportData(updatedData)
  }, [currentMap?.name])

  const handleExportExcel = () => {
    if (!exportData) {
      toast({
        title: "エクスポートエラー",
        description: "プレビューデータが見つかりません。しばらく待ってから再試行してください。",
        variant: "destructive",
      })
      return
    }

    try {
      exportToExcel(exportData)
      toast({
        title: "Excelエクスポート完了",
        description: `${exportData.mapName}.xlsx がダウンロードされました`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "エクスポートエラー",
        description: "Excelファイルのエクスポートに失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleExportCSV = () => {
    if (!exportData) {
      toast({
        title: "エクスポートエラー",
        description: "プレビューデータが見つかりません。しばらく待ってから再試行してください。",
        variant: "destructive",
      })
      return
    }

    try {
      exportToCSV(exportData)
      toast({
        title: "CSVエクスポート完了",
        description: `${exportData.mapName}.csv がダウンロードされました`,
      })
    } catch (error) {
      console.error('CSV export error:', error)
      toast({
        title: "エクスポートエラー",
        description: "CSVファイルのエクスポートに失敗しました",
        variant: "destructive",
      })
    }
  }

  if (!currentMap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-700 mb-2">マップが見つかりません</h2>
          <Button onClick={() => router.push("/")} variant="outline">
            ダッシュボードに戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b-2 border-indigo-100 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/edit/${mapId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              編集に戻る
            </Button>
            <div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {currentMap.name} - プレビュー
              </h1>
              <p className="text-sm text-slate-600">Excel風表示</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/edit/${mapId}`)}>
              <Edit className="w-4 h-4 mr-2" />
              編集
            </Button>
            
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  エクスポート
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-scale-in">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  Excel形式 (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  CSV形式 (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Full Preview */}
      <div className="h-[calc(100vh-80px)]">
        <LivePreview
          nodes={currentMap.rootNodes}
          onNodeSelect={() => {}} // No selection in preview mode
          template={currentMap.template}
          onExportDataReady={handleExportDataReady}
        />
      </div>
    </div>
  )
}
