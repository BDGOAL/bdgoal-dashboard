type PlaceholderPanelProps = {
  label: string
}

export function PlaceholderPanel({ label }: PlaceholderPanelProps) {
  return (
    <div
      role="status"
      className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm"
    >
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-2">此區功能尚未實作。</p>
    </div>
  )
}
