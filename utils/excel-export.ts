import ExcelJS from 'exceljs'
import saveAs from 'file-saver'

interface ExportData {
  gridData: any[][]
  cellStyles?: { [key: string]: { backgroundColor?: string; borders?: any } }
  maxRow?: number
  maxCol?: number
  mapName: string
  template: string
  nodes?: any[] // ノードデータを追加
}

// Convert hex color to ExcelJS ARGB format
function hexToExcelARGB(hex: string): string {
  // Remove # if present and ensure uppercase
  const cleanHex = hex.replace('#', '').toUpperCase()
  
  // If the hex color already includes alpha (8 characters), convert to ARGB format
  if (cleanHex.length === 8) {
    const alpha = cleanHex.substring(0, 2)
    const rgb = cleanHex.substring(2, 8)
    return `${alpha}${rgb}`
  }
  
  // If the hex color is 6 characters, add FF (fully opaque) as alpha
  if (cleanHex.length === 6) {
    return `FF${cleanHex}`
  }
  
  // Default fallback - assume it's a 6-character hex and add FF alpha
  return `FF${cleanHex}`
}

// 色を薄くする関数（明度を上げる）
function lightenColor(hex: string, factor: number = 0.7): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '')
  
  // Convert hex to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  
  // Lighten the color by mixing with white (more natural approach)
  const lightenR = Math.min(255, Math.round(r + (255 - r) * factor))
  const lightenG = Math.min(255, Math.round(g + (255 - g) * factor))
  const lightenB = Math.min(255, Math.round(b + (255 - b) * factor))
  
  // Convert back to hex
  const lightenHex = 
    lightenR.toString(16).padStart(2, '0') +
    lightenG.toString(16).padStart(2, '0') +
    lightenB.toString(16).padStart(2, '0')
  
  return lightenHex.toUpperCase()
}

// ノードの色を取得する関数（色そのものを薄くする）
function getNodeColor(nodes: any[], row: number, col: number): string {
  // フラット化されたノードリストから該当するノードを検索
  const flatNodes = flattenNodes(nodes)
  const flatNode = flatNodes.find(fn => fn.rowIndex === row && fn.level === col)
  
  if (flatNode && flatNode.node.backgroundColor) {
    // 色そのものを薄くする（明度を75%上げる）
    const lightenedColor = lightenColor(flatNode.node.backgroundColor, 0.75)
    return lightenedColor
  }
  
  return 'E5E7EB' // デフォルト色（薄いグレー）
}

// ヘッダー色を取得（色そのものを薄くする）
function getHeaderColor(col: number): string {
  const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#F97316', '#84CC16']
  const baseColor = colors[col % colors.length]
  // 色そのものを薄くする（明度を85%上げる）
  const lightenedColor = lightenColor(baseColor, 0.85)
  return lightenedColor
}

// ノードをフラット化する関数
function flattenNodes(nodes: any[], level = 0, startIndex = 0): any[] {
  const flatNodes: any[] = []
  let currentIndex = startIndex

  nodes.forEach((node) => {
    flatNodes.push({
      node,
      level,
      rowIndex: currentIndex,
    })
    currentIndex++

    if (node.children && node.children.length > 0) {
      const childNodes = flattenNodes(node.children, level + 1, currentIndex)
      flatNodes.push(...childNodes)
      currentIndex += childNodes.length
    }
  })

  return flatNodes
}

