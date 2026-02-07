type TabKey = 'today' | 'week' | 'history' | 'profile'

type BottomNavProps = {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const items: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'today', label: 'Today', icon: '☀️' },
    { key: 'week', label: 'Week', icon: '📅' },
    { key: 'history', label: 'History', icon: '🕘' },
    { key: 'profile', label: 'Profile', icon: '⚙️' },
  ]

  return (
    <nav className="fixed left-0 right-0 z-50 bottom-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 backdrop-blur shadow-[0_15px_40px_rgba(0,0,0,0.55)] p-2">
          <div className="grid grid-cols-4 gap-2">
            {items.map((item) => {
              const isActive = item.key === active
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'rounded-2xl px-2 py-3 transition',
                    'active:scale-[0.98]',
                    'flex flex-col items-center justify-center gap-1',
                    isActive
                      ? 'bg-pink-500/15 text-pink-200'
                      : 'text-zinc-300 hover:bg-zinc-900/60',
                  ].join(' ')}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
