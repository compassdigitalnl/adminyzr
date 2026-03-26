export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title skeleton */}
      <div>
        <div className="h-9 w-48 rounded bg-muted" />
        <div className="mt-2 h-5 w-32 rounded bg-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-4 h-8 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-lg border bg-card p-6">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}
