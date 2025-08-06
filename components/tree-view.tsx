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
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronRight, ChevronDown, Plus, Trash2, Copy, GripVertical, ArrowRight, ArrowLeft } from "lucide-react"
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
  onNodeMove: (nodeId: string, newParentId?: string, newOrder: number) => void
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
    opacity: isDragging ? 0.5 : 1,
  }

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
    <div ref={setNodeRef} style={style}>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={`group flex items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer animate-fade-in ${
              isSelected
                ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg"
                : "border-slate-200 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-indigo-50"
            }`}
            style={{ marginLeft: `${level * 20}px` }}
            onClick={() => onNodeSelect(node.id)}
          >
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-1 hover:bg-indigo-100 rounded"
            >
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>

            {/* Expand/Collapse Button */}
            {node.children.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 hover:bg-indigo-100"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
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
            <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-indigo-700">{node.title}</span>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
              {canPromote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 hover:bg-blue-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePromote()
                  }}
                  title="階層を上げる"
                >
                  <ArrowLeft className="w-3 h-3 text-blue-600" />
                </Button>
              )}
              {canDemote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 hover:bg-orange-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDemote()
                  }}
                  title="階層を下げる"
                >
                  <ArrowRight className="w-3 h-3 text-orange-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 hover:bg-emerald-100"
                onClick={handleAddChild}
                title="子ノードを追加 (Shift+Enter)"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 hover:bg-blue-100"
                onClick={handleAddSibling}
                title="同階層にノードを追加 (Enter)"
              >
                <Plus className="w-3 h-3 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 hover:bg-red-100"
                onClick={handleDelete}
                title="削除 (Delete)"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </Button>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="animate-scale-in">
          <ContextMenuItem onClick={handleAddChild}>
            <Plus className="w-4 h-4 mr-2 text-emerald-600" />
            子ノードを追加 (Shift+Enter)
          </ContextMenuItem>
          <ContextMenuItem onClick={handleAddSibling}>
            <Plus className="w-4 h-4 mr-2 text-blue-600" />
            同階層にノードを追加 (Enter)
          </ContextMenuItem>
          <ContextMenuSeparator />
          {canPromote && (
            <ContextMenuItem onClick={handlePromote}>
              <ArrowLeft className="w-4 h-4 mr-2 text-blue-600" />
              階層を上げる
            </ContextMenuItem>
          )}
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
        <div className="mt-2 space-y-2">
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
                canPromote={level > 0} // Can promote if not at root level
                canDemote={true} // Can always demote (will find appropriate parent)
              />
            ))}
          </SortableContext>
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
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        // Find the nodes
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

        const activeResult = findNodeAndParent(nodes, active.id as string)
        const overResult = findNodeAndParent(nodes, over.id as string)

        if (activeResult && overResult) {
          // Move the node to the same parent as the target node
          onNodeMove(active.id as string, overResult.parentId, overResult.index)
        }
      }
    },
    [nodes, onNodeMove],
  )

  const getAllNodeIds = (nodes: LayerNode[]): string[] => {
    const ids: string[] = []
    nodes.forEach((node) => {
      ids.push(node.id)
      ids.push(...getAllNodeIds(node.children))
    })
    return ids
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-indigo-50 border-r-2 border-indigo-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          階層構造
        </h3>
        <Button
          size="sm"
          onClick={() => onNodeAdd()}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          追加
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={getAllNodeIds(nodes)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
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
                canPromote={false} // Root nodes cannot be promoted
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
        </div>
      </div>
    </div>
  )
}
