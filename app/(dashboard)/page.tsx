import { OverviewView } from "@/components/dashboard/overview-view"
import { getDashboardContentItems } from "@/lib/content/store"

export default async function OverviewPage() {
  const items = await getDashboardContentItems()
  return <OverviewView items={items} />
}
