import { useEffect, useMemo, useState } from 'react'
import { getLogsInRange, getProfile } from '../data/store'
import type { DailyLog } from '../lib/types'
import {
  BONUS_DEFICIT,
  DEFAULT_BMR,
  GYM_MIN_PER_WEEK,
  MAX_CHEAT_DAYS_PER_WEEK,
  MIN_DEFICIT,
} from '../lib/config'
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

/** Sunday start (Sun–Sat) */
function startOfWeekSunday(dateISO: string): string {
  const d = parseISODate(dateISO)
  const day = d.getDay() // Sun=0 ... Sat=6
  d.setDate(d.getDate() - day)
  return toISODate(d)
}

export default function Week() {
  const [anchorDate, setAnchorDate] = useState<string>(isoToday())
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)

  // Load BMR once
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

  const weekStart = useMemo(() => startOfWeekSunday(anchorDate), [anchorDate])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyLog>()
    for (const l of logs) map.set(l.date, l)
    return map
  }, [logs])

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

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const summary = useMemo(() => {
    let loggedDays = 0
    let gymDays = 0
    let metDays = 0
    let dollars = 0
    let cheatDays = 0

    const dayStatus = days.map((date) => {
      const log = logsByDate.get(date)
      if (!log) {
        return { date, hasLog: false, gym: false, cheat: false, def: 0, met700: false, met1000: false }
      }

      loggedDays++
      if (log.gym) gymDays++

      const isCheat = !!log.cheat
      if (isCheat) cheatDays++

      const out = caloriesOut(bmr, log.caloriesBurned)
      const def = deficit(out, log.caloriesEaten)

      const met700 = isCheat ? true : def >= MIN_DEFICIT
      const met1000 = isCheat ? false : def >= BONUS_DEFICIT

      if (met700) metDays++
      if (met1000) dollars++

      return { date, hasLog: true, gym: log.gym, cheat: isCheat, def, met700, met1000 }
    })

    const caloriesConsistent = metDays === 7 && cheatDays <= MAX_CHEAT_DAYS_PER_WEEK
    const gymConsistent = gymDays >= GYM_MIN_PER_WEEK
    const weekSuccessful = caloriesConsistent && gymConsistent

    return {
      dayStatus,
      loggedDays,
      gymDays,
      metDays,
      dollars,
      cheatDays,
      caloriesConsistent,
      gymConsistent,
      weekSuccessful,
    }
  }, [days, logsByDate, bmr])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Week</h2>
        {loading && <span className="text-sm opacity-70">Loading...</span>}
      </div>

      <div className="rounded-2xl border p-4 y2k-card">
        <label className="block text-sm">Pick any date in the week</label>
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
          className="mt-2 y2k-input"
        />
        <p className="mt-2 text-sm opacity-80">
          Week: <span className="font-semibold">{weekStart}</span> → <span className="font-semibold">{weekEnd}</span>
        </p>
        <p className="mt-1 text-xs opacity-80">Using BMR: {bmr}</p>
      </div>

      <div className="rounded-2xl border p-4 y2k-card">
        <div className="grid grid-cols-7 gap-2">
          {summary.dayStatus.map((d, i) => {
            const base = 'rounded-xl border px-2 py-2 text-center text-xs font-medium'
            const cls = !d.hasLog ? 'opacity-70' : d.met700 ? '' : 'opacity-90'

            // Sun → Sat labels (week starts Sunday in this view)
            const dow = ['S', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][i] ?? ''

            // Day of month (09, 10, 11...)
            const dayNum = d.date.slice(8, 10)

            return (
              <div key={d.date} className={`${base} ${cls}`}>
                <div className="text-[10px] opacity-80">{dow}</div>
                <div className="text-sm font-bold leading-tight">{dayNum}</div>

                <div className="mt-1 flex justify-center gap-1 text-[10px]">
                  {d.hasLog ? (
                    <>
                      {d.gym && <span title="Gym">G</span>}
                      {d.cheat && <span title="Cheat">C</span>}
                      {d.met1000 && !d.cheat && <span title="+$1">+1</span>}
                      {!d.cheat && d.met700 && !d.met1000 && <span title="700 met">✓</span>}
                    </>
                  ) : (
                    <span title="Not logged">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border p-4 y2k-card">
          <p className="text-sm opacity-80">Logged</p>
          <p className="text-2xl font-bold">{summary.loggedDays}/7</p>
        </div>

        <div className="rounded-2xl border p-4 y2k-card">
          <p className="text-sm opacity-80">Gym</p>
          <p className="text-2xl font-bold">{summary.gymDays}/{GYM_MIN_PER_WEEK}</p>
        </div>

        <div className="rounded-2xl border p-4 y2k-card">
          <p className="text-sm opacity-80">700+ (or cheat)</p>
          <p className="text-2xl font-bold">{summary.metDays}/7</p>
        </div>

        <div className="rounded-2xl border p-4 y2k-card">
          <p className="text-sm opacity-80">Cheat days</p>
          <p className="text-2xl font-bold">{summary.cheatDays}/{MAX_CHEAT_DAYS_PER_WEEK}</p>
        </div>
      </div>

      <div className="rounded-2xl border p-4 y2k-card">
        <p className="font-semibold">
          {summary.weekSuccessful ? 'Week successful ✓' : 'Week not yet'}
        </p>
        <p className="mt-1 text-sm opacity-80">
          Calories: {summary.caloriesConsistent ? '7/7 met' : `${summary.metDays}/7 met`} · Gym:{' '}
          {summary.gymConsistent ? '3+ days met' : `${summary.gymDays}/3`}
        </p>
      </div>
    </div>
  )
}
