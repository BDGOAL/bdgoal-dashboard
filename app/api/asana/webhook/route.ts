import { NextRequest, NextResponse } from "next/server"

import {
  handleAsanaWebhookEvents,
  verifyAsanaWebhookSignature,
} from "@/lib/integrations/asana-webhook-handler"

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

  // 1) Handshake: echo X-Hook-Secret back when沒有 events
  if (hookSecret) {
    let parsed: AsanaWebhookPayload | null = null
    if (rawBody.trim().length > 0) {
      try {
        parsed = JSON.parse(rawBody) as AsanaWebhookPayload
      } catch {
        // ignore parse errors for handshake
      }
    }
    if (!parsed?.events?.length) {
      console.info("[asana/webhook] handshake accepted")
      return new NextResponse("", {
        status: 200,
        headers: { "x-hook-secret": hookSecret },
      })
    }
  }

  // 2) Signature 驗證（所有正常 webhook event 都會有）
  const signature = req.headers.get("x-hook-signature")
  if (!signature) {
    console.error("[asana/webhook] missing x-hook-signature")
    return new NextResponse("missing signature", { status: 400 })
  }

  const secret = process.env.ASANA_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error("[asana/webhook] missing ASANA_WEBHOOK_SECRET")
    return new NextResponse("webhook not configured", { status: 500 })
  }

  const isValid = verifyAsanaWebhookSignature({
    rawBody,
    signatureHeader: signature,
    secret,
  })

  if (!isValid) {
    console.error("[asana/webhook] signature verification failed")
    return new NextResponse("invalid signature", { status: 401 })
  }

  // 3) 驗證通過，處理 payload（簽章以 rawBody 計算，須與此處 parse 來源一致）
  let body: AsanaWebhookPayload
  try {
    body = rawBody.trim().length > 0 ? (JSON.parse(rawBody) as AsanaWebhookPayload) : {}
  } catch {
    console.error("[asana/webhook] invalid json after verified signature")
    return new NextResponse("invalid payload", { status: 400 })
  }

  const events = body.events ?? []
  if (events.length === 0) {
    return new NextResponse("ok", { status: 200 })
  }

  console.info("[asana/webhook] verified; processing events", { count: events.length })

  try {
    await handleAsanaWebhookEvents(events)
    console.info("[asana/webhook] handler completed", { count: events.length })
  } catch (error) {
    console.error("[asana/webhook] handler failed", {
      count: events.length,
      message: error instanceof Error ? error.message : String(error),
    })
    return new NextResponse("handler error", { status: 500 })
  }

  return new NextResponse("ok", { status: 200 })
}
