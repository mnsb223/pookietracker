import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BMR, MIN_DEFICIT, BONUS_DEFICIT } from '../lib/config'
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

  // Load BMR
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

  // Load history rows
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

        newRows.push({
          date,
          log,
          def,
          met700: def >= MIN_DEFICIT,
          met1000: def >= BONUS_DEFICIT,
        })
      }

      if (cancelled) return
      setRows(newRows)
      setLoading(false)
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [bmr])

  const total = rows.length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">History</h2>
        {loading && <span className="text-sm text-zinc-400">Loading...</span>}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm text-zinc-300">
          Entries: <span className="font-semibold text-zinc-100">{total}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">Tap a day to edit it.</p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && !loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-zinc-300">
            No entries yet.
          </div>
        )}

        {rows.map((r) => (
          <button
            key={r.date}
            type="button"
            onClick={() => onOpenDate(r.date)}
            className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900/70 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.date}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Eaten {r.log.caloriesEaten} · Burned {r.log.caloriesBurned}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-zinc-400">Deficit</p>
                <p className="text-xl font-bold">{r.def.toFixed(0)}</p>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {r.log.gym && (
                <span className="inline-flex items-center rounded-full border border-pink-400/40 bg-pink-500/10 px-3 py-1 text-sm text-pink-200">
                  🏋️ Gym
                </span>
              )}
              {r.met700 && (
                <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm text-zinc-200">
                  ✓ 700
                </span>
              )}
              {r.met1000 && (
                <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                  💗 +$1
                </span>
              )}
              {!r.met700 && (
                <span className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-sm text-red-200">
                  Not met
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-500">Using BMR: {bmr}</p>
    </div>
  )
}