// VBAマクロのロジックを実装（ライブプレビューと同じロジック）
function calculateExcelCellStyles(gridData: any[][], nodes?: any[]) {
  // WBSテンプレートかどうかを判定（1行目に日本語ヘッダーがあるかどうかで判定）
  const isWBSTemplate = gridData.length > 0 && gridData[0].length > 1 && 
    typeof gridData[0][1] === 'string' && gridData[0][1] === '親タスク'
  
  let cleanedGridData: any[][]
  let startRowIndex = 0
  
  if (isWBSTemplate) {
    // WBSテンプレートの場合：1行目（日本語ヘッダー）を保持し、行番号列のみ削除
    cleanedGridData = gridData.map(row => row.slice(1))
    startRowIndex = 1 // 2行目からスタイル計算を開始
  } else {
    // 通常のテンプレートの場合：1行目と行番号列を削除
    cleanedGridData = gridData.slice(1).map(row => row.slice(1))
    startRowIndex = 0
  }
  
  // Colmax配列: 各行で最初に値が入っている列番号
  const colmax: { [row: number]: number } = {}
  let maxRow = 0
  let maxCol = 0

  // 各行の最初の値がある列を特定
  cleanedGridData.forEach((row, rowIndex) => {
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      if (row[colIndex] && row[colIndex].toString().trim() !== '') {
        colmax[rowIndex] = colIndex
        maxRow = Math.max(maxRow, rowIndex)
        maxCol = Math.max(maxCol, colIndex)
        break
      }
    }
  })

  // セルスタイル情報を格納
  const cellStyles: { [key: string]: { backgroundColor?: string; borders?: any } } = {}

  // WBSテンプレートの場合、1行目の日本語ヘッダー（A1～H1）に薄いグレーの背景色と罫線を適用
  if (isWBSTemplate) {
    for (let col = 0; col < 8; col++) {
      const cellKey = `0-${col}`
      cellStyles[cellKey] = {
        backgroundColor: "#f3f4f6", // 薄いグレー
        borders: { 
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      }
    }
  }

  // WBSテンプレートの場合、2行目からスタイル計算を開始
  const styleStartRow = isWBSTemplate ? 1 : 0

  // 列ごとに背景色を適用（ライブプレビューと同じロジック）
  for (let col = 0; col <= maxCol; col++) {
    const headerColor = getHeaderColor(col) // ライブプレビューと同じヘッダー色
    for (let row = styleStartRow; row <= maxRow; row++) {
      const cellKey = `${row}-${col}`
      if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
      cellStyles[cellKey].backgroundColor = headerColor
    }
  }

  // 各行の処理（ライブプレビューと同じロジック）
  for (let row = styleStartRow; row <= maxRow; row++) {
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
          cellStyles[cellKey].borders.top = { style: 'thin', color: { argb: 'FF000000' } }
          cellStyles[cellKey].borders.bottom = { style: 'thin', color: { argb: 'FF000000' } }
        }
      }

      // テキストがあるセルに上と左の枠線
      if (!cellStyles[textCellKey].borders) cellStyles[textCellKey].borders = {}
      cellStyles[textCellKey].borders.top = { style: 'thin', color: { argb: 'FF000000' } }
      cellStyles[textCellKey].borders.left = { style: 'thin', color: { argb: 'FF000000' } }

      // テキストより左のセルに内部垂直枠線
      if (firstValueCol > 0) {
        for (let col = 0; col < firstValueCol; col++) {
          const cellKey = `${row}-${col}`
          if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
          if (!cellStyles[cellKey].borders) cellStyles[cellKey].borders = {}
          cellStyles[cellKey].borders.right = { style: 'thin', color: { argb: 'FF000000' } }
        }
      }
    }
  }

  // WBSテンプレートの場合、データ行の空白セル（D2からH列まで）に罫線を適用
  if (isWBSTemplate) {
    for (let row = 1; row <= maxRow; row++) {
      for (let col = 3; col < 8; col++) {
        const cellKey = `${row}-${col}`
        if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
        if (!cellStyles[cellKey].borders) cellStyles[cellKey].borders = {}
        cellStyles[cellKey].borders.top = { style: 'thin', color: { argb: 'FF000000' } }
        cellStyles[cellKey].borders.bottom = { style: 'thin', color: { argb: 'FF000000' } }
        cellStyles[cellKey].borders.left = { style: 'thin', color: { argb: 'FF000000' } }
        cellStyles[cellKey].borders.right = { style: 'thin', color: { argb: 'FF000000' } }
      }
    }
  }

  // 全体の外枠線（WBSテンプレートの場合は2行目から）
  for (let row = styleStartRow; row <= maxRow; row++) {
    for (let col = 0; col <= maxCol; col++) {
      const cellKey = `${row}-${col}`
      if (!cellStyles[cellKey]) cellStyles[cellKey] = {}
      if (!cellStyles[cellKey].borders) cellStyles[cellKey].borders = {}
      
      if (row === styleStartRow) cellStyles[cellKey].borders.top = { style: 'medium', color: { argb: 'FF000000' } }
      if (row === maxRow) cellStyles[cellKey].borders.bottom = { style: 'medium', color: { argb: 'FF000000' } }
      if (col === 0) cellStyles[cellKey].borders.left = { style: 'medium', color: { argb: 'FF000000' } }
      if (col === maxCol) cellStyles[cellKey].borders.right = { style: 'medium', color: { argb: 'FF000000' } }
    }
  }

  return { cellStyles, maxRow, maxCol }
}

