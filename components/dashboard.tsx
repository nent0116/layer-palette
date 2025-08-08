"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Edit, Trash2, FileSpreadsheet, Keyboard, BookOpen, CheckCircle2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLayerPalette } from "@/contexts/layer-palette-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { CreateMapDialog } from "@/components/create-map-dialog"

export function Dashboard() {
  const { state, dispatch } = useLayerPalette()
  const router = useRouter()
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [pendingMap, setPendingMap] = useState<{ name: string; template: string } | null>(null)
  const previousMapsLength = useRef(state.maps.length)

  const handleCreateMap = (name: string, template: "sitemap" | "wbs" | "content-calendar" | "custom") => {
    setPendingMap({ name, template })
    dispatch({ type: "CREATE_MAP", payload: { name, template } })
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

  // インポート機能はトップでは提供しないため、関連処理は削除

  // 新しいマップが作成されたらナビゲーションする
  useEffect(() => {
    if (pendingMap && state.maps.length > previousMapsLength.current) {
      const newMap = state.maps.find(map => 
        map.name === pendingMap.name && map.template === pendingMap.template
      )
      if (newMap) {
        router.push(`/edit/${newMap.id}`)
        setPendingMap(null)
      }
    }
    previousMapsLength.current = state.maps.length
  }, [state.maps, pendingMap, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-10">
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

        {/* Guide Section */}
        <Card className="my-10 shadow-2xl rounded-3xl bg-white/90 backdrop-blur border-2 border-indigo-100 animate-fade-in">
          <CardHeader className="p-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-t-3xl">
            <CardTitle className="text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              操作説明
            </CardTitle>
            <CardDescription className="text-slate-600 text-lg">基本的な使い方とキーボードショートカット</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  基本操作
                </h3>
                <ul className="list-none text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <span>「新規マップ」ボタンからマップを作成</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <span>一覧の編集アイコンから編集画面へ移動</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <span>ごみ箱アイコンでマップを削除</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                  <Keyboard className="w-5 h-5 text-indigo-600" />
                  ショートカット（編集画面）
                </h3>
                <ul className="list-none text-slate-700 space-y-2">
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" /><span>Ctrl + Z: 元に戻す</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" /><span>Ctrl + Shift + Z または Ctrl + Y: やり直し</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" /><span>Enter: 同じ階層にノード追加</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" /><span>Shift + Enter: 子ノードを追加</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" /><span>Delete: ノード削除</span></li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-purple-500 mt-0.5" /><span>Ctrl + S: 保存</span></li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateMapDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onCreateMap={handleCreateMap} />
    </div>
  )
}
