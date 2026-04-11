"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { ContentCalendar } from "@/components/calendar/content-calendar"
import { ContentItemEditDialog } from "@/components/instagram/content-item-edit-dialog"
import { fetchDashboardContentItems } from "@/lib/dashboard/fetch-dashboard-content-items-client"
import type { ContentItem } from "@/lib/types/dashboard"

export function CalendarPageClient({ items }: { items: ContentItem[] }) {
  const router = useRouter()
  const [localItems, setLocalItems] = React.useState(items)
  const [editItem, setEditItem] = React.useState<ContentItem | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [listSyncing, setListSyncing] = React.useState(false)

  React.useEffect(() => {
    setLocalItems(items)
  }, [items])

  return (
    <>
      <ContentCalendar
        items={localItems}
        isListRefreshing={listSyncing}
        onRequestEditItem={(item) => {
          setEditItem(item)
          setEditOpen(true)
        }}
      />
      <ContentItemEditDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={async () => {
          setListSyncing(true)
          try {
            const next = await fetchDashboardContentItems()
            if (next) {
              setLocalItems(next)
              return
            }
            router.refresh()
            throw new Error(
              "\u7121\u6cd5\u8207\u4f3a\u670d\u5668\u540c\u6b65\u5217\u8868\uff0c\u5df2\u6539\u70ba\u91cd\u65b0\u6574\u7406\u6b64\u9801\u8cc7\u6599\u3002",
            )
          } finally {
            setListSyncing(false)
          }
        }}
      />
    </>
  )
}
