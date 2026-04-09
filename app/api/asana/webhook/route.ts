import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

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

function verifyAsanaSignature(opts: {
  rawBody: string
  signatureHeader: string
  secret: string
}) {
  const { rawBody, signatureHeader, secret } = opts

  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")

  const sigBuf = Buffer.from(signatureHeader, "utf8")
  const compBuf = Buffer.from(computed, "utf8")

  if (sigBuf.length !== compBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, compBuf)
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
      console.info("[asana/webhook] handshake")
      return new NextResponse("", {
        status: 200,
        headers: { "x-hook-secret": hookSecret },
      })
    }
  }

  // 2) Signature 驗證（所有正常 webhook event 都會有）
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

  const isValid = verifyAsanaSignature({
    rawBody,
    signatureHeader: signature,
    secret,
  })

  if (!isValid) {
    console.error("[asana/webhook] invalid signature")
    return new NextResponse("invalid signature", { status: 401 })
  }

  // 3) 驗證通過，先處理 payload
  let body: AsanaWebhookPayload
  try {
    body = rawBody ? (JSON.parse(rawBody) as AsanaWebhookPayload) : {}
  } catch {
    console.error("[asana/webhook] invalid json")
    return new NextResponse("invalid payload", { status: 400 })
  }
  console.log("[asana/webhook] raw body:", rawBody)

  const events = body.events ?? []
  if (events.length === 0) {
    return new NextResponse("ok", { status: 200 })
  }

  console.log("[asana/webhook] verified events:", JSON.stringify(events))

  // 暫時只係 log，之後你可以改為呼叫 handleAsanaWebhookEvents(events)
  return new NextResponse("ok", { status: 200 })
}