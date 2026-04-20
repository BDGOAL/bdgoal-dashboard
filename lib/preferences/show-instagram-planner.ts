"use client"

import * as React from "react"

const STORAGE_KEY = "bdgoal:showInstagramPlanner"

export function readShowInstagramPlanner(): boolean {
  if (typeof window === "undefined") return true
  const v = window.localStorage.getItem(STORAGE_KEY)
  if (v === null) return true
  return v === "1" || v === "true"
}

export function writeShowInstagramPlanner(show: boolean): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, show ? "1" : "0")
  window.dispatchEvent(new CustomEvent("bdgoal:show-instagram-planner-changed"))
}

/** 側邊欄是否顯示 Instagram 項目（預設顯示；存於 localStorage） */
export function useShowInstagramPlanner(): readonly [boolean, (next: boolean) => void] {
  const [show, setShow] = React.useState(true)

  React.useEffect(() => {
    setShow(readShowInstagramPlanner())
    const onChange = () => setShow(readShowInstagramPlanner())
    window.addEventListener("bdgoal:show-instagram-planner-changed", onChange)
    return () => window.removeEventListener("bdgoal:show-instagram-planner-changed", onChange)
  }, [])

  const set = React.useCallback((next: boolean) => {
    writeShowInstagramPlanner(next)
    setShow(next)
  }, [])

  return [show, set] as const
}
