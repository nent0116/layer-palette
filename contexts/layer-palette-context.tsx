"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"

export interface LayerNode {
  id: string
  title: string
  backgroundColor: string
  notes: string
  children: LayerNode[]
  parentId?: string
  order: number
  level?: number // Add level property
}

export interface LayerMap {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  rootNodes: LayerNode[]
  template: "sitemap" | "wbs" | "content-calendar" | "custom"
}

interface LayerPaletteState {
  maps: LayerMap[]
  currentMap: LayerMap | null
  history: LayerMap[]
  historyIndex: number
}

type LayerPaletteAction =
  | { type: "CREATE_MAP"; payload: { name: string; template: LayerMap["template"] } }
  | { type: "LOAD_MAP"; payload: string }
  | { type: "UPDATE_MAP"; payload: LayerMap }
  | { type: "DELETE_MAP"; payload: string }
  | { type: "ADD_NODE"; payload: { parentId?: string; node: Omit<LayerNode, "id" | "order"> } }
  | { type: "UPDATE_NODE"; payload: { nodeId: string; updates: Partial<LayerNode> } }
  | { type: "DELETE_NODE"; payload: string }
  | { type: "MOVE_NODE"; payload: { nodeId: string; newParentId?: string; newOrder: number } }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "IMPORT_MAP"; payload: LayerMap }

