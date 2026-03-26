export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-9 w-40 rounded bg-muted" />
      <div className="h-16 w-full rounded-lg bg-muted" />
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-40 rounded-lg bg-muted" />
      <div className="h-64 rounded-lg bg-muted" />
    </div>
  )
}