export async function exportToExcel(data: ExportData) {
  const { gridData, mapName, template, nodes } = data

  try {
    // VBAロジックでセルスタイルを計算（ノードデータを渡す）
    const { cellStyles, maxRow, maxCol } = calculateExcelCellStyles(gridData, nodes)
    
    // Create workbook using ExcelJS
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'LayerPalette'
    workbook.lastModifiedBy = 'LayerPalette'
    workbook.created = new Date()
    workbook.modified = new Date()
    
    // Set default font for the workbook
    workbook.views = [
      {
        x: 0, y: 0, width: 10000, height: 20000,
        firstSheet: 0, activeTab: 0, visibility: 'visible'
      }
    ]
    
    // Create main worksheet
    const worksheet = workbook.addWorksheet('LayerPalette', {
      properties: {
        defaultRowHeight: 25,
        defaultColWidth: 18
      }
    })
    
    // Set default font to Meiryo
    worksheet.properties.defaultRowHeight = 25
    worksheet.properties.defaultColWidth = 18
    
    // Remove header row and row number column from grid data
    // WBSテンプレートの場合は1行目（日本語ヘッダー）から開始
    let cleanedGridData: any[][]
    if (template === "wbs") {
      // WBSテンプレートの場合：1行目（日本語ヘッダー）から開始し、行番号列のみ削除
      cleanedGridData = gridData.map(row => row.slice(1))
    } else {
      // 通常のテンプレートの場合：1行目と行番号列を削除
      cleanedGridData = gridData.slice(1).map(row => row.slice(1))
    }
    
    // Add data to worksheet
    cleanedGridData.forEach((row, rowIndex) => {
      row.forEach((cellValue, colIndex) => {
        const cell = worksheet.getCell(rowIndex + 1, colIndex + 1)
        cell.value = cellValue || ''
        
        // Apply basic styling
        cell.alignment = {
          horizontal: cellValue && cellValue.toString().trim() !== '' ? 'left' : 'center',
          vertical: 'middle'
        }
        
        // Apply VBA-based styling
        const cellKey = `${rowIndex}-${colIndex}`
        const styleInfo = cellStyles[cellKey]
        
        if (styleInfo) {
          // Apply background color
          if (styleInfo.backgroundColor) {
            const argbColor = hexToExcelARGB(styleInfo.backgroundColor)
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: argbColor }
            }
          }
          
          // Apply borders
          if (styleInfo.borders) {
            const borders: any = {}
            if (styleInfo.borders.top) borders.top = styleInfo.borders.top
            if (styleInfo.borders.bottom) borders.bottom = styleInfo.borders.bottom
            if (styleInfo.borders.left) borders.left = styleInfo.borders.left
            if (styleInfo.borders.right) borders.right = styleInfo.borders.right
            cell.border = borders
          }
          
          // Apply font styling with Meiryo
          cell.font = {
            name: 'Meiryo',
            size: cellValue && cellValue.toString().trim() !== '' ? 11 : 10,
            bold: cellValue && cellValue.toString().trim() !== '',
            color: { argb: 'FF000000' }
          }
        } else {
          // Apply default font styling with Meiryo for cells without specific styling
          cell.font = {
            name: 'Meiryo',
            size: cellValue && cellValue.toString().trim() !== '' ? 11 : 10,
            color: { argb: 'FF000000' }
          }
        }
      })
    })
    
    // Set column widths
    for (let i = 1; i <= Math.max(maxCol + 1, 15); i++) {
      worksheet.getColumn(i).width = 18
    }
    
    // Create information worksheet
    const infoWorksheet = workbook.addWorksheet('Information')
    
    // Add metadata to information sheet
    const metaData = [
      ['LayerPalette Export Information (VBA Logic Applied)'],
      [''],
      ['Map Name:', mapName],
      ['Template:', template],
      ['Export Date:', new Date().toLocaleString('ja-JP')],
      ['Max Row:', maxRow.toString()],
      ['Max Col:', maxCol.toString()],
      [''],
      ['VBA Logic Implementation:'],
      ['1. Column-wide background colors from header row'],
      ['2. Text cell colors extend to the right'],
      ['3. Borders applied according to VBA macro rules'],
      ['4. Overall border frame around data range'],
      [''],
      ['Border Rules:'],
      ['- Text cells: Top and left borders'],
      ['- Right extension cells: Top and bottom borders'],
      ['- Left cells: Internal vertical borders'],
      ['- Outer frame: Medium borders around entire range'],
    ]
    
    // Add metadata to worksheet
    metaData.forEach((row, rowIndex) => {
      row.forEach((cellValue, colIndex) => {
        const cell = infoWorksheet.getCell(rowIndex + 1, colIndex + 1)
        cell.value = cellValue
        
        // Style the title
        if (rowIndex === 0 && colIndex === 0) {
          cell.font = { name: 'Meiryo', size: 16, bold: true, color: { argb: 'FF000000' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thick', color: { argb: 'FF000000' } },
            bottom: { style: 'thick', color: { argb: 'FF000000' } },
            left: { style: 'thick', color: { argb: 'FF000000' } },
            right: { style: 'thick', color: { argb: 'FF000000' } }
          }
        } else {
          // Apply default font styling with Meiryo for other cells
          cell.font = { name: 'Meiryo', size: 10, color: { argb: 'FF000000' } }
        }
      })
    })
    
    // Set column widths for information sheet
    infoWorksheet.getColumn(1).width = 35
    infoWorksheet.getColumn(2).width = 45
    
    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer()
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `${mapName}_VBA_${template}_${timestamp}.xlsx`
    
    // Download file using file-saver
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    saveAs(blob, filename)
    
  } catch (error) {
    console.error('Excel export error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Excelファイルのエクスポートに失敗しました: ${errorMessage}`)
  }
}

