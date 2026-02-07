type TabKey = 'today' | 'week' | 'history' | 'profile'

type BottomNavProps = {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const items: Array<{ key: TabKey; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'history', label: 'History' },
    { key: 'profile', label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto max-w-md px-3 py-2">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const isActive = item.key === active
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChange(item.key)}
                className={[
                  'rounded-xl px-2 py-2 text-sm font-medium transition',
                  'border',
                  isActive
                    ? 'border-pink-400/40 bg-pink-500/10 text-pink-200'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900/70',
                ].join(' ')}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
