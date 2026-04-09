import { NextResponse } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

function toErrorHtml(title: string, detail: string) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b0d12;color:#e6e6e6;margin:0;padding:24px}main{max-width:560px;margin:56px auto;border:1px solid #2a2f3a;border-radius:12px;padding:20px;background:#11151d}h1{margin:0 0 8px;font-size:20px}p{margin:0;color:#aab2bf;line-height:1.6}a{color:#8ab4ff}</style></head><body><main><h1>${title}</h1><p>${detail}</p><p style="margin-top:14px"><a href="/login">回登入頁</a></p></main></body></html>`
}

function resolveRedirectPath(reqUrl: URL): string {
  const next = reqUrl.searchParams.get("next")
  if (next && next.startsWith("/")) return next

  // Supabase may include redirect_to absolute URL. Keep same-origin path only.
  const redirectTo = reqUrl.searchParams.get("redirect_to")
  if (redirectTo) {
    try {
      const parsed = new URL(redirectTo, reqUrl.origin)
      if (parsed.origin === reqUrl.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
      }
    } catch {
      // ignore invalid URL, fallback below
    }
  }
  return "/"
}

export async function GET(req: Request) {
  const reqUrl = new URL(req.url)
  const code = reqUrl.searchParams.get("code")
  const redirectPath = resolveRedirectPath(reqUrl)

  if (!code) {
    return new NextResponse(
      toErrorHtml(
        "登入連結無效",
        "缺少授權 code。請重新從登入頁寄送 magic link。",
      ),
      {
        status: 400,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    )
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      return new NextResponse(
        toErrorHtml(
          "登入失敗",
          `無法完成登入流程：${exchangeError.message}`,
        ),
        {
          status: 400,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      )
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError) {
      return new NextResponse(
        toErrorHtml("登入失敗", `無法讀取使用者資訊：${userError.message}`),
        {
          status: 400,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      )
    }

    if (user?.id && user.email) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
      })
      if (profileError) {
        return new NextResponse(
          toErrorHtml("登入成功但初始化失敗", `Profile 建立失敗：${profileError.message}`),
          {
            status: 500,
            headers: { "content-type": "text/html; charset=utf-8" },
          },
        )
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Callback 流程發生未知錯誤。"
    return new NextResponse(
      toErrorHtml("登入設定錯誤", message),
      {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    )
  }

  return NextResponse.redirect(new URL(redirectPath, reqUrl.origin))
}

