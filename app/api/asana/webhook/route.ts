import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({ status: "asana webhook endpoint alive" })
}

type AsanaWebhookPayload = {
  events?: Array<{
    action?: string
    resource?: { gid?: string; resource_type?: string }
    parent?: { gid?: string; resource_type?: string }
  }>
}

export async function POST(req: NextRequest) {
  const hookSecret = req.headers.get("x-hook-secret")
  const rawBody = await req.text()

  // Handshake: echo X-Hook-Secret exactly once during webhook setup.
  if (hookSecret) {
    let parsed: AsanaWebhookPayload | null = null
    if (rawBody.trim().length > 0) {
      try {
        parsed = JSON.parse(rawBody) as AsanaWebhookPayload
      } catch {
        // ignore parse errors for handshake; Asana may send empty payload
      }
    }
    if (!parsed?.events?.length) {
      console.info("[asana/webhook] handshake")
      return new NextResponse("", {
        status: 200,
        headers: { "x-hook-secret": hookSecret },
      })
    }
  }

  // 暫時唔做 signature 驗證 / 寫入 DB，只係 log 一 log
  console.log("[asana/webhook] raw body:", rawBody)

  return new NextResponse("ok", { status: 200 })
}