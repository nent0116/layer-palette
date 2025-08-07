"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, FileSpreadsheet } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLayerPalette } from "@/contexts/layer-palette-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { DropZone } from "@/components/drop-zone"
import { CreateMapDialog } from "@/components/create-map-dialog"

export function Dashboard() {
  const { state, dispatch } = useLayerPalette()
  const router = useRouter()
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const handleCreateMap = (name: string, template: "sitemap" | "wbs" | "content-calendar" | "custom") => {
    dispatch({ type: "CREATE_MAP", payload: { name, template } })
    const newMapId = state.maps[state.maps.length]?.id || "new"
    router.push(`/edit/${newMapId}`)
    toast({
      title: "新しいマップを作成しました",
      description: `${name} が作成されました`,
    })
  }

  const handleEditMap = (mapId: string) => {
    dispatch({ type: "LOAD_MAP", payload: mapId })
    router.push(`/edit/${mapId}`)
  }

  const handleDeleteMap = (mapId: string) => {
    dispatch({ type: "DELETE_MAP", payload: mapId })
    toast({
      title: "マップを削除しました",
      description: "マップが正常に削除されました",
    })
  }

  const handleFileImport = (file: File) => {
    // TODO: Implement Excel file import
    toast({
      title: "インポート機能",
      description: "Excel インポート機能は開発中です",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              LayerPalette
            </h1>
            <p className="text-slate-600 mt-2 text-lg">階層構造を視覚的に管理し、Excel形式でエクスポート</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-xl rounded-xl px-6 py-3 text-lg font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            新規マップ
          </Button>
        </header>

        {/* Recent Maps Section */}
        <Card className="shadow-2xl rounded-3xl bg-white/80 backdrop-blur-sm border-2 border-indigo-100 animate-fade-in">
          <CardHeader className="p-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-3xl">
            <CardTitle className="text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              最近のマップ
            </CardTitle>
            <CardDescription className="text-slate-600 text-lg">作成したマップの一覧と管理</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {state.maps.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600">まだマップが作成されていません</p>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="mt-4">
                  最初のマップを作成
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>テンプレート</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>更新日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.maps.map((map) => (
                    <TableRow key={map.id}>
                      <TableCell className="font-medium">{map.name}</TableCell>
                      <TableCell className="capitalize">{map.template}</TableCell>
                      <TableCell>{map.createdAt.toLocaleDateString("ja-JP")}</TableCell>
                      <TableCell>{map.updatedAt.toLocaleDateString("ja-JP")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEditMap(map.id)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMap(map.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card className="shadow-2xl rounded-3xl bg-white/80 backdrop-blur-sm border-2 border-emerald-100 animate-fade-in">
          <CardHeader className="p-8 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-t-3xl">
            <CardTitle className="text-2xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              インポート
            </CardTitle>
            <CardDescription className="text-slate-600 text-lg">既存のExcelファイルからマップを作成</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <DropZone onFileSelect={handleFileImport} />
          </CardContent>
        </Card>
      </div>

      <CreateMapDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onCreateMap={handleCreateMap} />
    </div>
  )
}
