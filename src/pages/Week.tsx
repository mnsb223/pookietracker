import { useEffect, useMemo, useState } from 'react'
import { getProfile, getLogsInRange } from '../data/store'
import type { DailyLog } from '../lib/types'
import { DEFAULT_BMR, MIN_DEFICIT, BONUS_DEFICIT, GYM_MIN_PER_WEEK } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'

function isoToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateISO: string, days: number): string {
  const d = parseISODate(dateISO)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/**
 * Returns the Monday of the week containing dateISO (Mon–Sun weeks)
 */
function startOfWeekMonday(dateISO: string): string {
  const d = parseISODate(dateISO)
  const day = d.getDay() // Sun=0, Mon=1, ... Sat=6
  const diffToMonday = (day + 6) % 7 // Mon->0, Tue->1, ..., Sun->6
  d.setDate(d.getDate() - diffToMonday)
  return toISODate(d)
}

export default function Week() {
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)

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
  
  const [anchorDate, setAnchorDate] = useState<string>(isoToday())
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<DailyLog[]>([])

  const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  // Map logs by date for quick lookup
  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyLog>()
    for (const l of logs) map.set(l.date, l)
    return map
  }, [logs])

  // Load logs whenever the week changes
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const weekLogs = await getLogsInRange(weekStart, weekEnd)
      if (cancelled) return
      setLogs(weekLogs)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [weekStart, weekEnd])

  // Build the 7 days in this week
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  // Compute day-by-day status + weekly totals
  const summary = useMemo(() => {
    let loggedDays = 0
    let gymDays = 0
    let metMinDays = 0
    let dollars = 0

    const dayStatus = days.map((date) => {
      const log = logsByDate.get(date)
      if (!log) {
        return { date, hasLog: false, gym: false, def: 0, met700: false, met1000: false }
      }

      loggedDays++
      if (log.gym) gymDays++

      const out = caloriesOut(bmr, log.caloriesBurned)
      const def = deficit(out, log.caloriesEaten)

      const met700 = def >= MIN_DEFICIT
      const met1000 = def >= BONUS_DEFICIT

      if (met700) metMinDays++
      if (met1000) dollars++

      return { date, hasLog: true, gym: log.gym, def, met700, met1000 }
    })

    const caloriesConsistent = metMinDays === 7 // strict 7/7
    const gymConsistent = gymDays >= GYM_MIN_PER_WEEK // 3/7
    const weekSuccessful = caloriesConsistent && gymConsistent

    return {
      dayStatus,
      loggedDays,
      gymDays,
      metMinDays,
      dollars,
      caloriesConsistent,
      gymConsistent,
      weekSuccessful,
    }
  }, [days, logsByDate, bmr])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Week</h2>
        {loading && <span className="text-sm text-zinc-400">Loading...</span>}
      </div>

      {/* Pick a date to choose the week */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="block text-sm text-zinc-300">Pick any date in the week</label>
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
        />
        <p className="mt-2 text-sm text-zinc-400">
          Week: <span className="text-zinc-200">{weekStart}</span> →{' '}
          <span className="text-zinc-200">{weekEnd}</span>
        </p>
      </div>

      {/* Day pills */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="grid grid-cols-7 gap-2">
          {summary.dayStatus.map((d) => {
            const base =
              'rounded-xl border px-2 py-2 text-center text-xs font-medium'
            const cls = !d.hasLog
              ? 'border-zinc-800 bg-zinc-950 text-zinc-500'
              : d.met700
                ? 'border-pink-400/40 bg-pink-500/10 text-pink-200'
                : 'border-red-400/30 bg-red-500/10 text-red-200'

            const label = d.date.slice(8, 10) // day of month

            return (
              <div key={d.date} className={[base, cls].join(' ')}>
                <div className="text-sm">{label}</div>
                <div className="mt-1 flex justify-center gap-1">
                  {d.hasLog && d.gym && <span title="Gym">🏋️</span>}
                  {d.hasLog && d.met1000 && <span title="+$1">💗</span>}
                  {d.hasLog && d.met700 && !d.met1000 && <span title="700 met">✓</span>}
                  {!d.hasLog && <span title="Not logged">—</span>}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Using BMR: {bmr}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Logged</p>
          <p className="text-2xl font-bold">{summary.loggedDays}/7</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Gym</p>
          <p className="text-2xl font-bold">{summary.gymDays}/{GYM_MIN_PER_WEEK}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">700+ days</p>
          <p className="text-2xl font-bold">{summary.metMinDays}/7</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">+$ earned</p>
          <p className="text-2xl font-bold">{summary.dollars}</p>
        </div>
      </div>

      {/* Success banner */}
      <div
        className={[
          'rounded-2xl border p-4',
          summary.weekSuccessful
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
            : 'border-zinc-800 bg-zinc-900/50 text-zinc-200',
        ].join(' ')}
      >
        <p className="font-semibold">
          {summary.weekSuccessful ? 'Week successful ✓' : 'Week not yet'}
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          Calories: {summary.caloriesConsistent ? '7/7 met' : `${summary.metMinDays}/7 met`} · Gym:{' '}
          {summary.gymConsistent ? '3+ days met' : `${summary.gymDays}/3`}
        </p>
      </div>
    </div>
  )
}
