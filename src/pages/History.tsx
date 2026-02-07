import { useEffect, useState } from 'react'
import { DEFAULT_BMR, MIN_DEFICIT, BONUS_DEFICIT } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'
import type { DailyLog } from '../lib/types'
import { getDailyLog, getProfile, listLogDates } from '../data/store'

const CARD =
  'rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'

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
        const defVal = deficit(out, log.caloriesEaten)

        newRows.push({
          date,
          log,
          def: defVal,
          met700: defVal >= MIN_DEFICIT,
          met1000: defVal >= BONUS_DEFICIT,
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

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">History</h2>
          <p className="mt-1 text-sm text-zinc-400">Tap a day to edit.</p>
        </div>

        {loading && (
          <div className="rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300">
            Loading…
          </div>
        )}
      </div>

      <div className={CARD}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-300">
            Entries: <span className="font-semibold text-zinc-100">{rows.length}</span>
          </p>
          <p className="text-xs text-zinc-500">BMR {bmr}</p>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          ✅ 700 met · 💗 $ day · 🏋️ gym day
        </p>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && !loading && (
          <div className={CARD}>
            <p className="text-zinc-300">No entries yet.</p>
            <p className="mt-1 text-sm text-zinc-400">Log a day in Today to see it here.</p>
          </div>
        )}

        {rows.map((r) => (
          <button
            key={r.date}
            type="button"
            onClick={() => onOpenDate(r.date)}
            className={[
              'w-full text-left rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5',
              'shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
              'transition hover:bg-zinc-900/55 active:scale-[0.99]',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold tracking-tight">{r.date}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Eaten {r.log.caloriesEaten} · Burned {r.log.caloriesBurned}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-zinc-400">Deficit</p>
                <p className="text-2xl font-bold tracking-tight">{r.def.toFixed(0)}</p>
                <p className="mt-1 text-zinc-500 text-xs">Edit ›</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {r.log.gym && (
                <span className="inline-flex items-center rounded-full border border-pink-400/40 bg-pink-500/15 px-3 py-1 text-sm font-semibold text-pink-200">
                  🏋️ Gym
                </span>
              )}

              {r.met700 ? (
                <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm font-semibold text-zinc-200">
                  ✅ 700
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-sm font-semibold text-red-200">
                  Not met
                </span>
              )}

              {r.met1000 && (
                <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-200">
                  💗 +$1
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
