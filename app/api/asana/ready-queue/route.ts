import { NextResponse } from "next/server"

import { fetchAsanaReadyQueue } from "@/lib/integrations/asana"
import { listStoredAsanaRefs } from "@/lib/content/store"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [items, refs] = await Promise.all([
      fetchAsanaReadyQueue(),
      listStoredAsanaRefs(),
    ])
    return NextResponse.json({
      source: "asana",
      count: items.length,
      items,
      importedMap: refs,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取 Asana Ready Queue 失敗。"
    return NextResponse.json(
      {
        source: "asana",
        count: 0,
        items: [],
        importedMap: {},
        error: message,
      },
      { status: 500 },
    )
  }
}
