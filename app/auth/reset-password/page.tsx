"use client"

import * as React from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = React.useState(false)
  const [configError, setConfigError] = React.useState<string | null>(null)

  const supabase = React.useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return null
    }
    return createBrowserClient(url, anon)
  }, [])

  function formatSupabaseError(
    prefix: string,
    err: { message: string; code?: string; status?: number },
  ) {
    const details = [err.code ? `code=${err.code}` : null, err.status ? `status=${err.status}` : null]
      .filter(Boolean)
      .join(", ")
    return details ? `${prefix}：${err.message}（${details}）` : `${prefix}：${err.message}`
  }

  React.useEffect(() => {
    console.info("[auth/reset-password] page rendered")
    let cancelled = false
    void (async () => {
      try {
        if (!supabase) {
          if (!cancelled) {
            setConfigError("登入設定缺失，請聯絡管理員或稍後再試。")
            setError("Your reset session is missing or expired. Please request a new password reset link.")
          }
          return
        }
        const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] =
          await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()])

        if (sessionError || userError) {
          const err = sessionError ?? userError
          console.error("[auth/reset-password] session check failed", {
            message: err?.message,
            code: (err as { code?: string } | null)?.code,
            status: (err as { status?: number } | null)?.status,
          })
        }

        const hasSession = Boolean(sessionData.session)
        const hasUser = Boolean(userData.user)
        console.info("[auth/reset-password] session check", { hasSession, hasUser })

        if (!cancelled && (!hasSession || !hasUser)) {
          setError("Your reset session is missing or expired. Please request a new password reset link.")
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? `無法驗證重設密碼會話：${e.message}`
              : "無法驗證重設密碼會話，請重新寄送重設連結。",
          )
        }
      } finally {
        if (!cancelled) setSessionChecked(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [supabase])

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
      if (!supabase) {
        setError("登入設定缺失，請聯絡管理員或稍後再試。")
        return
      }
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) {
        const userErr = userError as { message: string; code?: string; status?: number }
        console.error("[auth/reset-password] getUser before update failed", userErr)
        setError(formatSupabaseError("無法確認重設會話", userErr))
        return
      }
      if (!user) {
        setError("Your reset session is missing or expired. Please request a new password reset link.")
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) {
        const updateErr = updateError as { message: string; code?: string; status?: number }
        console.error("[auth/reset-password] updateUser failed", updateErr)
        setError(formatSupabaseError("更新密碼失敗", updateErr))
        return
      }
      console.info("[auth/reset-password] password updated, redirect => /")
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
        {configError ? (
          <p className="text-destructive mt-2 text-xs" role="alert">
            {configError}
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
          <Button type="submit" className="w-full" disabled={pending || !sessionChecked || !supabase}>
            {pending ? "更新中..." : !sessionChecked ? "檢查重設會話中..." : "更新密碼"}
          </Button>
        </form>
      </div>
    </main>
  )
}

