export default function PunchCardsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 rounded bg-muted" />
        <div className="h-10 w-48 rounded bg-muted" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-10 flex-1 rounded bg-muted" />
        <div className="h-10 w-[180px] rounded bg-muted" />
      </div>
      <div className="rounded-lg border bg-card">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-16">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 w-24 rounded bg-muted" />
            ))}
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
