"use client"

import { ChevronRight } from 'lucide-react'
import type { LayerNode, LayerMap } from "@/contexts/layer-palette-context"
import React, { useEffect, useMemo, useCallback } from 'react'

interface LivePreviewProps {
  nodes: LayerNode[]
  selectedNodeId?: string
  onNodeSelect: (nodeId: string) => void
  template?: LayerMap["template"]
  onExportDataReady?: (data: any) => void
}

interface FlatNode {
  node: LayerNode
  level: number
  rowIndex: number
  parentRowIndex?: number
  lastChildRowIndex?: number
  maxDescendantLevel?: number
}

function flattenNodes(nodes: LayerNode[], level = 0, startIndex = 0): FlatNode[] {
  let currentIndex = startIndex
  const result: FlatNode[] = []

  nodes.forEach((node) => {
    const nodeStartIndex = currentIndex
    
    // Calculate max descendant level
    const getMaxDescendantLevel = (node: LayerNode, currentLevel: number): number => {
      if (node.children.length === 0) return currentLevel
      return Math.max(...node.children.map(child => getMaxDescendantLevel(child, currentLevel + 1)))
    }
    
    const maxDescendantLevel = getMaxDescendantLevel(node, level)
    
    result.push({
      node,
      level,
      rowIndex: currentIndex,
      parentRowIndex: level > 0 ? startIndex - 1 : undefined,
      maxDescendantLevel,
    })
    currentIndex++

    if (node.children.length > 0) {
      const childResults = flattenNodes(node.children, level + 1, currentIndex)
      result.push(...childResults)
      currentIndex += childResults.length

      // Update the parent node with the last child row index
      const parentNode = result.find((r) => r.rowIndex === nodeStartIndex)
      if (parentNode) {
        parentNode.lastChildRowIndex = currentIndex - 1
      }
    }
  })

  return result
}

// VBAマクロのロジックを実装
function calculateCellStyles(flatNodes: FlatNode[], totalRows: number, totalCols: number) {
  // Colmax配列: 各行で最初に値が入っている列番号
  const colmax: { [row: number]: number } = {}
  let maxRow = 0
  let maxCol = 0

  // 各行の最初の値がある列を特定
  flatNodes.forEach((flatNode) => {
    const { rowIndex, level } = flatNode
    if (!colmax[rowIndex] || level < colmax[rowIndex]) {
      colmax[rowIndex] = level
    }
    maxRow = Math.max(maxRow, rowIndex)
    maxCol = Math.max(maxCol, level)
  })

  // セルスタイル情報を格納
  const cellStyles: { [key: string]: { backgroundColor?: string; borders?: any } } = {}

  // 列ごとに背景色を適用（VBAの列ごとに染める部分）
  for (let col = 0; col <= maxCol; col++) {
    const headerColor = getHeaderColor(col) // 3行目相当の色
    for (let row = 0; row <= maxRow; row++) {
      const cellKey = `${row}-${col}`
      if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
      cellStyles[cellKey].backgroundColor = headerColor
    }
  }

  // 各行の処理
  for (let row = 0; row <= maxRow; row++) {
    const firstValueCol = colmax[row]
    if (firstValueCol !== undefined) {
      // テキストがあるセルとその右側のセルには、ヘッダー色と同じ薄い色を使用
      const headerColor = getHeaderColor(firstValueCol)
      
      // テキストがあるセルに背景色を適用（ヘッダー色と同じ薄い色）
      const textCellKey = `${row}-${firstValueCol}`
      if (!cellStyles[textCellKey]) cellStyles[textCellKey] = {}
      cellStyles[textCellKey].backgroundColor = headerColor
      
      // テキストより右のセルに同じ色を適用（ヘッダー色と同じ薄い色）
      if (firstValueCol < maxCol) {
        for (let col = firstValueCol + 1; col <= maxCol; col++) {
          const cellKey = `${row}-${col}`
          if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
          cellStyles[cellKey].backgroundColor = headerColor
          
          // 上下の枠線
          if (!cellStyles[cellKey].borders) cellStyles[cellKey].borders = {}
          cellStyles[cellKey].borders.top = true
          cellStyles[cellKey].borders.bottom = true
        }
      }

      // テキストがあるセルに上と左の枠線
      if (!cellStyles[textCellKey].borders) cellStyles[textCellKey].borders = {}
      cellStyles[textCellKey].borders.top = true
      cellStyles[textCellKey].borders.left = true

      // テキストより左のセルに内部垂直枠線
      if (firstValueCol > 0) {
        for (let col = 0; col < firstValueCol; col++) {
          const cellKey = `${row}-${col}`
          if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
          if (!cellStyles[cellKey].borders) cellStyles[cellKey].borders = {}
          cellStyles[cellKey].borders.right = true
        }
      }
    }
  }

  // 全体の外枠線
  for (let row = 0; row <= maxRow; row++) {
    for (let col = 0; col <= maxCol; col++) {
      const cellKey = `${row}-${col}`
      if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
      if (!cellStyles[cellKey].borders) cellStyles[cellKey].borders = {}
      
      if (row === 0) cellStyles[cellKey].borders.top = true
      if (row === maxRow) cellStyles[cellKey].borders.bottom = true
      if (col === 0) cellStyles[cellKey].borders.left = true
      if (col === maxCol) cellStyles[cellKey].borders.right = true
    }
  }

  return { cellStyles, maxRow, maxCol }
}

