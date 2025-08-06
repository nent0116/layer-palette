export interface LayerNode {
  id: string
  title: string
  backgroundColor: string
  notes: string
  children: LayerNode[]
  parentId?: string
  order: number
}
