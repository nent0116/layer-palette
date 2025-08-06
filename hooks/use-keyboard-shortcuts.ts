"use client"

import { useEffect } from "react"

interface KeyboardShortcuts {
  onUndo?: () => void
  onRedo?: () => void
  onAddNode?: () => void
  onAddChildNode?: () => void
  onDeleteNode?: () => void
  onSave?: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        shortcuts.onUndo?.()
      }

      // Redo
      if ((e.ctrlKey && e.shiftKey && e.key === "Z") || (e.ctrlKey && e.key === "y")) {
        e.preventDefault()
        shortcuts.onRedo?.()
      }

      // Add node (Enter)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        shortcuts.onAddNode?.()
      }

      // Add child node (Shift+Enter)
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault()
        shortcuts.onAddChildNode?.()
      }

      // Delete node
      if (e.key === "Delete") {
        e.preventDefault()
        shortcuts.onDeleteNode?.()
      }

      // Save
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault()
        shortcuts.onSave?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}
