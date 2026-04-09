export type AsanaReadyItem = {
  source: "asana"
  asanaTaskId: string
  title: string
  client: string | null
  platform: string | null
  contentType: string | null
  position: string | null
  workflowStage: string | null
  plannedPublishDate: string | null
  finalCaptionStatus: string | null
  visualVideoStatus: string | null
  dashboardSyncStatus: string | null
  finalCaption: string | null
  tags: string[]
  attachments: Array<{
    name: string
    downloadUrl?: string | null
    viewUrl?: string | null
  }>
}

export type AsanaPrefillItem = {
  title: string
  client: string | null
  platform: string | null
  contentType: string | null
  position: string | null
  plannedPublishDate: string | null
  finalCaption: string | null
  attachments: Array<{
    name: string
    downloadUrl?: string | null
    viewUrl?: string | null
  }>
}

type AsanaCustomField = {
  name?: string | null
  text_value?: string | null
  display_value?: string | null
  enum_value?: { name?: string | null } | null
  date_value?: { date?: string | null } | null
}

export type AsanaTaskLite = {
  gid: string
  name: string
  parent?: { gid: string } | null
  tags?: Array<{ name?: string | null }> | null
  custom_fields?: AsanaCustomField[] | null
}

export type AsanaAttachmentLite = {
  name?: string | null
  download_url?: string | null
  view_url?: string | null
  permanent_url?: string | null
}

export const ASANA_FIELD_NAMES = [
  "Client",
  "Platform",
  "Content Type",
  "Position",
  "Workflow Stage",
  "Planned Publish Date",
  "Final Caption Status",
  "Visual/Video Status",
  "Dashboard Sync Status",
  "Final Caption",
] as const

function toNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length ? t : null
}

function readCustomFieldValue(field?: AsanaCustomField | null): string | null {
  if (!field) return null

  const enumName = toNullableString(field.enum_value?.name)
  if (enumName) return enumName

  const textValue = toNullableString(field.text_value)
  if (textValue) return textValue

  const dateValue = toNullableString(field.date_value?.date)
  if (dateValue) return dateValue

  return toNullableString(field.display_value)
}

export function getCustomFieldByName(
  fields: AsanaCustomField[] | null | undefined,
  fieldName: string,
): AsanaCustomField | null {
  if (!fields?.length) return null
  return fields.find((f) => f?.name === fieldName) ?? null
}

export function normalizeAsanaTaskToReadyItem(
  task: AsanaTaskLite,
  attachments: AsanaAttachmentLite[],
): AsanaReadyItem {
  const fields = task.custom_fields ?? []

  const client = readCustomFieldValue(getCustomFieldByName(fields, "Client"))
  const platform = readCustomFieldValue(getCustomFieldByName(fields, "Platform"))
  const contentType = readCustomFieldValue(
    getCustomFieldByName(fields, "Content Type"),
  )
  const position = readCustomFieldValue(getCustomFieldByName(fields, "Position"))
  const workflowStage = readCustomFieldValue(
    getCustomFieldByName(fields, "Workflow Stage"),
  )
  const plannedPublishDate = readCustomFieldValue(
    getCustomFieldByName(fields, "Planned Publish Date"),
  )
  const finalCaptionStatus = readCustomFieldValue(
    getCustomFieldByName(fields, "Final Caption Status"),
  )
  const visualVideoStatus = readCustomFieldValue(
    getCustomFieldByName(fields, "Visual/Video Status"),
  )
  const dashboardSyncStatus = readCustomFieldValue(
    getCustomFieldByName(fields, "Dashboard Sync Status"),
  )
  const finalCaption = readCustomFieldValue(
    getCustomFieldByName(fields, "Final Caption"),
  )

  return {
    source: "asana",
    asanaTaskId: task.gid,
    title: task.name ?? "",
    client,
    platform,
    contentType,
    position,
    workflowStage,
    plannedPublishDate,
    finalCaptionStatus,
    visualVideoStatus,
    dashboardSyncStatus,
    finalCaption,
    tags: (task.tags ?? [])
      .map((t) => toNullableString(t?.name))
      .filter((v): v is string => Boolean(v)),
    attachments: attachments
      .map((a) => ({
        name: toNullableString(a.name) ?? "Unnamed attachment",
        downloadUrl: toNullableString(a.download_url),
        viewUrl: toNullableString(a.view_url ?? a.permanent_url),
      }))
      .filter((a) => Boolean(a.name)),
  }
}

function equalsExactWord(value: string | null, expected: string): boolean {
  return value?.trim().toLowerCase() === expected.trim().toLowerCase()
}

export function isAsanaReadyToSync(item: AsanaReadyItem): boolean {
  const hasRequiredBaseFields =
    Boolean(item.client) &&
    Boolean(item.platform) &&
    Boolean(item.contentType) &&
    Boolean(item.finalCaption)

  const hasMainTaskAttachment = item.attachments.length > 0

  return (
    hasRequiredBaseFields &&
    hasMainTaskAttachment &&
    equalsExactWord(item.workflowStage, "Ready to Sync") &&
    equalsExactWord(item.dashboardSyncStatus, "Ready to Sync") &&
    equalsExactWord(item.finalCaptionStatus, "Final") &&
    equalsExactWord(item.visualVideoStatus, "Final")
  )
}

export function toSchedulePrefill(item: AsanaReadyItem): AsanaPrefillItem {
  return {
    title: item.title,
    client: item.client,
    platform: item.platform,
    contentType: item.contentType,
    position: item.position,
    plannedPublishDate: item.plannedPublishDate,
    finalCaption: item.finalCaption,
    attachments: item.attachments,
  }
}
