import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const INTERNAL_PREFIXES = ["/", "/instagram", "/analytics", "/calendar", "/competitors", "/news", "/ready-queue"]
const INTERNAL_API_PREFIXES = [
  "/api/content",
  "/api/asana/ready-queue",
  "/api/preview-links",
]

function isInternalPath(pathname: string) {
  if (pathname === "/login" || pathname.startsWith("/auth/")) return false
  if (pathname.startsWith("/client-preview/")) return false
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") return false
  return INTERNAL_PREFIXES.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)))
}

function isInternalApi(pathname: string) {
  return INTERNAL_API_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return res

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = req.nextUrl.pathname
  if (!user && isInternalPath(pathname)) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (!user && isInternalApi(pathname)) {
    return NextResponse.json({ error: "未登入。" }, { status: 401 })
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

