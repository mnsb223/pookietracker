import { useState } from 'react'
import BottomNav from './components/BottomNav'

import Today from './pages/Today'
import Week from './pages/Week'
import History from './pages/History'
import Profile from './pages/Profile'
import Aurora from './components/Aurora'

type TabKey = 'today' | 'week' | 'history' | 'profile'

export default function App() {
  const [tab, setTab] = useState<TabKey>('today')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora
        colorStops={['#7cff67', '#B19EEF', '#5227FF']}
        blend={0.5}
        amplitude={1.0}
        speed={1}
      />

      <div className="relative z-10 min-h-screen y2k-bg sparkles text-zinc-100">
        <div className="sparkle-mask">
          <div className="mx-auto max-w-xl px-6 md:px-10 lg:px-14 pt-6 pb-[calc(env(safe-area-inset-bottom)+8rem)]">
            <div className="y2k-shell p-5">
              <header className="mb-6">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-2xl font-extrabold tracking-tight y2k-title">
                    Pookie Tracker
                  </h1>
                </div>
              </header>

              <main className="pb-2 relative z-[1]">
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
    </div>
  )
}