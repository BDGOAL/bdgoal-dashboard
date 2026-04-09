import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

async function sendMagicLink(formData: FormData) {
  "use server"
  const email = String(formData.get("email") ?? "").trim()
  if (!email) return
  const supabase = await createSupabaseServerClient()
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const next = (await searchParams).next
  if (user) {
    redirect(next || "/")
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

