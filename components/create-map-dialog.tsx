"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CreateMapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateMap: (name: string, template: "sitemap" | "wbs" | "content-calendar" | "custom") => void
}

const templates = [
  {
    id: "sitemap" as const,
    name: "サイトマップ",
    description: "Webサイトの構造を管理",
    colors: ["#2563EB", "#10B981", "#F59E0B", "#EF4444"],
  },
  {
    id: "wbs" as const,
    name: "WBS",
    description: "プロジェクトの作業分解構造",
    colors: ["#3B82F6", "#06B6D4", "#10B981", "#F59E0B"],
  },
  {
    id: "content-calendar" as const,
    name: "コンテンツカレンダー",
    description: "コンテンツ制作スケジュール管理",
    colors: ["#8B5CF6", "#EC4899", "#F97316", "#84CC16"],
  },
  {
    id: "custom" as const,
    name: "カスタム",
    description: "空のテンプレートから開始",
    colors: ["#6B7280"],
  },
]

export function CreateMapDialog({ open, onOpenChange, onCreateMap }: CreateMapDialogProps) {
  const [name, setName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof templates)[0]["id"]>("sitemap")

  const handleCreate = () => {
    if (name.trim()) {
      onCreateMap(name.trim(), selectedTemplate)
      setName("")
      setSelectedTemplate("sitemap")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">新しいマップを作成</DialogTitle>
          <DialogDescription className="text-gray-600">
            マップの名前とテンプレートを選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="map-name" className="text-gray-700">マップ名</Label>
            <Input
              id="map-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 会社サイトマップ"
              className="bg-white border-gray-300"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-gray-700">テンプレート</Label>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all bg-white border ${
                    selectedTemplate === template.id
                      ? "ring-2 ring-blue-500 bg-blue-50 border-blue-200"
                      : "hover:shadow-md border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-gray-900">{template.name}</CardTitle>
                      <div className="flex gap-1">
                        {template.colors.map((color, index) => (
                          <div 
                            key={index} 
                            className="w-3 h-3 rounded-full border border-gray-200" 
                            style={{ backgroundColor: color }} 
                          />
                        ))}
                      </div>
                    </div>
                    <CardDescription className="text-xs text-gray-600">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-white">
            キャンセル
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
