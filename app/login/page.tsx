import { redirect } from "next/navigation"

import {
  createSupabaseServerClient,
  getMissingSupabasePublicEnv,
} from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

async function sendMagicLink(formData: FormData) {
  "use server"
  const email = String(formData.get("email") ?? "").trim()
  if (!email) return
  try {
    const supabase = await createSupabaseServerClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })
    if (error) {
      console.error("[login/sendMagicLink] signInWithOtp failed:", error.message)
      throw new Error(`寄送登入連結失敗：${error.message}`)
    }
  } catch (error) {
    console.error("[login/sendMagicLink] fatal:", error)
    throw error
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  let user: { id: string } | null = null
  let configError: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      // No session is expected for logged-out users; don't treat as fatal.
      if (!/Auth session missing/i.test(error.message)) {
        console.error("[login/page] getUser error:", error.message)
        configError = `無法驗證登入狀態：${error.message}`
      }
    } else {
      user = authUser as { id: string } | null
    }
  } catch (error) {
    const missing = getMissingSupabasePublicEnv()
    const msg =
      missing.length > 0
        ? `Missing ${missing.join(", ")} in production`
        : error instanceof Error
          ? error.message
          : "未知錯誤"
    console.error("[login/page] initialization fatal:", {
      message: msg,
      stack: error instanceof Error ? error.stack : undefined,
    })
    configError = msg
  }
  const next = (await searchParams).next
  if (user) {
    redirect(next || "/")
  }

  if (configError) {
    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border p-5">
          <h1 className="text-lg font-semibold">登入設定錯誤</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {configError}
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            請檢查 Vercel 專案環境變數後重新部署。
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border p-5">
        <h1 className="text-lg font-semibold">BDGoal Dashboard 登入</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          使用公司信箱接收 magic link。
        </p>
        <form action={sendMagicLink} className="mt-4 space-y-3">
          <Input name="email" type="email" placeholder="name@bdgoal.com" required />
          <Button type="submit" className="w-full">
            寄送登入連結
          </Button>
        </form>
      </div>
    </main>
  )
}

