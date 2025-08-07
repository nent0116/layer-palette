"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ColorPicker } from "@/components/color-picker"
import { Palette, FileText, Save, RotateCcw } from "lucide-react"
import type { LayerNode } from "@/contexts/layer-palette-context"

interface DetailPanelProps {
  selectedNode?: LayerNode
  onNodeUpdate: (nodeId: string, updates: Partial<LayerNode>) => void
}

export function DetailPanel({ selectedNode, onNodeUpdate }: DetailPanelProps) {
  const [title, setTitle] = useState("")
  const [backgroundColor, setBackgroundColor] = useState("#6366F1")
  const [notes, setNotes] = useState("")
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (selectedNode) {
      setTitle(selectedNode.title)
      setBackgroundColor(selectedNode.backgroundColor)
      setNotes(selectedNode.notes)
      setHasChanges(false)
    }
  }, [selectedNode])

  useEffect(() => {
    if (selectedNode) {
      const hasChanges =
        title !== selectedNode.title || backgroundColor !== selectedNode.backgroundColor || notes !== selectedNode.notes
      setHasChanges(hasChanges)
    }
  }, [title, backgroundColor, notes, selectedNode])

  const handleSave = () => {
    if (selectedNode && hasChanges) {
      onNodeUpdate(selectedNode.id, {
        title,
        backgroundColor,
        notes,
      })
      setHasChanges(false)
    }
  }

  const handleReset = () => {
    if (selectedNode) {
      setTitle(selectedNode.title)
      setBackgroundColor(selectedNode.backgroundColor)
      setNotes(selectedNode.notes)
      setHasChanges(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
  }

  if (!selectedNode) {
    return (
      <div className="h-full bg-gradient-to-br from-emerald-50 to-teal-50 border-r-2 border-emerald-100 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Palette className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">ノードを選択してください</h3>
            <p className="text-slate-500">左側のツリーからノードを選択すると、詳細を編集できます</p>
            <div className="mt-6 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">編集のヒント</h4>
              <div className="text-xs text-slate-600 space-y-1 text-left">
                <div>• ノードをクリックして選択</div>
                <div>• タイトルと背景色を変更可能</div>
                <div>• メモでノードの詳細を記録</div>
                <div>• Ctrl+S で保存</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full bg-gradient-to-br from-emerald-50 to-teal-50 border-r-2 border-emerald-100 p-6"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          詳細設定
        </h3>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              リセット
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg animate-fade-in"
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="properties" className="h-[calc(100%-80px)]">
        <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-sm">
          <TabsTrigger value="properties" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Palette className="w-4 h-4 mr-2" />
            プロパティ
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            メモ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-6 mt-6">
          <Card className="border-2 border-emerald-100 bg-white/70 backdrop-blur-sm shadow-lg animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-slate-700">基本設定</CardTitle>
              <CardDescription>ノードの基本的な設定を変更できます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-slate-700">
                  タイトル
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ノードのタイトルを入力"
                  className="border-2 border-emerald-200 focus:border-emerald-500 bg-white/80"
                  aria-describedby="title-help"
                />
                <span id="title-help" className="sr-only">
                  ノードの表示名を設定します
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">背景色</Label>
                <ColorPicker color={backgroundColor} onChange={setBackgroundColor} />
              </div>

              {/* Node Info */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-800 mb-2">ノード情報</h4>
                <div className="text-xs text-emerald-700 space-y-1">
                  <div>ID: {selectedNode.id}</div>
                  <div>階層: {selectedNode.parentId ? "子ノード" : "ルートノード"}</div>
                  <div>子ノード数: {selectedNode.children.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card className="border-2 border-emerald-100 bg-white/70 backdrop-blur-sm shadow-lg animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-slate-700">メモ</CardTitle>
              <CardDescription>このノードに関する詳細な情報やメモを記録できます</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="メモを入力してください..."
                className="min-h-[300px] border-2 border-emerald-200 focus:border-emerald-500 bg-white/80 resize-none"
                aria-describedby="notes-help"
              />
              <span id="notes-help" className="sr-only">
                ノードに関する詳細情報やメモを記載できます
              </span>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 animate-fade-in shadow-lg">
            <p className="text-sm text-amber-700 mb-3 font-medium">変更が保存されていません</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                保存 (Ctrl+S)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent"
              >
                リセット
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
