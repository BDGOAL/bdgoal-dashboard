"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function ResetPasswordError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[auth/reset-password/error]", {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border p-5">
        <h1 className="text-lg font-semibold">重設密碼頁面發生錯誤</h1>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          無法載入重設密碼流程，請重新寄送重設密碼連結後再試一次。
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          {error.message || "Unexpected error"}
        </p>
        {error.digest ? (
          <p className="text-muted-foreground mt-1 text-xs">追蹤代碼：{error.digest}</p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={() => reset()}>
            重試
          </Button>
          <Button type="button" variant="ghost" onClick={() => (window.location.href = "/login")}>
            回登入頁
          </Button>
        </div>
      </div>
    </main>
  )
}

