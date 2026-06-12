export default function DashboardLoading() {
  return (
    <div className="grid gap-6 pb-20 lg:pb-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-2">
          <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-md bg-slate-200" />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3">
          <div className="h-10 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded bg-slate-100" />
        </div>
      </section>
    </div>
  );
}
