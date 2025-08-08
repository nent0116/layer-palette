"use client"

import type React from "react"

import { useState, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronRight, ChevronDown, Plus, Trash2, Copy, GripVertical, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import type { LayerNode } from "@/contexts/layer-palette-context"

interface TreeViewProps {
  nodes: LayerNode[]
  selectedNodeId?: string
  onNodeSelect: (nodeId: string) => void
  onNodeAdd: (parentId?: string) => void
  onNodeDelete: (nodeId: string) => void
  onNodeCopy: (nodeId: string) => void
  onNodeMove: (nodeId: string, newOrder: number, newParentId?: string) => void
  onNodeChangeLevel: (nodeId: string, direction: "promote" | "demote") => void
}

interface SortableTreeItemProps {
  node: LayerNode
  level: number
  selectedNodeId?: string
  onNodeSelect: (nodeId: string) => void
  onNodeAdd: (parentId?: string) => void
  onNodeDelete: (nodeId: string) => void
  onNodeCopy: (nodeId: string) => void
  onNodeChangeLevel: (nodeId: string, direction: "promote" | "demote") => void
  allNodes: LayerNode[]
  canPromote: boolean
  canDemote: boolean
}

function SortableTreeItem({
  node,
  level,
  selectedNodeId,
  onNodeSelect,
  onNodeAdd,
  onNodeDelete,
  onNodeCopy,
  onNodeChangeLevel,
  allNodes,
  canPromote,
  canDemote,
}: SortableTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    willChange: isDragging ? 'transform' : undefined,
  } as React.CSSProperties

  const isSelected = selectedNodeId === node.id

  const handleAddSibling = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNodeAdd(node.parentId)
  }

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNodeAdd(node.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNodeDelete(node.id)
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNodeCopy(node.id)
  }

  const handlePromote = () => {
    onNodeChangeLevel(node.id, "promote")
  }

  const handleDemote = () => {
    onNodeChangeLevel(node.id, "demote")
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`group flex items-center gap-2 p-3 rounded-xl border transition-colors cursor-pointer ${
              isSelected
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
            }`}
            style={{ marginLeft: `${level * 20}px` }}
            onClick={() => onNodeSelect(node.id)}
            role="treeitem"
            aria-expanded={node.children.length > 0 ? isExpanded : undefined}
            aria-selected={isSelected}
            aria-level={level + 1}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onNodeSelect(node.id)
              } else if (e.key === 'ArrowRight' && node.children.length > 0 && !isExpanded) {
                e.preventDefault()
                setIsExpanded(true)
              } else if (e.key === 'ArrowLeft' && node.children.length > 0 && isExpanded) {
                e.preventDefault()
                setIsExpanded(false)
              }
            }}
          >
            <ChildDropTarget id={`child:${node.id}`} />
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 rounded"
              role="button"
              aria-label={`${node.title}をドラッグ`}
              tabIndex={-1}
            >
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>

            {/* Expand/Collapse Button */}
            {node.children.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
                aria-label={isExpanded ? "折りたたむ" : "展開する"}
                aria-expanded={isExpanded}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}

            {/* Level Indicator */}
            <div className="text-xs text-slate-400 font-mono w-6 text-center">L{level}</div>

            {/* Color Indicator */}
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: node.backgroundColor }}
            />

            {/* Node Title */}
            <span className="flex-1 text-sm font-medium text-slate-700">{node.title}</span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePromote()
                }}
                title="階層を上げる"
                aria-label="階層を上げる"
              >
                <ArrowLeft className="w-3 h-3 text-blue-600" />
              </Button>
              {canDemote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDemote()
                  }}
                  title="階層を下げる"
                  aria-label="階層を下げる"
                >
                  <ArrowRight className="w-3 h-3 text-orange-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={handleAddChild}
                title="子ノードを追加 (Shift+Enter)"
                aria-label="子ノードを追加"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={handleAddSibling}
                title="同階層にノードを追加 (Enter)"
                aria-label="同階層にノードを追加"
              >
                <Plus className="w-3 h-3 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0"
                onClick={handleDelete}
                title="削除 (Delete)"
                aria-label="削除"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </Button>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={handleAddChild}>
            <Plus className="w-4 h-4 mr-2 text-emerald-600" />
            子ノードを追加 (Shift+Enter)
          </ContextMenuItem>
          <ContextMenuItem onClick={handleAddSibling}>
            <Plus className="w-4 h-4 mr-2 text-blue-600" />
            同階層にノードを追加 (Enter)
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handlePromote}>
            <ArrowLeft className="w-4 h-4 mr-2 text-blue-600" />
            階層を上げる
          </ContextMenuItem>
          {canDemote && (
            <ContextMenuItem onClick={handleDemote}>
              <ArrowRight className="w-4 h-4 mr-2 text-orange-600" />
              階層を下げる
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2 text-purple-600" />
            コピー (Ctrl+C)
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            削除 (Delete)
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {isExpanded && node.children.length > 0 && (
        <div className="mt-2 space-y-2" role="group" aria-label={`${node.title}の子ノード`}>
          <SortableContext items={node.children.map((child) => child.id)} strategy={verticalListSortingStrategy}>
            {node.children.map((child) => (
              <SortableTreeItem
                key={child.id}
                node={child}
                level={level + 1}
                selectedNodeId={selectedNodeId}
                onNodeSelect={onNodeSelect}
                onNodeAdd={onNodeAdd}
                onNodeDelete={onNodeDelete}
                onNodeCopy={onNodeCopy}
                onNodeChangeLevel={onNodeChangeLevel}
                allNodes={allNodes}
                canPromote={true}
                canDemote={true}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  )
}

function ChildDropTarget({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 top-0 h-full w-10 rounded-l-xl transition-colors ${
        isOver ? 'bg-purple-200/60 ring-2 ring-purple-400/60' : 'bg-transparent'
      }`}
      aria-hidden
    >
      {isOver && (
        <div className="absolute inset-y-0 left-1 flex items-center pointer-events-none select-none">
          <ArrowRight className="w-3 h-3 text-purple-600" />
          <span className="ml-1 text-[10px] leading-none text-purple-700 font-medium bg-white/80 px-1.5 py-0.5 rounded">
            子にする
          </span>
        </div>
      )}
    </div>
  )
}

export function TreeView({
  nodes,
  selectedNodeId,
  onNodeSelect,
  onNodeAdd,
  onNodeDelete,
  onNodeCopy,
  onNodeMove,
  onNodeChangeLevel,
}: TreeViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      // Find nodes and parents
      const findNodeAndParent = (
        nodes: LayerNode[],
        nodeId: string,
        parentId?: string,
      ): { node: LayerNode; parentId?: string; index: number } | null => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          if (node.id === nodeId) {
            return { node, parentId, index: i }
          }
          const childResult = findNodeAndParent(node.children, nodeId, node.id)
          if (childResult) return childResult
        }
        return null
      }

      const findNode = (nodes: LayerNode[], nodeId: string): LayerNode | null => {
        for (const n of nodes) {
          if (n.id === nodeId) return n
          const found = findNode(n.children, nodeId)
          if (found) return found
        }
        return null
      }

      const isDescendant = (possibleAncestorId: string, targetId: string): boolean => {
        const ancestor = findNode(nodes, possibleAncestorId)
        if (!ancestor) return false
        const walk = (node: LayerNode): boolean => {
          if (node.id === targetId) return true
          return node.children.some(walk)
        }
        return walk(ancestor)
      }

      const activeResult = findNodeAndParent(nodes, active.id as string)
      const overResult = findNodeAndParent(nodes, over.id as string)
      // 子化ドロップゾーンへドロップ
      if (typeof over.id === 'string' && (over.id as string).startsWith('child:')) {
        const parentId = (over.id as string).slice('child:'.length)
        // 自己または子孫への子化は不可
        if (parentId === active.id || isDescendant(active.id as string, parentId)) return
        const parentNode = findNode(nodes, parentId)
        const newOrder = parentNode ? parentNode.children.length : 0
        onNodeMove(active.id as string, newOrder, parentId)
        return
      }

      if (!activeResult || !overResult) return

      // 同一親内のみ並べ替え許可
      if (activeResult.parentId !== overResult.parentId) return

      // インデックス補正: remove→insert の実装なので、前から後ろへ移動のときは1つ詰まる
      let targetIndex = overResult.index
      if (activeResult.index < overResult.index) {
        targetIndex = Math.max(0, targetIndex - 1)
      }

      onNodeMove(active.id as string, targetIndex, overResult.parentId)
    },
    [nodes, onNodeMove],
  )

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-indigo-50 border-r-2 border-indigo-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          階層構造
        </h3>
        <Button
          size="sm"
          onClick={() => onNodeAdd()}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow"
        >
          <Plus className="w-4 h-4 mr-2" />
          追加
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* ルート階層のみを並べ替え対象にする */}
        <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3" role="tree" aria-label="階層構造ツリー">
            {nodes.map((node) => (
              <SortableTreeItem
                key={node.id}
                node={node}
                level={0}
                selectedNodeId={selectedNodeId}
                onNodeSelect={onNodeSelect}
                onNodeAdd={onNodeAdd}
                onNodeDelete={onNodeDelete}
                onNodeCopy={onNodeCopy}
                onNodeChangeLevel={onNodeChangeLevel}
                allNodes={nodes}
                canPromote={true}
                canDemote={true}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {nodes.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-indigo-500" />
          </div>
          <p className="text-slate-500 mb-4">まだノードがありません</p>
          <Button
            onClick={() => onNodeAdd()}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          >
            最初のノードを作成
          </Button>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="mt-6 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-indigo-200">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">キーボードショートカット</h4>
        <div className="text-xs text-slate-600 space-y-1">
          <div>
            <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">Enter</kbd> 同階層にノード追加
          </div>
          <div>
            <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">Shift+Enter</kbd> 子ノード追加
          </div>
          <div>
            <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">Delete</kbd> ノード削除
          </div>
          <div>
            <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">←</kbd> 階層を上げる
          </div>
          <div>
            <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">→</kbd> 階層を下げる
          </div>
          <div>
            <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">Ctrl+Z</kbd> 元に戻す
          </div>
          <div>
            <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">ドラッグ</kbd> 同階層内で並べ替え
          </div>
        </div>
      </div>
    </div>
  )
}
