import { useState } from 'react'
import BottomNav from './components/BottomNav'

import Today from './pages/Today'
import Week from './pages/Week'
import History from './pages/History'
import Profile from './pages/Profile'

type TabKey = 'today' | 'week' | 'history' | 'profile'

export default function App() {
  const [tab, setTab] = useState<TabKey>('today')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  return (
    <div
      className={[
        'min-h-screen text-zinc-100',
        'bg-zinc-950',
        // soft glows
        'bg-[radial-gradient(900px_circle_at_15%_-10%,rgba(236,72,153,0.18),transparent_45%),radial-gradient(800px_circle_at_110%_0%,rgba(16,185,129,0.14),transparent_40%)]',
      ].join(' ')}
    >
      <div className="mx-auto max-w-md px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+9rem)]">
        <div className="rounded-[2.5rem] border border-zinc-800 bg-zinc-950/60 shadow-[0_20px_70px_rgba(0,0,0,0.6)] backdrop-blur">
          <div className="px-4 pt-5 pb-6">
            <header className="mb-6">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  Pookie Tracker <span className="text-pink-300">♡</span>
                </h1>
              </div>

              <p className="mt-2 text-sm text-zinc-400">
                700+ deficit daily · gym 3x/week
              </p>
            </header>

            <main className="pb-2">
              {tab === 'today' && <Today selectedDate={selectedDate ?? undefined} />}

              {tab === 'week' && <Week />}

              {tab === 'history' && (
                <History
                  onOpenDate={(date) => {
                    setSelectedDate(date)
                    setTab('today')
                  }}
                />
              )}

              {tab === 'profile' && <Profile />}
            </main>
          </div>
        </div>
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
