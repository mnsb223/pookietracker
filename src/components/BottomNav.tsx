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
    <nav className="y2k-nav-wrap">
      <div className="mx-auto max-w-md px-4">
        <div className="y2k-nav">
          <div className="grid grid-cols-4 gap-2">
            {items.map((item) => {
              const isActive = item.key === active
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  className={[
                    'y2k-nav-btn',
                    'flex flex-col items-center justify-center gap-1',
                    isActive ? 'is-active' : '',
                  ].join(' ')}
                >
                  <span className="text-[11px]">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
