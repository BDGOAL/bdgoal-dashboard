"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWorkspaceScope } from "@/components/dashboard/workspace-scope-context"
import { PendingButtonLabel } from "@/components/dashboard/async-feedback"

function suggestSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  return base.length ? base.slice(0, 64) : ""
}

export function CreateClientDialog() {
  const { setScope } = useWorkspaceScope()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (slugTouched) return
    const s = suggestSlug(name)
    setSlug(s)
  }, [name, slugTouched])

  function reset() {
    setName("")
    setSlug("")
    setSlugTouched(false)
    setError(null)
  }

  async function submit() {
    if (pending) return
    const n = name.trim()
    const sl = slug.trim().toLowerCase()
    if (!n) {
      setError("請填寫客戶名稱。")
      return
    }
    if (!sl) {
      setError("請填寫 slug。")
      return
    }
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, slug: sl }),
      })
      const json = (await res.json()) as {
        ok?: boolean
        client?: { id: string; name: string; slug: string }
        error?: string
      }
      if (!res.ok) {
        setError(json.error ?? "建立失敗。")
        return
      }
      if (!json.client?.id) {
        setError("回應格式異常。")
        return
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("bdgoal:clients-updated", {
            detail: { client: { id: json.client.id, name: json.client.name } },
          }),
        )
      }
      setScope({ mode: "client", clientId: json.client.id })
      reset()
      setOpen(false)
    } catch {
      setError("網路錯誤，請稍後再試。")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="size-3.5" aria-hidden />
        新增客戶
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (pending) return
          if (!v) reset()
          setOpen(v)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>新增客戶</DialogTitle>
            <DialogDescription className="text-xs">
              建立後會自動將你加入為該客戶的管理員，並切換範圍至此客戶。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="new-client-name" className="text-xs">
                客戶名稱
              </Label>
              <Input
                id="new-client-name"
                value={name}
                disabled={pending}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Aurora Studio"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-client-slug" className="text-xs">
                Slug（網址用，唯一）
              </Label>
              <Input
                id="new-client-slug"
                value={slug}
                disabled={pending}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value.toLowerCase())
                }}
                placeholder="aurora-studio"
                className="h-9"
              />
              <p className="text-muted-foreground text-[11px]">
                僅小寫英數與連字號；可依名稱自動帶入，亦可手動修改。
              </p>
            </div>
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={() => void submit()}>
              <PendingButtonLabel idle="建立" pending={pending ? "建立中…" : false} />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
