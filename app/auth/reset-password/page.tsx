"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    if (!password || !confirmPassword) {
      setError("請輸入新密碼與確認密碼。")
      return
    }
    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致。")
      return
    }
    if (password.length < 8) {
      setError("密碼至少需要 8 個字元。")
      return
    }

    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) {
        setError(`更新密碼失敗：${updateError.message}`)
        return
      }
      setMessage("密碼已更新，正在返回 Dashboard...")
      router.replace("/")
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新密碼時發生未知錯誤。")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border p-5">
        <h1 className="text-lg font-semibold">重設密碼</h1>
        <p className="text-muted-foreground mt-1 text-sm">請輸入新的登入密碼。</p>
        {error ? (
          <p className="text-destructive mt-2 text-xs" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-2 text-xs text-emerald-500" role="status">
            {message}
          </p>
        ) : null}
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Input
            type="password"
            placeholder="新密碼"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="確認新密碼"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "更新中..." : "更新密碼"}
          </Button>
        </form>
      </div>
    </main>
  )
}