// Simple CSV export as backup option (unchanged)
export function exportToCSV(data: ExportData) {
  const { gridData, mapName, template } = data
  
  try {
    let csvContent = ''
    
    // Add header information
    csvContent += `LayerPalette Export (VBA Logic)\n`
    csvContent += `Map Name:,${mapName}\n`
    csvContent += `Template:,${template}\n`
    csvContent += `Export Date:,${new Date().toLocaleString('ja-JP')}\n`
    csvContent += `\n`
    
    // Remove header row and row number column from CSV data too
    // WBSテンプレートの場合は1行目（日本語ヘッダー）から開始
    let cleanedGridData: any[][]
    if (template === "wbs") {
      // WBSテンプレートの場合：1行目（日本語ヘッダー）から開始し、行番号列のみ削除
      cleanedGridData = gridData.map(row => row.slice(1))
    } else {
      // 通常のテンプレートの場合：1行目と行番号列を削除
      cleanedGridData = gridData.slice(1).map(row => row.slice(1))
    }
    
    // Add grid data
    cleanedGridData.forEach(row => {
      const csvRow = row.map(cell => {
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
      csvContent += csvRow + '\n'
    })
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `${mapName}_VBA_${template}_${timestamp}.csv`
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100)
    
  } catch (error) {
    console.error('CSV export error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`CSVファイルのエクスポートに失敗しました: ${errorMessage}`)
  }
}
