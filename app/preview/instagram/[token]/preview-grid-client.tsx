"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type PreviewItem = {
  id: string
  title: string
  caption: string
  thumbnail: string | null
  plannedPublishDate?: string | null
  scheduledAt?: string | null
  status: string
  attachments?: Array<{ url: string }>
}

function dateLabel(item: PreviewItem): string {
  const iso = item.scheduledAt ?? item.plannedPublishDate
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return "—"
  }
}

export function PreviewGridClient({ items }: { items: PreviewItem[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null)
  const openItem = React.useMemo(
    () => (openId ? items.find((i) => i.id === openId) ?? null : null),
    [items, openId],
  )
  const gallery = (openItem?.attachments ?? []).filter((a) => a.url?.trim())
  const hero =
    gallery[0]?.url?.trim() ??
    openItem?.thumbnail?.trim() ??
    ""

  return (
    <>
      <section className="mx-auto w-full max-w-[520px]">
        <div className="grid grid-cols-3 gap-0.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="group relative aspect-[5/6] overflow-hidden rounded-sm bg-[#0a0a0a] ring-1 ring-white/8 text-left"
              onClick={() => setOpenId(item.id)}
              aria-label={`預覽貼文 ${item.title || item.caption || item.id}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.attachments?.[0]?.url ?? item.thumbnail ?? ""}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-1.5 pb-1 pt-4">
                <p className="line-clamp-2 text-[10px] leading-tight text-white/90">
                  {item.caption || item.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <Dialog
        open={Boolean(openItem)}
        onOpenChange={(next) => {
          if (!next) setOpenId(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-lg">
          {openItem ? (
            <div className="space-y-0">
              <div className="bg-muted relative aspect-[5/6] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero} alt="" className="absolute inset-0 size-full object-cover" />
              </div>
              <DialogHeader className="px-4 py-3">
                <DialogTitle className="text-sm font-semibold leading-snug">
                  {openItem.title || "Instagram Post"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 px-4 pb-4 text-xs">
                <p className="text-muted-foreground">
                  日期：{dateLabel(openItem)} · 狀態：{openItem.status}
                </p>
                <p
                  className={cn(
                    "text-foreground whitespace-pre-wrap leading-relaxed",
                    !openItem.caption && "text-muted-foreground",
                  )}
                >
                  {openItem.caption || "（無文案）"}
                </p>
                {gallery.length > 1 ? (
                  <div className="grid grid-cols-5 gap-1">
                    {gallery.map((g, idx) => (
                      <div key={`${g.url}-${idx}`} className="aspect-square overflow-hidden rounded-sm border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt="" className="size-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
