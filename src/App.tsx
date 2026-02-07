import { useMemo, useState } from 'react'
import BottomNav from './components/BottomNav'

import Today from './pages/Today'
import Week from './pages/Week'
import History from './pages/History'
import Profile from './pages/Profile'

type TabKey = 'today' | 'week' | 'history' | 'profile'

export default function App() {
  const [tab, setTab] = useState<TabKey>('today')

  const Page = useMemo(() => {
    switch (tab) {
      case 'today':
        return Today
      case 'week':
        return Week
      case 'history':
        return History
      case 'profile':
        return Profile
    }
  }, [tab])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight">
            Pookie Tracker <span className="text-pink-300">♡</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            700+ deficit daily, gym 3x/week
          </p>
        </header>

        <main>
          <Page />
        </main>
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
