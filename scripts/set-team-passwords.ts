import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEFAULT_PASSWORD = "BDGOAL123"

const TARGET_EMAILS = [
  "kelvin.lo@bdgoal.net",
  "louis@bdgoal.net",
  "vivien@bdgoal.net",
] as const

function assertEnv() {
  if (!SUPABASE_URL) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY")
  }
}

async function findUserByEmail(
  adminClient: SupabaseClient,
  email: string,
) {
  const normalized = email.toLowerCase()
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw new Error(`listUsers failed on page ${page}: ${error.message}`)
    }

    const users = data.users ?? []
    const matched = users.find((user) => user.email?.toLowerCase() === normalized)
    if (matched) return matched
    if (users.length < perPage) return null
    page += 1
  }
}

async function main() {
  assertEnv()

  const adminClient = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`[start] set default password for ${TARGET_EMAILS.length} users`)

  for (const email of TARGET_EMAILS) {
    try {
      const user = await findUserByEmail(adminClient, email)
      if (!user) {
        console.log(`[missing] ${email} (user not found)`)
        continue
      }

      const { error } = await adminClient.auth.admin.updateUserById(user.id, {
        password: DEFAULT_PASSWORD,
      })

      if (error) {
        console.error(`[failed] ${email} (${user.id}): ${error.message}`)
        continue
      }

      console.log(`[ok] ${email} (${user.id}) password updated`)
    } catch (error) {
      console.error(
        `[failed] ${email}: ${error instanceof Error ? error.message : "unknown error"}`,
      )
    }
  }

  console.log("[done] password reset script completed")
}

void main()

