export default function TimeTrackingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 rounded bg-muted" />
        <div className="h-10 w-44 rounded bg-muted" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-7 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search skeleton */}
      <div className="h-10 w-full rounded bg-muted" />

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-16">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 w-20 rounded bg-muted" />
            ))}
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
