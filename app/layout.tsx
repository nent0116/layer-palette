import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { LayerPaletteProvider } from "@/contexts/layer-palette-context"
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LayerPalette - 階層構造管理ツール",
  description: "階層構造を視覚的に管理し、Excel形式でエクスポートできるツール",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ErrorBoundary>
          <LayerPaletteProvider>
            {children}
            <Toaster />
          </LayerPaletteProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
