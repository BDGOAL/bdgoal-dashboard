import { redirect } from "next/navigation"

import { OverviewView } from "@/components/dashboard/overview-view"
import { getDashboardContentItems } from "@/lib/content/store"

function isAuthLikeErrorMessage(msg: string): boolean {
  const v = msg.toLowerCase()
  return (
    v.includes("auth") ||
    v.includes("session") ||
    v.includes("jwt") ||
    v.includes("token") ||
    v.includes("access_denied") ||
    v.includes("otp_expired") ||
    v.includes("invalid or has expired") ||
    v.includes("未登入")
  )
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string; error_description?: string }>
}) {
  const params = await searchParams
  const queryError = params.error ?? params.error_code ?? params.error_description
  if (queryError) {
    redirect(
      `/login?error=${encodeURIComponent("重設連結已失效，請重新寄送重設密碼連結。")}`,
    )
  }

  let items
  try {
    items = await getDashboardContentItems()
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取首頁失敗。"
    console.error("[dashboard/page] load failed", { message })
    if (isAuthLikeErrorMessage(message)) {
      redirect(
        `/login?error=${encodeURIComponent("登入狀態已失效，請重新登入或重新寄送重設密碼連結。")}`,
      )
    }
    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border p-5">
          <h1 className="text-lg font-semibold">無法載入 Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            目前無法讀取首頁資料，請稍後重試。
          </p>
        </div>
      </main>
    )
  }

  return <OverviewView items={items} />
}
