"use client"

import { useState } from "react"
import { HexColorPicker } from "react-colorful"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Palette } from "lucide-react"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

const presetColors = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#6B7280",
  "#374151",
  "#111827",
]

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(color)

  const handleInputChange = (value: string) => {
    setInputValue(value)
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onChange(value)
    }
  }

  const handleInputBlur = () => {
    if (!/^#[0-9A-F]{6}$/i.test(inputValue)) {
      setInputValue(color)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-16 h-10 p-1 border-2 border-emerald-200 hover:border-emerald-400 bg-transparent"
            >
              <div
                className="w-full h-full rounded-md border border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 animate-scale-in">
            <div className="space-y-4">
              <HexColorPicker color={color} onChange={onChange} />

              <div className="grid grid-cols-5 gap-2">
                {presetColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: presetColor }}
                    onClick={() => {
                      onChange(presetColor)
                      setInputValue(presetColor)
                    }}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
          onBlur={handleInputBlur}
          placeholder="#6366F1"
          className="flex-1 border-2 border-emerald-200 focus:border-emerald-500 bg-white/80 font-mono"
        />
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <Palette className="w-3 h-3" />
        クリックして色を選択、またはHEXコードを入力
      </div>
    </div>
  )
}
