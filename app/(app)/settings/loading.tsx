export default function SettingsLoading() {
  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">
      {/* Sidebar skeleton */}
      <aside className="w-[220px] bg-white border-r border-gray-200 shrink-0">
        <div className="flex items-center h-14 px-4 border-b border-gray-200 gap-2">
          <div className="h-7 w-7 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="py-4 px-2 space-y-2">
          <div className="h-3 w-16 rounded bg-gray-100 animate-pulse mx-2 mb-2" />
          <div className="h-9 rounded-lg bg-gray-100 animate-pulse" />
          <div className="my-3 border-t border-gray-100" />
          <div className="h-3 w-12 rounded bg-gray-100 animate-pulse mx-2 mb-2" />
          <div className="h-9 rounded-lg bg-[#EEF2FF] animate-pulse" />
        </div>
      </aside>

      {/* Main area skeleton */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="shrink-0 flex items-center gap-4 bg-white border-b border-gray-200 px-6 h-14">
          <div>
            <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
            <div className="h-3 w-48 rounded bg-gray-100 animate-pulse mt-1.5" />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-[#3730A3] border-t-transparent animate-spin" />
        </main>
      </div>
    </div>
  )
}
