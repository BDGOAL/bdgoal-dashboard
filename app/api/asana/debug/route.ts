import { NextResponse } from "next/server"
import { fetchAllNormalizedTasks } from "@/lib/integrations/asana"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const items = await fetchAllNormalizedTasks()
    return NextResponse.json({ count: items.length, items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
