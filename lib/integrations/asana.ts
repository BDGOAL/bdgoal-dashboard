import {
  isAsanaReadyToSync,
  normalizeAsanaTaskToReadyItem,
  type AsanaAttachmentLite,
  type AsanaReadyItem,
  type AsanaTaskLite,
} from "@/lib/integrations/asana-normalize"

const ASANA_BASE_URL = "https://app.asana.com/api/1.0"

type AsanaApiResponse<T> = {
  data: T
}

function getAsanaConfig() {
  const pat =
    process.env.ASANA_ACCESS_TOKEN?.trim() ??
    process.env.ASANA_PAT?.trim()
  const projectGid = process.env.ASANA_PROJECT_GID?.trim()
  return { pat, projectGid }
}

async function asanaFetch<T>(path: string): Promise<T> {
  const { pat } = getAsanaConfig()
  if (!pat) {
    throw new Error("ASANA_ACCESS_TOKEN/ASANA_PAT 未設定，無法讀取 Asana。")
  }

  const res = await fetch(`${ASANA_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Asana API 錯誤 (${res.status})：${text}`)
  }

  const json = (await res.json()) as AsanaApiResponse<T>
  return json.data
}

async function fetchProjectTasks(projectGid: string): Promise<AsanaTaskLite[]> {
  const optFields = [
    "gid",
    "name",
    "parent.gid",
    "tags.name",
    "custom_fields.name",
    "custom_fields.text_value",
    "custom_fields.display_value",
    "custom_fields.enum_value.name",
    "custom_fields.date_value.date",
  ].join(",")

  return asanaFetch<AsanaTaskLite[]>(
    `/projects/${projectGid}/tasks?limit=100&opt_fields=${encodeURIComponent(optFields)}`,
  )
}

async function fetchTaskAttachments(taskGid: string): Promise<AsanaAttachmentLite[]> {
  const optFields = ["name", "download_url", "view_url", "permanent_url"].join(",")
  return asanaFetch<AsanaAttachmentLite[]>(
    `/tasks/${taskGid}/attachments?limit=100&opt_fields=${encodeURIComponent(optFields)}`,
  )
}

async function fetchTask(taskGid: string): Promise<AsanaTaskLite> {
  const optFields = [
    "gid",
    "name",
    "parent.gid",
    "tags.name",
    "custom_fields.name",
    "custom_fields.text_value",
    "custom_fields.display_value",
    "custom_fields.enum_value.name",
    "custom_fields.date_value.date",
  ].join(",")

  return asanaFetch<AsanaTaskLite>(
    `/tasks/${taskGid}?opt_fields=${encodeURIComponent(optFields)}`,
  )
}

export async function fetchAsanaReadyQueue(): Promise<AsanaReadyItem[]> {
  const { projectGid } = getAsanaConfig()
  if (!projectGid) {
    throw new Error("ASANA_PROJECT_GID 未設定，無法讀取 Asana Ready Queue。")
  }

  const tasks = await fetchProjectTasks(projectGid)

  const mainTasks = tasks.filter((t) => !t.parent?.gid)

  const normalized = await Promise.all(
    mainTasks.map(async (task) => {
      const attachments = await fetchTaskAttachments(task.gid)
      return normalizeAsanaTaskToReadyItem(task, attachments)
    }),
  )

  return normalized.filter(isAsanaReadyToSync)
}

export async function fetchAsanaReadyItemByTaskId(
  taskId: string,
): Promise<AsanaReadyItem | null> {
  const task = await fetchTask(taskId)
  if (task.parent?.gid) return null
  const attachments = await fetchTaskAttachments(task.gid)
  const normalized = normalizeAsanaTaskToReadyItem(task, attachments)
  if (!isAsanaReadyToSync(normalized)) return null
  return normalized
}
