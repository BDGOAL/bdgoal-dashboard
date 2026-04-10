import {
  isAsanaReadyToSync,
  normalizeAsanaTaskToReadyItem,
  type AsanaReadyItem,
  type AsanaTaskLite,
} from "@/lib/integrations/asana-normalize"

const ASANA_BASE_URL = "https://app.asana.com/api/1.0"

const READY_QUEUE_CACHE_TTL_MS = 60_000

type AsanaApiResponse<T> = {
  data: T
}

type AsanaPagedResponse<T> = AsanaApiResponse<T> & {
  next_page?: { offset?: string | null; uri?: string | null } | null
}

let readyQueueCache: {
  projectGid: string
  fetchedAt: number
  items: AsanaReadyItem[]
} | null = null

function getAsanaConfig() {
  const pat =
    process.env.ASANA_ACCESS_TOKEN?.trim() ??
    process.env.ASANA_PAT?.trim()
  const projectGid = process.env.ASANA_PROJECT_GID?.trim()
  return { pat, projectGid }
}

function taskOptFields(): string {
  return [
    "gid",
    "name",
    "completed",
    "due_on",
    "notes",
    "parent.gid",
    "tags.name",
    "custom_fields.name",
    "custom_fields.text_value",
    "custom_fields.display_value",
    "custom_fields.enum_value.name",
    "custom_fields.date_value.date",
    "attachments.name",
    "attachments.download_url",
    "attachments.view_url",
    "attachments.permanent_url",
  ].join(",")
}

async function asanaFetch<T>(path: string): Promise<T> {
  const { pat } = getAsanaConfig()
  if (!pat) {
    throw new Error(
      "ASANA_ACCESS_TOKEN/ASANA_PAT \u672a\u8a2d\u5b9a\uff0c\u7121\u6cd5\u8b80\u53d6 Asana\u3002",
    )
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
    throw new Error(`Asana API \u932f\u8aa4 (${res.status})\uff1a${text}`)
  }

  const json = (await res.json()) as AsanaApiResponse<T>
  return json.data
}

async function asanaFetchPaged<T>(path: string): Promise<AsanaPagedResponse<T>> {
  const { pat } = getAsanaConfig()
  if (!pat) {
    throw new Error(
      "ASANA_ACCESS_TOKEN/ASANA_PAT \u672a\u8a2d\u5b9a\uff0c\u7121\u6cd5\u8b80\u53d6 Asana\u3002",
    )
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
    throw new Error(`Asana API \u932f\u8aa4 (${res.status})\uff1a${text}`)
  }

  return (await res.json()) as AsanaPagedResponse<T>
}

/**
 * All project tasks in one field shape: custom fields + attachments embedded (no per-task attachment calls).
 * Paginates until next_page is empty.
 */
async function fetchAllProjectTasks(projectGid: string): Promise<AsanaTaskLite[]> {
  const optFields = taskOptFields()
  const collected: AsanaTaskLite[] = []
  let offset: string | undefined

  for (;;) {
    let path = `/projects/${projectGid}/tasks?limit=100&opt_fields=${encodeURIComponent(optFields)}`
    if (offset) {
      path += `&offset=${encodeURIComponent(offset)}`
    }

    const page = await asanaFetchPaged<AsanaTaskLite[]>(path)
    collected.push(...(page.data ?? []))

    const nextOffset = page.next_page?.offset
    if (!nextOffset) break
    offset = nextOffset
  }

  return collected
}

async function fetchTask(taskGid: string): Promise<AsanaTaskLite> {
  const optFields = taskOptFields()
  return asanaFetch<AsanaTaskLite>(
    `/tasks/${taskGid}?opt_fields=${encodeURIComponent(optFields)}`,
  )
}

export async function fetchAsanaReadyQueue(): Promise<AsanaReadyItem[]> {
  const { projectGid } = getAsanaConfig()
  if (!projectGid) {
    throw new Error(
      "ASANA_PROJECT_GID \u672a\u8a2d\u5b9a\uff0c\u7121\u6cd5\u8b80\u53d6 Asana Ready Queue\u3002",
    )
  }

  const now = Date.now()
  if (
    readyQueueCache &&
    readyQueueCache.projectGid === projectGid &&
    now - readyQueueCache.fetchedAt < READY_QUEUE_CACHE_TTL_MS
  ) {
    return readyQueueCache.items
  }

  const tasks = await fetchAllProjectTasks(projectGid)

  const mainTasks = tasks.filter((t) => !t.parent?.gid && !t.completed)

  const normalized = mainTasks.map((task) =>
    normalizeAsanaTaskToReadyItem(task, task.attachments ?? []),
  )

  const items = normalized.filter(isAsanaReadyToSync)
  readyQueueCache = { projectGid, fetchedAt: now, items }
  return items
}

export async function fetchAsanaReadyItemByTaskId(
  taskId: string,
): Promise<AsanaReadyItem | null> {
  const task = await fetchTask(taskId)
  if (task.parent?.gid) return null
  const normalized = normalizeAsanaTaskToReadyItem(task, task.attachments ?? [])
  if (!isAsanaReadyToSync(normalized)) return null
  return normalized
}