// ヘッダー色を取得（3行目相当）
function getHeaderColor(col: number): string {
  const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  return colors[col % colors.length] + '40' // 25% opacity
}

// ノードの色を取得
function getNodeColor(flatNodes: FlatNode[], row: number, col: number): string {
  const flatNode = flatNodes.find(fn => fn.rowIndex === row && fn.level === col)
  return flatNode ? flatNode.node.backgroundColor + '80' : '#6B728080' // 50% opacity
}

export function LivePreview({ nodes, selectedNodeId, onNodeSelect, template = "custom", onExportDataReady }: LivePreviewProps) {
  // Memoize flatNodes to prevent unnecessary recalculations
  const flatNodes = useMemo(() => flattenNodes(nodes), [nodes])
  
  const totalRows = Math.max(flatNodes.length, 15)
  const totalCols = 15

  // Memoize cell styles calculation
  const { cellStyles, maxRow, maxCol } = useMemo(() => 
    calculateCellStyles(flatNodes, totalRows, totalCols), 
    [flatNodes, totalRows, totalCols]
  )

  // Memoize grid creation
  const grid = useMemo(() => {
    const grid: (FlatNode | null)[][] = []

    // Initialize grid with empty cells
    for (let row = 0; row < totalRows; row++) {
      grid[row] = new Array(15).fill(null)
    }

    // Place nodes in appropriate columns based on their level
    flatNodes.forEach((flatNode) => {
      const { node, level, rowIndex } = flatNode
      if (rowIndex < totalRows && level < 15) {
        grid[rowIndex][level] = flatNode
      }
    })

    return grid
  }, [flatNodes, totalRows])

  const getCellStyle = useCallback((cell: FlatNode | null, rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`
    const styleInfo = cellStyles[cellKey]
    
    const style: React.CSSProperties = {}
    
    if (styleInfo?.backgroundColor) {
      style.backgroundColor = styleInfo.backgroundColor
    }
    
    if (styleInfo?.borders) {
      const borders = styleInfo.borders
      if (borders.top) style.borderTop = '1px solid #000'
      if (borders.bottom) style.borderBottom = '1px solid #000'
      if (borders.left) style.borderLeft = '1px solid #000'
      if (borders.right) style.borderRight = '1px solid #000'
    }

    return style
  }, [cellStyles])

  // Memoize grid data generation
  const getGridData = useCallback(() => {
    const data: (string | number)[][] = []
    
    // Header row
    const headerRow: (string | number)[] = ['']
    for (let i = 0; i < 15; i++) {
      headerRow.push(String.fromCharCode(65 + i))
    }
    data.push(headerRow)
    
    // Data rows
    for (let row = 0; row < totalRows; row++) {
      const dataRow: (string | number)[] = [row + 1] // Row number
      for (let col = 0; col < 15; col++) {
        const cell = grid[row]?.[col]
        if (cell) {
          dataRow.push(cell.node.title.toString())
        } else {
          dataRow.push('')
        }
      }
      data.push(dataRow)
    }
    
    return data
  }, [grid, totalRows])

  // Memoize export data
  const exportData = useMemo(() => ({
    gridData: getGridData(),
    cellStyles,
    maxRow,
    maxCol,
    mapName: "LayerPalette Map", // This will be overridden by the parent
    template: template || "custom",
    nodes: nodes // ノード情報を追加
  }), [getGridData, cellStyles, maxRow, maxCol, template, nodes])

  // Notify parent when export data changes
  useEffect(() => {
    if (onExportDataReady && exportData) {
      onExportDataReady(exportData)
    }

    // Also set global variables for backward compatibility
    if (window) {
      (window as any).layerPaletteGridData = exportData.gridData
      ;(window as any).layerPaletteCellStyles = cellStyles
      ;(window as any).layerPaletteMaxRow = maxRow
      ;(window as any).layerPaletteMaxCol = maxCol
    }
  }, [exportData, cellStyles, maxRow, maxCol]) // Removed onExportDataReady from dependencies

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          ライブプレビュー
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-500 bg-white/70 px-3 py-1 rounded-full">Excel風表示</div>
          <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">VBAロジック適用</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-xl overflow-hidden animate-fade-in">
        <div className="overflow-auto max-h-[calc(100vh-200px)]">
          <div className="min-w-[1200px]">
            {/* Header row - Fixed layout */}
            <div className="grid grid-cols-[48px_repeat(15,80px)] bg-gradient-to-r from-slate-100 to-blue-100 border-b-2 border-blue-200">
              {/* Empty cell for row numbers column */}
              <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gradient-to-b from-slate-50 to-slate-100"></div>
              {/* Column headers */}
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gradient-to-b from-slate-50 to-slate-100"
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>

            {/* Data rows - Fixed layout */}
            {Array.from({ length: totalRows }, (_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[48px_repeat(15,80px)] border-b border-slate-200">
                {/* Row number */}
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 min-h-[48px] flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
                  {rowIndex + 1}
                </div>
                
                {/* Data cells */}
                {Array.from({ length: 15 }, (_, colIndex) => {
                  const cell = grid[rowIndex]?.[colIndex]
                  const cellStyle = getCellStyle(cell, rowIndex, colIndex)
                  
                  if (cell) {
                    const { node } = cell
                    const isSelected = selectedNodeId === node.id

                    return (
                      <div
                        key={colIndex}
                        className={`p-3 border-r border-slate-200 min-h-[48px] flex items-center transition-all cursor-pointer ${
                          isSelected ? "ring-2 ring-indigo-500 bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                        style={cellStyle}
                        onClick={() => onNodeSelect && onNodeSelect(node.id)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: node.backgroundColor }}
                          />
                          <span className="text-sm font-medium text-slate-700 truncate">{node.title}</span>
                        </div>
                      </div>
                    )
                  } else {
                    return (
                      <div
                        key={colIndex}
                        className="p-3 border-r border-slate-200 min-h-[48px] hover:bg-slate-50"
                        style={cellStyle}
                      />
                    )
                  }
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChevronRight className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-slate-500">ノードを追加するとプレビューが表示されます</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {nodes.length > 0 && (
        <div className="mt-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-blue-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">VBAロジック適用済み</h4>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>列全体: ヘッダー色適用</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>右側拡張: テキストセル色適用</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-400 border border-slate-600 rounded"></div>
              <span>罫線: VBAマクロ準拠</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
