export type ContentWorkflowStatus = "planning" | "scheduled" | "published"

export function applyStatusChangeRule(
  nextStatus: ContentWorkflowStatus,
  currentScheduledAt: string,
): { status: ContentWorkflowStatus; scheduledAt: string } {
  if (nextStatus === "published") {
    return { status: "published", scheduledAt: "" }
  }
  return { status: nextStatus, scheduledAt: currentScheduledAt }
}

export function applyScheduledAtChangeRule(
  nextScheduledAt: string,
  currentStatus: ContentWorkflowStatus,
): { status: ContentWorkflowStatus; scheduledAt: string } {
  if (nextScheduledAt && currentStatus === "planning") {
    return { status: "scheduled", scheduledAt: nextScheduledAt }
  }
  if (!nextScheduledAt && currentStatus === "scheduled") {
    return { status: "planning", scheduledAt: "" }
  }
  return { status: currentStatus, scheduledAt: nextScheduledAt }
}

export function validateStatusAndScheduledAt(
  status: ContentWorkflowStatus,
  scheduledAt: string,
): string | null {
  if (status === "scheduled" && !scheduledAt) {
    return "狀態為 scheduled 時，請填寫排程時間。"
  }
  return null
}

export function toPlannedPublishDateIso(scheduledAt: string): string | null {
  if (!scheduledAt) return null
  const d = new Date(scheduledAt)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
