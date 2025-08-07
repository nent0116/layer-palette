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

// WBSテンプレート用の階層構造をフラット化する関数
function flattenWBSNodes(nodes: LayerNode[], level = 0, startIndex = 0): FlatNode[] {
  let currentIndex = startIndex
  const result: FlatNode[] = []

  nodes.forEach((node) => {
    const nodeStartIndex = currentIndex
    
    result.push({
      node,
      level,
      rowIndex: currentIndex,
      parentRowIndex: level > 0 ? startIndex - 1 : undefined,
      maxDescendantLevel: level,
    })
    currentIndex++

    if (node.children.length > 0) {
      const childResults = flattenWBSNodes(node.children, level + 1, currentIndex)
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

// WBSテンプレート用のセルスタイル計算
function calculateWBSCellStyles(flatNodes: FlatNode[], totalRows: number, totalCols: number) {
  const cellStyles: { [key: string]: { backgroundColor?: string; borders?: any } } = {}

  // WBSテンプレートの1行目の日本語ヘッダー（A1～H1）に薄いグレーの背景色と罫線を適用
  for (let col = 0; col < 8; col++) {
    const cellKey = `0-${col}`
    cellStyles[cellKey] = {
      backgroundColor: "#f3f4f6", // 薄いグレー
      borders: { top: true, left: true, bottom: true, right: true }
    }
  }

  // 親タスク、子タスク、孫タスクの列全体に背景色を適用（Sitemapテンプレートと同様のロジック）
  const maxRow = flatNodes.length > 0 ? Math.max(...flatNodes.map(fn => fn.rowIndex)) : 0

  // 各行の最初の値がある列を特定（WBSテンプレート用）
  const colmax: { [row: number]: number } = {}
  flatNodes.forEach((flatNode) => {
    const { rowIndex, level } = flatNode
    if (!colmax[rowIndex] || level < colmax[rowIndex]) {
      colmax[rowIndex] = level
    }
  })

  // 親タスク（列A）全体に背景色を適用
  for (let row = 0; row <= maxRow; row++) {
    const cellKey = `${row + 1}-0` // データ行は2行目から開始（rowIndex + 1）
    const flatNode = flatNodes.find(fn => fn.rowIndex === row && fn.level === 0)
    if (flatNode) {
      cellStyles[cellKey] = {
        backgroundColor: flatNode.node.backgroundColor,
        borders: { top: true, left: true, bottom: true, right: true }
      }
    } else {
      // 親タスクがない行でも列全体に薄い色を適用
      cellStyles[cellKey] = {
        backgroundColor: "#3B82F640", // 親タスクの色の薄い版
        borders: { top: true, left: true, bottom: true, right: true }
      }
    }
  }

  // 子タスク（列B）全体に背景色を適用
  for (let row = 0; row <= maxRow; row++) {
    const cellKey = `${row + 1}-1` // データ行は2行目から開始（rowIndex + 1）
    const flatNode = flatNodes.find(fn => fn.rowIndex === row && fn.level === 1)
    if (flatNode) {
      cellStyles[cellKey] = {
        backgroundColor: flatNode.node.backgroundColor,
        borders: { top: true, left: true, bottom: true, right: true }
      }
    } else {
      // 子タスクがない行でも列全体に薄い色を適用
      cellStyles[cellKey] = {
        backgroundColor: "#06B6D440", // 子タスクの色の薄い版
        borders: { top: true, left: true, bottom: true, right: true }
      }
    }
  }

  // 孫タスク（列C）全体に背景色を適用
  for (let row = 0; row <= maxRow; row++) {
    const cellKey = `${row + 1}-2` // データ行は2行目から開始（rowIndex + 1）
    const flatNode = flatNodes.find(fn => fn.rowIndex === row && fn.level === 2)
    if (flatNode) {
      cellStyles[cellKey] = {
        backgroundColor: flatNode.node.backgroundColor,
        borders: { top: true, left: true, bottom: true, right: true }
      }
    } else {
      // 孫タスクがない行でも列全体に薄い色を適用
      cellStyles[cellKey] = {
        backgroundColor: "#10B98140", // 孫タスクの色の薄い版
        borders: { top: true, left: true, bottom: true, right: true }
      }
    }
  }

    // 横方向の背景着色ロジック（Sitemapテンプレートと同様）- A列～C列のみ
    for (let row = 0; row <= maxRow; row++) {
      const firstValueCol = colmax[row]
      if (firstValueCol !== undefined && firstValueCol <= 2) { // A列～C列のみ（0-2）
        // テキストがあるセルとその右側のセルには、ヘッダー色と同じ薄い色を使用
        let headerColor: string
        
        // レベルに応じてヘッダー色を決定
        if (firstValueCol === 0) {
          headerColor = "#3B82F640" // 親タスクの色の薄い版
        } else if (firstValueCol === 1) {
          headerColor = "#06B6D440" // 子タスクの色の薄い版
        } else if (firstValueCol === 2) {
          headerColor = "#10B98140" // 孫タスクの色の薄い版
        } else {
          headerColor = "#f8fafc" // デフォルトの薄いグレー
        }
        
        // テキストがあるセルに背景色を適用（ヘッダー色と同じ薄い色）
        const textCellKey = `${row + 1}-${firstValueCol}`
        if (!cellStyles[textCellKey]) cellStyles[textCellKey] = {}
        cellStyles[textCellKey].backgroundColor = headerColor
        
        // テキストより右のセルに同じ色を適用（ヘッダー色と同じ薄い色）- C列までのみ
        if (firstValueCol < 2) { // C列まで（0-2）
          for (let col = firstValueCol + 1; col <= 2; col++) {
            const cellKey = `${row + 1}-${col}`
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
            const cellKey = `${row + 1}-${col}`
            if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
            if (!cellStyles[cellKey].borders) cellStyles[cellKey].borders = {}
            cellStyles[cellKey].borders.right = true
          }
        }
      }
    }

    // 担当者名、開始日、終了日、ステータス、進捗率の列（D2からH列まで）に罫線を適用
    for (let row = 0; row <= maxRow; row++) {
      for (let col = 3; col < 8; col++) {
        const cellKey = `${row + 1}-${col}`
        if (!cellStyles[cellKey]) {
          cellStyles[cellKey] = {
            backgroundColor: "#f8fafc", // 薄いグレー
            borders: { top: true, left: true, bottom: true, right: true }
          }
        }
      }
    }

    return cellStyles
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

  return cellStyles
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
  // WBSテンプレートとコンテンツカレンダーテンプレート用の情報抽出関数
  const extractHierarchicalInfo = useCallback((notes: string) => {
    const info: { [key: string]: string } = {}
    const lines = notes.split('\n')
    lines.forEach(line => {
      if (line.includes('担当者名:')) {
        info.assignee = line.split('担当者名:')[1]?.trim() || ''
      } else if (line.includes('開始日:')) {
        info.startDate = line.split('開始日:')[1]?.trim() || ''
      } else if (line.includes('終了日:')) {
        info.endDate = line.split('終了日:')[1]?.trim() || ''
      } else if (line.includes('ステータス:')) {
        info.status = line.split('ステータス:')[1]?.trim() || ''
      } else if (line.includes('進捗率:')) {
        info.progress = line.split('進捗率:')[1]?.trim() || ''
      }
    })
    return info
  }, [])

  // WBSテンプレートとコンテンツカレンダーテンプレート用の専用ロジック
  const flatNodes = useMemo(() => 
    (template === "wbs" || template === "content-calendar") ? flattenWBSNodes(nodes) : flattenNodes(nodes), 
    [nodes, template]
  )
  const totalRows = flatNodes.length
  const totalCols = 15

  // WBSテンプレートとコンテンツカレンダーテンプレート用のセルスタイル計算
  const cellStyles = useMemo(() => 
    (template === "wbs" || template === "content-calendar") ? calculateWBSCellStyles(flatNodes, totalRows, totalCols) : calculateCellStyles(flatNodes, totalRows, totalCols),
    [flatNodes, totalRows, totalCols, template]
  )

  // グリッドデータの作成
  const grid = useMemo(() => {
    const gridData: (FlatNode | null)[][] = Array.from({ length: totalRows }, () => Array.from({ length: totalCols }, () => null))

    flatNodes.forEach((flatNode) => {
      const { rowIndex, level } = flatNode
      
      // WBSテンプレートとコンテンツカレンダーテンプレートの場合、レベルに応じて適切な列に配置
      if (template === "wbs" || template === "content-calendar") {
        if (level === 0) {
          // 親タスクは列A（インデックス0）に配置
          gridData[rowIndex][0] = flatNode
        } else if (level === 1) {
          // 子タスクは列B（インデックス1）に配置
          gridData[rowIndex][1] = flatNode
        } else if (level === 2) {
          // 孫タスクは列C（インデックス2）に配置
          gridData[rowIndex][2] = flatNode
        }
        
        // 担当者名、開始日、終了日、ステータス、進捗率の列は空にする（データを配置しない）
      } else {
        // 通常のテンプレートの場合
        gridData[rowIndex][level] = flatNode
      }
    })

    return gridData
  }, [flatNodes, totalRows, totalCols, template])

  // セルスタイル取得関数
  const getCellStyle = (cell: FlatNode | null, rowIndex: number, colIndex: number) => {
    let cellKey: string
    
    if (template === "wbs" || template === "content-calendar") {
      // WBSテンプレートとコンテンツカレンダーテンプレートの場合、データ行は2行目から開始（rowIndex + 1）
      const actualRowIndex = rowIndex + 1
      cellKey = `${actualRowIndex}-${colIndex}`
    } else {
      // 通常のテンプレートの場合
      cellKey = `${rowIndex}-${colIndex}`
    }
    
    const style = cellStyles[cellKey] || {}
    return {
      backgroundColor: style.backgroundColor || "transparent",
      borderTop: style.borders?.top ? "1px solid #e2e8f0" : "none",
      borderBottom: style.borders?.bottom ? "1px solid #e2e8f0" : "none",
      borderLeft: style.borders?.left ? "1px solid #e2e8f0" : "none",
      borderRight: style.borders?.right ? "1px solid #e2e8f0" : "none",
    }
  }

  // Memoize grid data generation
  const getGridData = useCallback(() => {
    const data: (string | number)[][] = []
    
    if (template === "wbs" || template === "content-calendar") {
      // 1行目：WBSテンプレートとコンテンツカレンダーテンプレート用の日本語ヘッダー
      const headerRow: (string | number)[] = [1] // 行番号1
      headerRow.push('親タスク', '子タスク', '孫タスク', '担当者名', '開始日', '終了日', 'ステータス', '進捗率')
      // 残りの列は空文字
      for (let i = 8; i < 15; i++) {
        headerRow.push('')
      }
      data.push(headerRow)
      
      // データ行（2行目から）
      for (let row = 0; row < totalRows; row++) {
        const dataRow: (string | number)[] = [row + 2] // 行番号は2から開始
        for (let col = 0; col < 15; col++) {
          const cell = grid[row]?.[col]
          if (cell) {
            // 親タスク、子タスク、孫タスクのみ表示
            if (col < 3) {
              dataRow.push(cell.node.title.toString())
            } else {
              // 担当者名～進捗率の列は空
              dataRow.push('')
            }
          } else {
            dataRow.push('')
          }
        }
        data.push(dataRow)
      }
    } else {
      // 通常のテンプレート用
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
    }
    
    return data
  }, [grid, totalRows, template])

  // Memoize export data
  const exportData = useMemo(() => ({
    gridData: getGridData(),
    cellStyles,
    maxRow: totalRows,
    maxCol: totalCols,
    mapName: "LayerPalette Map",
    template: template || "custom",
    nodes: nodes
  }), [getGridData, cellStyles, totalRows, totalCols, template, nodes])

  // Notify parent when export data changes
  useEffect(() => {
    if (onExportDataReady && exportData) {
      onExportDataReady(exportData)
    }

    // Also set global variables for backward compatibility
    if (typeof window !== 'undefined') {
      (window as any).layerPaletteGridData = exportData.gridData
      ;(window as any).layerPaletteCellStyles = cellStyles
      ;(window as any).layerPaletteMaxRow = totalRows
      ;(window as any).layerPaletteMaxCol = totalCols
    }
  }, [exportData, onExportDataReady])

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
            {/* Header row - Fixed layout (アルファベット) - 0行目 */}
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

            {/* WBSテンプレート用の1行目ヘッダー */}
            {template === "wbs" && (
              <div className="grid grid-cols-[48px_repeat(15,80px)] bg-gradient-to-r from-gray-100 to-gray-200 border-b-2 border-blue-200">
                {/* Row number */}
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  1
                </div>
                {/* WBS専用ヘッダー */}
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  親タスク
                </div>
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  子タスク
                </div>
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  孫タスク
                </div>
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  担当者名
                </div>
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  開始日
                </div>
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  終了日
                </div>
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  ステータス
                </div>
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100">
                  進捗率
                </div>
                {/* 残りの列は通常のアルファベット */}
                {Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={i + 8}
                    className="p-3 text-xs font-bold text-center border-r border-blue-200 bg-gray-100"
                  >
                    {String.fromCharCode(73 + i)}
                  </div>
                ))}
              </div>
            )}

            {/* Data rows - Fixed layout */}
            {Array.from({ length: totalRows }, (_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[48px_repeat(15,80px)] border-b border-slate-200">
                {/* Row number */}
                <div className="p-3 text-xs font-bold text-center border-r border-blue-200 min-h-[48px] flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
                  {template === "wbs" ? rowIndex + 2 : rowIndex + 1}
                </div>
                
                {/* Data cells */}
                {Array.from({ length: 15 }, (_, colIndex) => {
                  const cell = grid[rowIndex]?.[colIndex]
                  const cellStyle = getCellStyle(cell, rowIndex, colIndex)
                  
                  if (cell) {
                    const { node } = cell
                    const isSelected = selectedNodeId === node.id

                    // WBSテンプレート用の列表示
                    if (template === "wbs" && colIndex < 8) {
                      let displayContent = ""
                      let displayClass = "text-sm font-medium text-slate-700 truncate"
                      let showDot = false
                      
                      switch (colIndex) {
                        case 0: // 親タスク
                          if (node.level === 0) {
                            displayContent = node.title
                            showDot = true
                          }
                          break
                        case 1: // 子タスク
                          if (node.level === 1) {
                            displayContent = node.title
                            showDot = true
                          }
                          break
                        case 2: // 孫タスク
                          if (node.level === 2) {
                            displayContent = node.title
                            showDot = true
                          }
                          break
                        case 3: // 担当者名
                          displayContent = ""
                          displayClass = "text-xs text-slate-600 truncate"
                          break
                        case 4: // 開始日
                          displayContent = ""
                          displayClass = "text-xs text-slate-600 truncate"
                          break
                        case 5: // 終了日
                          displayContent = ""
                          displayClass = "text-xs text-slate-600 truncate"
                          break
                        case 6: // ステータス
                          displayContent = ""
                          displayClass = "text-xs font-medium truncate text-slate-600"
                          break
                        case 7: // 進捗率
                          displayContent = ""
                          displayClass = "text-xs font-bold text-slate-700 truncate"
                          break
                      }

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
                            {showDot && (
                              <div
                                className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                                style={{ backgroundColor: node.backgroundColor }}
                              />
                            )}
                            <span className={displayClass}>{displayContent}</span>
                          </div>
                        </div>
                      )
                    }

                    // 通常の表示（WBSテンプレート以外、またはWBSテンプレートの8列目以降）
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
