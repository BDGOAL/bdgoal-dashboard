import { NextResponse } from "next/server"

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

export async function POST(req: Request) {
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

  const signature = req.headers.get("x-hook-signature")
  if (!signature) {
    console.error("[asana/webhook] missing signature")
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
    console.error("[asana/webhook] invalid signature")
    return new NextResponse("invalid signature", { status: 401 })
  }

  let body: AsanaWebhookPayload
  try {
    body = rawBody ? (JSON.parse(rawBody) as AsanaWebhookPayload) : {}
  } catch {
    console.error("[asana/webhook] invalid json")
    return new NextResponse("invalid payload", { status: 400 })
  }

  const events = body.events ?? []
  if (events.length === 0) {
    return new NextResponse("ok", { status: 200 })
  }

  try {
    await handleAsanaWebhookEvents(events)
    return new NextResponse("ok", { status: 200 })
  } catch (error) {
    console.error("[asana/webhook] event processing error", {
      message: error instanceof Error ? error.message : String(error),
    })
    return new NextResponse("processing failed", { status: 500 })
  }
}

