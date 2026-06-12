export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-md bg-slate-200" />
            <div className="grid gap-2">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-2.5 w-36 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-10 w-28 animate-pulse rounded-md bg-slate-200" />
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_380px] lg:py-10">
          <div className="grid content-center gap-4">
            <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
            <div className="h-10 w-full max-w-xl animate-pulse rounded bg-white/10 md:h-14" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-white/10" />
            <div className="h-4 w-3/4 max-w-xl animate-pulse rounded bg-white/10" />
          </div>
          <div className="grid gap-3 rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="h-16 animate-pulse rounded bg-white/10" />
            <div className="h-2 animate-pulse rounded-full bg-white/10" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 animate-pulse rounded-md bg-white/10" />
              <div className="h-9 animate-pulse rounded-md bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-20 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-44 animate-pulse rounded bg-slate-100" />
        </section>
      </div>
    </main>
  );
}