const initialState: LayerPaletteState = {
  maps: [],
  currentMap: null,
  history: [],
  historyIndex: -1,
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Define hierarchical colors for different templates
const templateColors = {
  sitemap: {
    level0: "#2563EB", // Blue for top level
    level1: "#10B981", // Green for second level
    level2: "#F59E0B", // Orange for third level
    level3: "#EF4444", // Red for fourth level
    level4: "#8B5CF6", // Purple for fifth level
  },
  wbs: {
    level0: "#3B82F6",
    level1: "#06B6D4",
    level2: "#10B981",
    level3: "#F59E0B",
    level4: "#EF4444",
  },
  "content-calendar": {
    level0: "#8B5CF6",
    level1: "#EC4899",
    level2: "#F97316",
    level3: "#84CC16",
    level4: "#06B6D4",
  },
  custom: {
    level0: "#6366F1",
    level1: "#10B981",
    level2: "#F59E0B",
    level3: "#EF4444",
    level4: "#8B5CF6",
  },
}

function getColorForLevel(template: LayerMap["template"], level: number): string {
  const colors = templateColors[template]
  const levelKey = `level${Math.min(level, 4)}` as keyof typeof colors
  return colors[levelKey]
}

function createDefaultNodes(template: LayerMap["template"]): LayerNode[] {
  const templates = {
    sitemap: [
      { title: "トップページ", notes: "" },
      { title: "サービス", notes: "" },
      { title: "料金", notes: "" },
      { title: "お問い合わせ", notes: "" },
    ],
    wbs: [
      { 
        title: "プロジェクト計画", 
        notes: "担当者名: プロジェクトマネージャー\n開始日: 2024-01-01\n終了日: 2024-01-15\nステータス: 完了\n進捗率: 100%",
        children: [
          {
            title: "要件定義",
            notes: "担当者名: ビジネスアナリスト\n開始日: 2024-01-01\n終了日: 2024-01-10\nステータス: 完了\n進捗率: 100%",
            children: [
              {
                title: "ステークホルダーインタビュー",
                notes: "担当者名: ビジネスアナリスト\n開始日: 2024-01-01\n終了日: 2024-01-05\nステータス: 完了\n進捗率: 100%"
              },
              {
                title: "要件文書作成",
                notes: "担当者名: ビジネスアナリスト\n開始日: 2024-01-06\n終了日: 2024-01-10\nステータス: 完了\n進捗率: 100%"
              }
            ]
          },
          {
            title: "プロジェクト計画書作成",
            notes: "担当者名: プロジェクトマネージャー\n開始日: 2024-01-11\n終了日: 2024-01-15\nステータス: 完了\n進捗率: 100%"
          }
        ]
      },
      { 
        title: "システム設計", 
        notes: "担当者名: システムアーキテクト\n開始日: 2024-01-16\n終了日: 2024-02-15\nステータス: 進行中\n進捗率: 60%",
        children: [
          {
            title: "基本設計",
            notes: "担当者名: システムアーキテクト\n開始日: 2024-01-16\n終了日: 2024-01-31\nステータス: 完了\n進捗率: 100%",
            children: [
              {
                title: "システム構成設計",
                notes: "担当者名: システムアーキテクト\n開始日: 2024-01-16\n終了日: 2024-01-25\nステータス: 完了\n進捗率: 100%"
              },
              {
                title: "データベース設計",
                notes: "担当者名: データベースエンジニア\n開始日: 2024-01-26\n終了日: 2024-01-31\nステータス: 完了\n進捗率: 100%"
              }
            ]
          },
          {
            title: "詳細設計",
            notes: "担当者名: システムアーキテクト\n開始日: 2024-02-01\n終了日: 2024-02-15\nステータス: 進行中\n進捗率: 60%",
            children: [
              {
                title: "画面設計",
                notes: "担当者名: UI/UXデザイナー\n開始日: 2024-02-01\n終了日: 2024-02-10\nステータス: 進行中\n進捗率: 70%"
              },
              {
                title: "API設計",
                notes: "担当者名: バックエンドエンジニア\n開始日: 2024-02-05\n終了日: 2024-02-15\nステータス: 進行中\n進捗率: 50%"
              }
            ]
          }
        ]
      },
      { 
        title: "開発", 
        notes: "担当者名: 開発チーム\n開始日: 2024-02-16\n終了日: 2024-04-15\nステータス: 未開始\n進捗率: 0%",
        children: [
          {
            title: "フロントエンド開発",
            notes: "担当者名: フロントエンドエンジニア\n開始日: 2024-02-16\n終了日: 2024-03-31\nステータス: 未開始\n進捗率: 0%",
            children: [
              {
                title: "ユーザー認証機能",
                notes: "担当者名: フロントエンドエンジニア\n開始日: 2024-02-16\n終了日: 2024-02-28\nステータス: 未開始\n進捗率: 0%"
              },
              {
                title: "ダッシュボード機能",
                notes: "担当者名: フロントエンドエンジニア\n開始日: 2024-03-01\n終了日: 2024-03-15\nステータス: 未開始\n進捗率: 0%"
              },
              {
                title: "レポート機能",
                notes: "担当者名: フロントエンドエンジニア\n開始日: 2024-03-16\n終了日: 2024-03-31\nステータス: 未開始\n進捗率: 0%"
              }
            ]
          },
          {
            title: "バックエンド開発",
            notes: "担当者名: バックエンドエンジニア\n開始日: 2024-02-16\n終了日: 2024-04-15\nステータス: 未開始\n進捗率: 0%",
            children: [
              {
                title: "API実装",
                notes: "担当者名: バックエンドエンジニア\n開始日: 2024-02-16\n終了日: 2024-03-31\nステータス: 未開始\n進捗率: 0%"
              },
              {
                title: "データベース実装",
                notes: "担当者名: データベースエンジニア\n開始日: 2024-03-01\n終了日: 2024-04-15\nステータス: 未開始\n進捗率: 0%"
              }
            ]
          }
        ]
      },
      { 
        title: "テスト", 
        notes: "担当者名: QAチーム\n開始日: 2024-04-16\n終了日: 2024-05-15\nステータス: 未開始\n進捗率: 0%",
        children: [
          {
            title: "単体テスト",
            notes: "担当者名: 開発チーム\n開始日: 2024-04-16\n終了日: 2024-04-30\nステータス: 未開始\n進捗率: 0%"
          },
          {
            title: "結合テスト",
            notes: "担当者名: QAチーム\n開始日: 2024-05-01\n終了日: 2024-05-10\nステータス: 未開始\n進捗率: 0%"
          },
          {
            title: "システムテスト",
            notes: "担当者名: QAチーム\n開始日: 2024-05-11\n終了日: 2024-05-15\nステータス: 未開始\n進捗率: 0%"
          }
        ]
      },
      { 
        title: "リリース", 
        notes: "担当者名: プロジェクトマネージャー\n開始日: 2024-05-16\n終了日: 2024-05-31\nステータス: 未開始\n進捗率: 0%",
        children: [
          {
            title: "本番環境構築",
            notes: "担当者名: インフラエンジニア\n開始日: 2024-05-16\n終了日: 2024-05-20\nステータス: 未開始\n進捗率: 0%"
          },
          {
            title: "本番リリース",
            notes: "担当者名: プロジェクトマネージャー\n開始日: 2024-05-21\n終了日: 2024-05-25\nステータス: 未開始\n進捗率: 0%"
          },
          {
            title: "運用開始",
            notes: "担当者名: 運用チーム\n開始日: 2024-05-26\n終了日: 2024-05-31\nステータス: 未開始\n進捗率: 0%"
          }
        ]
      }
    ],
    "content-calendar": [
      { title: "Week1", notes: "" },
      { title: "Week2", notes: "" },
      { title: "Week3", notes: "" },
      { title: "Week4", notes: "" },
    ],
    custom: [],
  }

  if (template === "wbs") {
    // WBSテンプレートの場合は階層構造を作成
    const createWBSNodes = (nodes: any[], level = 0): LayerNode[] => {
      return nodes.map((node, index) => ({
        id: generateId(),
        title: node.title,
        notes: node.notes,
        backgroundColor: getColorForLevel(template, level),
        children: node.children ? createWBSNodes(node.children, level + 1) : [],
        order: index,
        level,
      }))
    }
    return createWBSNodes(templates.wbs)
  }

  return templates[template].map((node, index) => ({
    id: generateId(),
    ...node,
    backgroundColor: getColorForLevel(template, 0), // All root nodes get level 0 color
    children: [],
    order: index,
    level: 0,
  }))
}

function updateNodeLevels(nodes: LayerNode[], level = 0): LayerNode[] {
  return nodes.map((node) => ({
    ...node,
    level,
    children: updateNodeLevels(node.children, level + 1),
  }))
}

// Function to update node colors based on their levels and template
function updateNodeColors(nodes: LayerNode[], template: LayerMap["template"]): LayerNode[] {
  return nodes.map((node) => ({
    ...node,
    backgroundColor: getColorForLevel(template, node.level || 0),
    children: updateNodeColors(node.children, template),
  }))
}

function layerPaletteReducer(state: LayerPaletteState, action: LayerPaletteAction): LayerPaletteState {
  switch (action.type) {
    case "CREATE_MAP": {
      const newMap: LayerMap = {
        id: generateId(),
        name: action.payload.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        rootNodes: createDefaultNodes(action.payload.template),
        template: action.payload.template,
      }
      return {
        ...state,
        maps: [...state.maps, newMap],
        currentMap: newMap,
        history: [newMap],
        historyIndex: 0,
      }
    }

    case "LOAD_MAP": {
      const map = state.maps.find((m) => m.id === action.payload)
      if (!map) return state

      // Update levels and colors when loading a map
      let updatedMap = {
        ...map,
        rootNodes: updateNodeLevels(map.rootNodes),
      }
      updatedMap = {
        ...updatedMap,
        rootNodes: updateNodeColors(updatedMap.rootNodes, updatedMap.template),
      }

      return {
        ...state,
        currentMap: updatedMap,
        history: [updatedMap],
        historyIndex: 0,
      }
    }

    case "UPDATE_MAP": {
      const updatedMaps = state.maps.map((m) => (m.id === action.payload.id ? action.payload : m))
      return {
        ...state,
        maps: updatedMaps,
        currentMap: action.payload,
        history: [...state.history.slice(0, state.historyIndex + 1), action.payload],
        historyIndex: state.historyIndex + 1,
      }
    }

    case "DELETE_MAP": {
      return {
        ...state,
        maps: state.maps.filter((m) => m.id !== action.payload),
        currentMap: state.currentMap?.id === action.payload ? null : state.currentMap,
      }
    }

    case "ADD_NODE": {
      if (!state.currentMap) return state

      const parentLevel = action.payload.parentId
        ? (() => {
            const findParentLevel = (nodes: LayerNode[]): number => {
              for (const node of nodes) {
                if (node.id === action.payload.parentId) return node.level || 0
                const childLevel = findParentLevel(node.children)
                if (childLevel >= 0) return childLevel
              }
              return -1
            }
            return findParentLevel(state.currentMap.rootNodes)
          })()
        : -1

      const newNodeLevel = parentLevel + 1
      const newNode: LayerNode = {
        id: generateId(),
        ...action.payload.node,
        backgroundColor: getColorForLevel(state.currentMap.template, newNodeLevel),
        order: 0,
        children: [],
        level: newNodeLevel,
      }

      const addNodeToTree = (nodes: LayerNode[], parentId?: string): LayerNode[] => {
        if (!parentId) {
          // Add to root level
          const newOrder = nodes.length
          return [...nodes, { ...newNode, order: newOrder, level: 0, backgroundColor: getColorForLevel(state.currentMap!.template, 0) }]
        }

        return nodes.map((node) => {
          if (node.id === parentId) {
            const newOrder = node.children.length
            const childLevel = (node.level || 0) + 1
            return {
              ...node,
              children: [
                ...node.children,
                {
                  ...newNode,
                  parentId,
                  order: newOrder,
                  level: childLevel,
                  backgroundColor: getColorForLevel(state.currentMap!.template, childLevel),
                },
              ],
            }
          }
          return {
            ...node,
            children: addNodeToTree(node.children, parentId),
          }
        })
      }

      let updatedRootNodes = addNodeToTree(state.currentMap.rootNodes, action.payload.parentId)
      updatedRootNodes = updateNodeLevels(updatedRootNodes)
      updatedRootNodes = updateNodeColors(updatedRootNodes, state.currentMap.template)
      
      const updatedMap = {
        ...state.currentMap,
        rootNodes: updatedRootNodes,
        updatedAt: new Date(),
      }

      return {
        ...state,
        currentMap: updatedMap,
        maps: state.maps.map((m) => (m.id === updatedMap.id ? updatedMap : m)),
        history: [...state.history.slice(0, state.historyIndex + 1), updatedMap],
        historyIndex: state.historyIndex + 1,
      }
    }

    case "UPDATE_NODE": {
      if (!state.currentMap) return state

      const updateNodeInTree = (nodes: LayerNode[]): LayerNode[] => {
        return nodes.map((node) => {
          if (node.id === action.payload.nodeId) {
            // If backgroundColor is being updated manually, preserve it
            // Otherwise, use the template color for the level
            const updates = { ...action.payload.updates }
            if (!updates.backgroundColor && node.level !== undefined) {
              updates.backgroundColor = getColorForLevel(state.currentMap!.template, node.level)
            }
            return { ...node, ...updates }
          }
          return {
            ...node,
            children: updateNodeInTree(node.children),
          }
        })
      }

      const updatedMap = {
        ...state.currentMap,
        rootNodes: updateNodeInTree(state.currentMap.rootNodes),
        updatedAt: new Date(),
      }

      return {
        ...state,
        currentMap: updatedMap,
        maps: state.maps.map((m) => (m.id === updatedMap.id ? updatedMap : m)),
        history: [...state.history.slice(0, state.historyIndex + 1), updatedMap],
        historyIndex: state.historyIndex + 1,
      }
    }

    case "DELETE_NODE": {
      if (!state.currentMap) return state

      const deleteNodeFromTree = (nodes: LayerNode[]): LayerNode[] => {
        return nodes
          .filter((node) => node.id !== action.payload)
          .map((node) => ({
            ...node,
            children: deleteNodeFromTree(node.children),
          }))
      }

      let updatedRootNodes = deleteNodeFromTree(state.currentMap.rootNodes)
      updatedRootNodes = updateNodeLevels(updatedRootNodes)
      updatedRootNodes = updateNodeColors(updatedRootNodes, state.currentMap.template)
      
      const updatedMap = {
        ...state.currentMap,
        rootNodes: updatedRootNodes,
        updatedAt: new Date(),
      }

      return {
        ...state,
        currentMap: updatedMap,
        maps: state.maps.map((m) => (m.id === updatedMap.id ? updatedMap : m)),
        history: [...state.history.slice(0, state.historyIndex + 1), updatedMap],
        historyIndex: state.historyIndex + 1,
      }
    }

    case "MOVE_NODE": {
      if (!state.currentMap) return state

      let nodeToMove: LayerNode | null = null

      // First, find and remove the node
      const removeNodeFromTree = (nodes: LayerNode[]): LayerNode[] => {
        return nodes
          .filter((node) => {
            if (node.id === action.payload.nodeId) {
              nodeToMove = node
              return false
            }
            return true
          })
          .map((node) => ({
            ...node,
            children: removeNodeFromTree(node.children),
          }))
      }

      // Then, add it to the new location
      const addNodeToTree = (nodes: LayerNode[], targetParentId?: string, newOrder = 0): LayerNode[] => {
        if (!targetParentId) {
          // Add to root level
          const result = [...nodes]
          if (nodeToMove) {
            result.splice(newOrder, 0, { ...nodeToMove, parentId: undefined, order: newOrder, level: 0 })
            // Update order for subsequent nodes
            return result.map((node, index) => ({ ...node, order: index }))
          }
          return result
        }

        return nodes.map((node) => {
          if (node.id === targetParentId && nodeToMove) {
            const newChildren = [...node.children]
            const newLevel = (node.level || 0) + 1
            newChildren.splice(newOrder, 0, {
              ...nodeToMove,
              parentId: targetParentId,
              order: newOrder,
              level: newLevel,
            })
            return {
              ...node,
              children: newChildren.map((child, index) => ({ ...child, order: index })),
            }
          }
          return {
            ...node,
            children: addNodeToTree(node.children, targetParentId, newOrder),
          }
        })
      }

      let rootNodes = removeNodeFromTree(state.currentMap.rootNodes)
      rootNodes = addNodeToTree(rootNodes, action.payload.newParentId, action.payload.newOrder)
      rootNodes = updateNodeLevels(rootNodes)
      rootNodes = updateNodeColors(rootNodes, state.currentMap.template)

      const updatedMap = {
        ...state.currentMap,
        rootNodes: rootNodes,
        updatedAt: new Date(),
      }

      return {
        ...state,
        currentMap: updatedMap,
        maps: state.maps.map((m) => (m.id === updatedMap.id ? updatedMap : m)),
        history: [...state.history.slice(0, state.historyIndex + 1), updatedMap],
        historyIndex: state.historyIndex + 1,
      }
    }

    case "UNDO": {
      if (state.historyIndex > 0) {
        const previousMap = state.history[state.historyIndex - 1]
        return {
          ...state,
          currentMap: previousMap,
          maps: state.maps.map((m) => (m.id === previousMap.id ? previousMap : m)),
          historyIndex: state.historyIndex - 1,
        }
      }
      return state
    }

    case "REDO": {
      if (state.historyIndex < state.history.length - 1) {
        const nextMap = state.history[state.historyIndex + 1]
        return {
          ...state,
          currentMap: nextMap,
          maps: state.maps.map((m) => (m.id === nextMap.id ? nextMap : m)),
          historyIndex: state.historyIndex + 1,
        }
      }
      return state
    }

    case "IMPORT_MAP": {
      let updatedMap = {
        ...action.payload,
        rootNodes: updateNodeLevels(action.payload.rootNodes),
      }
      updatedMap = {
        ...updatedMap,
        rootNodes: updateNodeColors(updatedMap.rootNodes, updatedMap.template),
      }
      return {
        ...state,
        maps: [updatedMap],
        currentMap: updatedMap,
        history: [updatedMap],
        historyIndex: 0,
      }
    }

    default:
      return state
  }
}

const LayerPaletteContext = createContext<{
  state: LayerPaletteState
  dispatch: React.Dispatch<LayerPaletteAction>
} | null>(null)

export function LayerPaletteProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(layerPaletteReducer, initialState)

  // LocalStorage persistence
  useEffect(() => {
    const saved = localStorage.getItem("layer-palette-maps")
    if (saved) {
      try {
        const maps = JSON.parse(saved).map((map: any) => ({
          ...map,
          createdAt: new Date(map.createdAt),
          updatedAt: new Date(map.updatedAt),
        }))
        if (maps.length > 0) {
          dispatch({ type: "IMPORT_MAP", payload: maps[0] })
        }
      } catch (error) {
        console.error("Failed to load saved maps:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (state.maps.length > 0) {
      localStorage.setItem("layer-palette-maps", JSON.stringify(state.maps))
    }
  }, [state.maps])

  return <LayerPaletteContext.Provider value={{ state, dispatch }}>{children}</LayerPaletteContext.Provider>
}

export function useLayerPalette() {
  const context = useContext(LayerPaletteContext)
  if (!context) {
    throw new Error("useLayerPalette must be used within LayerPaletteProvider")
  }
  return context
}

// Export helper function for getting color by level
export { getColorForLevel }
