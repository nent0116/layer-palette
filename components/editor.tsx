"use client"

import { useEffect, useState, useCallback } from "react"
import { useLayerPalette, getColorForLevel } from "@/contexts/layer-palette-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Eye, Download, Undo, Redo, Save, FileSpreadsheet, FileText } from 'lucide-react'
import { useRouter } from "next/navigation"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { TreeView } from "@/components/tree-view"
import { DetailPanel } from "@/components/detail-panel"
import { LivePreview } from "@/components/live-preview"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel, exportToCSV } from "@/utils/excel-export"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LayerNode } from "@/contexts/layer-palette-context"

interface EditorProps {
  mapId: string
}

export function Editor({ mapId }: EditorProps) {
  const { state, dispatch } = useLayerPalette()
  const router = useRouter()
  const { toast } = useToast()

  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [exportData, setExportData] = useState<any>(null)

  useEffect(() => {
    if (mapId && mapId !== "new") {
      dispatch({ type: "LOAD_MAP", payload: mapId })
    }
  }, [mapId, dispatch])

  // Find selected node
  const findNodeById = useCallback((nodes: LayerNode[], nodeId: string): LayerNode | undefined => {
    for (const node of nodes) {
      if (node.id === nodeId) return node
      const found = findNodeById(node.children, nodeId)
      if (found) return found
    }
    return undefined
  }, [])

  const selectedNode = selectedNodeId ? findNodeById(state.currentMap?.rootNodes || [], selectedNodeId) : undefined

  // Callback to receive export data from LivePreview - memoized to prevent infinite loops
  const handleExportDataReady = useCallback((data: any) => {
    // Add the current map name to the export data
    const updatedData = {
      ...data,
      mapName: state.currentMap?.name || "LayerPalette Map"
    }
    setExportData(updatedData)
  }, [state.currentMap?.name])

  // Node management functions
  const handleNodeAdd = useCallback(
    (parentId?: string) => {
      if (!state.currentMap) return

      // Determine the level for the new node
      let newNodeLevel = 0
      if (parentId) {
        const parentNode = findNodeById(state.currentMap.rootNodes, parentId)
        newNodeLevel = (parentNode?.level || 0) + 1
      }

      const newNode = {
        title: "新しいノード",
        backgroundColor: getColorForLevel(state.currentMap.template, newNodeLevel),
        notes: "",
      }
      dispatch({ type: "ADD_NODE", payload: { parentId, node: newNode } })
      toast({
        title: "ノードを追加しました",
        description: parentId ? "子ノードとして追加されました" : "ルートレベルに追加されました",
      })
    },
    [dispatch, toast, state.currentMap, findNodeById],
  )

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<LayerNode>) => {
      dispatch({ type: "UPDATE_NODE", payload: { nodeId, updates } })
    },
    [dispatch],
  )

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      dispatch({ type: "DELETE_NODE", payload: nodeId })
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(undefined)
      }
      toast({
        title: "ノードを削除しました",
        description: "ノードとその子ノードが削除されました",
      })
    },
    [dispatch, selectedNodeId, toast],
  )

  const handleNodeCopy = useCallback(
    (nodeId: string) => {
      const nodeToCopy = findNodeById(state.currentMap?.rootNodes || [], nodeId)
      if (nodeToCopy && state.currentMap) {
        const copiedNode = {
          title: `${nodeToCopy.title} (コピー)`,
          backgroundColor: nodeToCopy.backgroundColor,
          notes: nodeToCopy.notes,
          children: [], // For now, don't copy children
        }
        dispatch({ type: "ADD_NODE", payload: { parentId: nodeToCopy.parentId, node: copiedNode } })
        toast({
          title: "ノードをコピーしました",
          description: `${nodeToCopy.title} がコピーされました`,
        })
      }
    },
    [dispatch, findNodeById, state.currentMap?.rootNodes, toast, state.currentMap],
  )

  const handleNodeMove = useCallback(
    (nodeId: string, newParentId?: string, newOrder = 0) => {
      dispatch({ type: "MOVE_NODE", payload: { nodeId, newParentId, newOrder } })
      toast({
        title: "ノードを移動しました",
        description: "ノードの位置が変更されました",
      })
    },
    [dispatch, toast],
  )

  const handleNodeChangeLevel = useCallback(
    (nodeId: string, direction: "promote" | "demote") => {
      if (!state.currentMap) return

      const findNodeAndContext = (
        nodes: LayerNode[],
        targetId: string,
        parentId?: string,
        siblings: LayerNode[] = nodes,
      ): { node: LayerNode; parentId?: string; siblings: LayerNode[] } | null => {
        for (const node of nodes) {
          if (node.id === targetId) {
            return { node, parentId, siblings }
          }
          const found = findNodeAndContext(node.children, targetId, node.id, node.children)
          if (found) return found
        }
        return null
      }

      const context = findNodeAndContext(state.currentMap.rootNodes, nodeId)
      if (!context) return

      const { node, parentId, siblings } = context

      if (direction === "promote") {
        if (parentId) {
          // Move node up one level (make it sibling of current parent)
          const findGrandparent = (
            nodes: LayerNode[],
            targetParentId: string,
          ): { grandparentId?: string; parentSiblings: LayerNode[] } | null => {
            // Check if target parent is in root
            if (nodes.some((n) => n.id === targetParentId)) {
              return { grandparentId: undefined, parentSiblings: nodes }
            }

            for (const n of nodes) {
              if (n.children.some((child) => child.id === targetParentId)) {
                return { grandparentId: n.id, parentSiblings: n.children }
              }
              const found = findGrandparent(n.children, targetParentId)
              if (found) return found
            }
            return null
          }

          const grandparentContext = findGrandparent(state.currentMap.rootNodes, parentId)
          if (grandparentContext) {
            const newOrder = grandparentContext.parentSiblings.length
            handleNodeMove(nodeId, grandparentContext.grandparentId, newOrder)
            
            toast({
              title: "階層を上げました",
              description: `${node.title} の階層が上がりました`,
            })
          }
        } else {
          // Root node - can't promote further, but show message
          toast({
            title: "これ以上階層を上げられません",
            description: "既に最上位階層です",
          })
        }
      } else if (direction === "demote") {
        // Move node down one level (make it child of previous sibling)
        const currentIndex = siblings.findIndex((s) => s.id === nodeId)
        if (currentIndex > 0) {
          const newParent = siblings[currentIndex - 1]
          const newOrder = newParent.children.length
          handleNodeMove(nodeId, newParent.id, newOrder)
          
          toast({
            title: "階層を下げました",
            description: `${node.title} の階層が下がりました`,
          })
        } else {
          toast({
            title: "階層を下げられません",
            description: "前に兄弟ノードがありません",
          })
        }
      }
    },
    [state.currentMap, handleNodeMove, toast, findNodeById],
  )

  const handleExportExcel = useCallback(() => {
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
  }, [exportData, toast])

  const handleExportCSV = useCallback(() => {
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
  }, [exportData, toast])

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" })
    toast({
      title: "元に戻しました",
      description: "前の状態に戻りました",
    })
  }, [dispatch, toast])

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" })
    toast({
      title: "やり直しました",
      description: "次の状態に進みました",
    })
  }, [dispatch, toast])

  const handleSave = useCallback(() => {
    if (state.currentMap) {
      dispatch({ type: "UPDATE_MAP", payload: state.currentMap })
      toast({
        title: "保存しました",
        description: "マップが正常に保存されました",
      })
    }
  }, [dispatch, state.currentMap, toast])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey && e.shiftKey && e.key === "Z") || (e.ctrlKey && e.key === "y")) {
        e.preventDefault()
        handleRedo()
      } else if (e.key === "Enter" && !e.shiftKey && selectedNodeId) {
        e.preventDefault()
        const selectedNode = findNodeById(state.currentMap?.rootNodes || [], selectedNodeId)
        handleNodeAdd(selectedNode?.parentId)
      } else if (e.key === "Enter" && e.shiftKey && selectedNodeId) {
        e.preventDefault()
        handleNodeAdd(selectedNodeId)
      } else if (e.key === "Delete" && selectedNodeId) {
        e.preventDefault()
        handleNodeDelete(selectedNodeId)
      } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault()
        handleSave()
      } else if (e.ctrlKey && e.key === "c" && selectedNodeId) {
        e.preventDefault()
        handleNodeCopy(selectedNodeId)
      } else if (e.key === "ArrowLeft" && selectedNodeId) {
        e.preventDefault()
        handleNodeChangeLevel(selectedNodeId, "promote")
      } else if (e.key === "ArrowRight" && selectedNodeId) {
        e.preventDefault()
        handleNodeChangeLevel(selectedNodeId, "demote")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    selectedNodeId,
    handleUndo,
    handleRedo,
    handleNodeAdd,
    handleNodeDelete,
    handleNodeCopy,
    handleSave,
    handleNodeChangeLevel,
    findNodeById,
    state.currentMap?.rootNodes,
  ])

  const currentMap = state.currentMap

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

  const canUndo = state.historyIndex > 0
  const canRedo = state.historyIndex < state.history.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b-2 border-indigo-100 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              ダッシュボード
            </Button>
            <div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {currentMap.name}
              </h1>
              <p className="text-sm text-slate-600">{currentMap.template} テンプレート</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo buttons */}
            <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo} title="元に戻す (Ctrl+Z)">
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo} disabled={!canRedo} title="やり直し (Ctrl+Y)">
              <Redo className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-slate-300 mx-2" />

            <Button variant="outline" size="sm" onClick={() => router.push(`/preview/${mapId}`)}>
              <Eye className="w-4 h-4 mr-2" />
              プレビュー
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
            
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                  disabled={!exportData}
                >
                  <Download className="w-4 h-4 mr-2" />
                  エクスポート
                  {!exportData && <span className="ml-1 text-xs">(準備中)</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-scale-in">
                <DropdownMenuItem onClick={handleExportExcel} disabled={!exportData}>
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                  Excel形式 (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} disabled={!exportData}>
                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  CSV形式 (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 3-Panel Layout with adjusted default sizes */}
      <div className="h-[calc(100vh-80px)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Tree View Panel - Expanded default size */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <TreeView
              nodes={currentMap.rootNodes}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onNodeAdd={handleNodeAdd}
              onNodeDelete={handleNodeDelete}
              onNodeCopy={handleNodeCopy}
              onNodeMove={handleNodeMove}
              onNodeChangeLevel={handleNodeChangeLevel}
            />
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-gradient-to-b from-indigo-200 to-purple-200 hover:bg-gradient-to-b hover:from-indigo-300 hover:to-purple-300" />

          {/* Detail Panel - Reduced default size */}
          <ResizablePanel defaultSize={20} minSize={15}>
            <DetailPanel selectedNode={selectedNode} onNodeUpdate={handleNodeUpdate} />
          </ResizablePanel>

          <ResizableHandle className="w-2 bg-gradient-to-b from-emerald-200 to-teal-200 hover:bg-gradient-to-b hover:from-emerald-300 hover:to-teal-300" />

          {/* Live Preview Panel */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <LivePreview
              nodes={currentMap.rootNodes}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              template={currentMap.template}
              onExportDataReady={handleExportDataReady}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
