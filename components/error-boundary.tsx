"use client"

import React, { Component, type ReactNode } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.setState({
      errorInfo: errorInfo.componentStack || undefined,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-800">エラーが発生しました</CardTitle>
              <CardDescription>
                予期しないエラーが発生しました。アプリケーションを再読み込みしてみてください。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="text-left">
                  <details className="bg-gray-50 p-3 rounded text-sm">
                    <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                      エラー詳細
                    </summary>
                    <pre className="whitespace-pre-wrap text-xs text-red-600 mb-2">
                      {this.state.error.message}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="whitespace-pre-wrap text-xs text-gray-600">
                        {this.state.errorInfo}
                      </pre>
                    )}
                  </details>
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  再試行
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  size="sm"
                >
                  ページを再読み込み
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// 関数型コンポーネント版のエラーバウンダリ（React 18+でのみ使用可能）
export function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error
  resetErrorBoundary: () => void 
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-red-800">エラーが発生しました</CardTitle>
          <CardDescription>
            予期しないエラーが発生しました。アプリケーションを再読み込みしてみてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {process.env.NODE_ENV === "development" && (
            <div className="text-left">
              <details className="bg-gray-50 p-3 rounded text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  エラー詳細
                </summary>
                <pre className="whitespace-pre-wrap text-xs text-red-600">
                  {error.message}
                </pre>
              </details>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={resetErrorBoundary}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              再試行
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              size="sm"
            >
              ページを再読み込み
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
