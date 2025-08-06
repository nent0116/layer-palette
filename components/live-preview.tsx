"use client"

import { ChevronRight } from "lucide-react"
import type { LayerNode, LayerMap } from "@/contexts/layer-palette-context"

interface LivePreviewProps {
  nodes: LayerNode[]
  selectedNodeId?: string
  onNodeSelect: (nodeId: string) => void
  template?: LayerMap["template"]
}

interface FlatNode {
  node: LayerNode
  level: number
  rowIndex: number
  parentRowIndex?: number
  lastChildRowIndex?: number
}

function flattenNodes(nodes: LayerNode[], level = 0, startIndex = 0): FlatNode[] {
  let currentIndex = startIndex
  const result: FlatNode[] = []

  nodes.forEach((node) => {
    const nodeStartIndex = currentIndex
    result.push({
      node,
      level,
      rowIndex: currentIndex,
      parentRowIndex: level > 0 ? startIndex - 1 : undefined,
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

function calculateNodeSpans(flatNodes: FlatNode[]): Map<string, { startRow: number; endRow: number }> {
  const spans = new Map<string, { startRow: number; endRow: number }>()

  flatNodes.forEach((flatNode) => {
    const { node, rowIndex, lastChildRowIndex } = flatNode
    const endRow = lastChildRowIndex !== undefined ? lastChildRowIndex : rowIndex

    spans.set(node.id, {
      startRow: rowIndex,
      endRow: endRow,
    })
  })

  return spans
}

export function LivePreview({ nodes, selectedNodeId, onNodeSelect, template = "custom" }: LivePreviewProps) {
  const flatNodes = flattenNodes(nodes)
  const nodeSpans = calculateNodeSpans(flatNodes)
  const maxLevel = Math.max(...flatNodes.map((fn) => fn.level), 0)
  const totalRows = Math.max(flatNodes.length, 15) // Minimum 15 rows for display

  // Create a grid structure with enhanced cell coloring for sitemap
  const createGrid = () => {
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

    // For sitemap template, fill background cells based on node spans
    if (template === "sitemap") {
      flatNodes.forEach((flatNode) => {
        const { node, level, rowIndex } = flatNode
        const span = nodeSpans.get(node.id)

        if (span && level < 15) {
          // Fill the background for this node's span
          for (let row = span.startRow; row <= span.endRow && row < totalRows; row++) {
            // Only fill if there's no node already in this cell
            if (!grid[row][level]) {
              grid[row][level] = { ...flatNode, isBackground: true } as FlatNode & { isBackground: boolean }
            }
          }
        }
      })
    }

    return grid
  }

  const grid = createGrid()

  const getCellStyle = (cell: FlatNode | null) => {
    if (!cell) return {}

    const baseColor = cell.node.backgroundColor
    const isBackground = (cell as any).isBackground
    const isMainNode = !isBackground

    if (template === "sitemap") {
      if (isBackground) {
        // Background cells have a lighter version of the color
        return {
          backgroundColor: baseColor + "30", // 18.75% opacity
        }
      } else if (isMainNode) {
        // Main node cell has full color
        return {
          backgroundColor: baseColor + "80", // 50% opacity
        }
      }
    } else {
      return {
        backgroundColor: baseColor + "20", // 12.5% opacity for other templates
      }
    }

    return {}
  }

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          ライブプレビュー
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-500 bg-white/70 px-3 py-1 rounded-full">Excel風表示</div>
          {template === "sitemap" && (
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">階層拡張表示</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-xl overflow-hidden animate-fade-in">
        <div className="overflow-auto max-h-[calc(100vh-200px)]">
          <div className="min-w-[1200px]">
            {/* Header row */}
            <div className="flex bg-gradient-to-r from-slate-100 to-blue-100 border-b-2 border-blue-200">
              {/* Empty cell for row numbers column */}
              <div className="p-3 text-xs font-bold text-center border-r border-blue-200 w-12 bg-gradient-to-b from-slate-50 to-slate-100"></div>
              {/* Column headers */}
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  className="p-3 text-xs font-bold text-center border-r border-blue-200 min-w-[80px] bg-gradient-to-b from-slate-50 to-slate-100"
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>

            {/* Row numbers and data */}
            <div className="flex">
              {/* Row numbers column */}
              <div className="flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 border-r-2 border-blue-200">
                {Array.from({ length: totalRows }, (_, i) => (
                  <div
                    key={i}
                    className="p-3 text-xs font-bold text-center border-b border-blue-200 min-h-[48px] flex items-center justify-center w-12"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Data grid */}
              <div className="flex-1">
                <div className="grid grid-cols-15">
                  {grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      if (cell) {
                        const { node } = cell
                        const isSelected = selectedNodeId === node.id
                        const isBackground = (cell as any).isBackground
                        const cellStyle = getCellStyle(cell)

                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`p-3 border-r border-b border-slate-200 min-h-[48px] flex items-center transition-all min-w-[80px] ${
                              !isBackground ? "cursor-pointer" : ""
                            } ${
                              isSelected && !isBackground ? "ring-2 ring-indigo-500 bg-indigo-50" : "hover:bg-slate-50"
                            }`}
                            style={cellStyle}
                            onClick={() => !isBackground && onNodeSelect(node.id)}
                          >
                            {!isBackground && (
                              <div className="flex items-center gap-2 w-full">
                                <div
                                  className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: node.backgroundColor }}
                                />
                                <span className="text-sm font-medium text-slate-700 truncate">{node.title}</span>
                              </div>
                            )}
                          </div>
                        )
                      } else {
                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className="p-3 border-r border-b border-slate-200 min-h-[48px] hover:bg-slate-50 min-w-[80px]"
                          />
                        )
                      }
                    }),
                  )}
                </div>
              </div>
            </div>
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
          <h4 className="text-sm font-semibold text-slate-700 mb-2">階層の説明</h4>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>A列: ルートレベル</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>B列: 第2階層</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>C列: 第3階層</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>D列: 第4階層</span>
            </div>
            {template === "sitemap" && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-300">
                <div className="w-3 h-3 bg-slate-300 rounded"></div>
                <span>階層拡張: 親ノードの色が子孫の範囲まで拡張</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
