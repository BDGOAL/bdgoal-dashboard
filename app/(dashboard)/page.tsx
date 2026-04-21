import { redirect } from "next/navigation"

import { OverviewView } from "@/components/dashboard/overview-view"
import { getDashboardContentItems } from "@/lib/content/store"
import {
  createSupabaseServerClient,
  getMissingSupabasePublicEnv,
} from "@/lib/supabase/server"

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

type HomeLoadFailureKind =
  | "missing_env"
  | "missing_auth_user"
  | "missing_profile"
  | "missing_membership_or_client_access"
  | "rls_or_query_error"
  | "unknown"

async function diagnoseHomepageLoadFailure(): Promise<{
  kind: HomeLoadFailureKind
  detail: string
}> {
  const missingEnv = getMissingSupabasePublicEnv()
  if (missingEnv.length > 0) {
    return {
      kind: "missing_env",
      detail: `缺少環境變數：${missingEnv.join(", ")}`,
    }
  }

  try {
    const supabase = await createSupabaseServerClient()
    console.info("[dashboard/home] diagnose:start")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError) {
      return {
        kind: "missing_auth_user",
        detail: `auth.getUser 失敗：${userError.message}`,
      }
    }
    if (!user) {
      return {
        kind: "missing_auth_user",
        detail: "auth.getUser 無使用者（session 缺失或過期）",
      }
    }
    console.info("[dashboard/home] diagnose:user", { userId: user.id })

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle()
    if (profileError) {
      return {
        kind: "rls_or_query_error",
        detail: `profiles 查詢失敗：${profileError.message}`,
      }
    }
    if (!profile) {
      return {
        kind: "missing_profile",
        detail: "profiles 找不到對應使用者資料",
      }
    }
    console.info("[dashboard/home] diagnose:profile", { role: profile.role ?? null })

    const { data: memberships, error: membershipError } = await supabase
      .from("client_memberships")
      .select("client_id, role")
      .eq("user_id", user.id)
    if (membershipError) {
      return {
        kind: "rls_or_query_error",
        detail: `client_memberships 查詢失敗：${membershipError.message}`,
      }
    }
    if (!memberships?.length && profile.role !== "admin") {
      return {
        kind: "missing_membership_or_client_access",
        detail: "非 admin 且無 client_memberships，可見客戶為 0",
      }
    }
    console.info("[dashboard/home] diagnose:membership", {
      count: memberships?.length ?? 0,
    })

    const { error: contentProbeError } = await supabase
      .from("content_items")
      .select("id")
      .limit(1)
    if (contentProbeError) {
      return {
        kind: "rls_or_query_error",
        detail: `content_items 探測查詢失敗：${contentProbeError.message}`,
      }
    }

    return {
      kind: "unknown",
      detail: "診斷流程未找到明確失敗點，請對照上方日誌與 getDashboardContentItems 錯誤。",
    }
  } catch (error) {
    return {
      kind: "unknown",
      detail: error instanceof Error ? error.message : "未知例外",
    }
  }
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
    console.info("[dashboard/home] load:start")
    items = await getDashboardContentItems()
    console.info("[dashboard/home] load:success", { count: items.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取首頁失敗。"
    console.error("[dashboard/page] load failed", { message })
    if (isAuthLikeErrorMessage(message)) {
      redirect(
        `/login?error=${encodeURIComponent("登入狀態已失效，請重新登入或重新寄送重設密碼連結。")}`,
      )
    }
    const diagnosis = await diagnoseHomepageLoadFailure()
    console.error("[dashboard/home] diagnose:result", diagnosis)
    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border p-5">
          <h1 className="text-lg font-semibold">無法載入 Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            目前無法讀取首頁資料，請稍後重試。
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            原因：{diagnosis.kind} · {diagnosis.detail}
          </p>
        </div>
      </main>
    )
  }

  return <OverviewView items={items} />
}
