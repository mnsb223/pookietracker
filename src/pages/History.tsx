import { useEffect, useState } from 'react'
import { BONUS_DEFICIT, DEFAULT_BMR, MIN_DEFICIT } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'
import type { DailyLog } from '../lib/types'
import { getDailyLog, getProfile, listLogDates } from '../data/store'

type HistoryProps = {
  onOpenDate: (date: string) => void
}

type HistoryRow = {
  date: string
  log: DailyLog
  def: number
  met700: boolean
  met1000: boolean
}

export default function History({ onOpenDate }: HistoryProps) {
  const [loading, setLoading] = useState(false)
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)
  const [rows, setRows] = useState<HistoryRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      const profile = await getProfile()
      if (cancelled) return
      if (profile?.bmr) setBmr(profile.bmr)
    }
    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setLoading(true)

      const dates = await listLogDates()
      const newRows: HistoryRow[] = []

      for (const date of dates) {
        const log = await getDailyLog(date)
        if (!log) continue

        const out = caloriesOut(bmr, log.caloriesBurned)
        const def = deficit(out, log.caloriesEaten)

        const isCheat = !!log.cheat
        const met700 = isCheat ? true : def >= MIN_DEFICIT
        const met1000 = isCheat ? false : def >= BONUS_DEFICIT

        newRows.push({ date, log, def, met700, met1000 })
      }

      // newest first
      newRows.sort((a, b) => (a.date < b.date ? 1 : -1))

      if (cancelled) return
      setRows(newRows)
      setLoading(false)
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [bmr])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">History</h2>
        {loading && <span className="text-sm opacity-70">Loading...</span>}
      </div>

      <div className="rounded-2xl border p-4 y2k-card">
        <p className="text-sm">
          Entries: <span className="font-semibold">{rows.length}</span>
        </p>
        <p className="mt-1 text-xs opacity-80">Tap a day to edit it.</p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && !loading && (
          <div className="rounded-2xl border p-4 y2k-card">No entries yet.</div>
        )}

        {rows.map((r) => (
          <button
            key={r.date}
            type="button"
            onClick={() => onOpenDate(r.date)}
            className="w-full text-left rounded-2xl border p-4 y2k-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.date}</p>
                <p className="mt-1 text-sm opacity-80">
                  Eaten {r.log.caloriesEaten} · Burned {r.log.caloriesBurned}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm opacity-80">Deficit</p>
                <p className="text-xl font-bold">{r.def.toFixed(0)}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap">
              {r.log.gym && <span className="y2k-pill y2k-pill-mint">Gym</span>}
              {r.log.cheat && <span className="y2k-pill y2k-pill-pink">Cheat</span>}
              {r.met700 && <span className="y2k-pill">700</span>}
              {r.met1000 && !r.log.cheat && <span className="y2k-pill y2k-pill-pink">+$1</span>}
              {!r.met700 && <span className="y2k-pill y2k-pill-red">Not met</span>}
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs opacity-80">Using BMR: {bmr}</p>
    </div>
  )
}
