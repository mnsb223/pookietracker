import { useEffect, useMemo, useState } from 'react'
import { getLogsInRange, getProfile } from '../data/store'
import type { DailyLog } from '../lib/types'
import { DEFAULT_BMR, MIN_DEFICIT, BONUS_DEFICIT, GYM_MIN_PER_WEEK } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'

const CARD =
  'rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
const INPUT =
  'mt-2 block w-full min-w-0 max-w-full box-border ' +
  'rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-pink-400/40'

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

function startOfWeekMonday(dateISO: string): string {
  const d = parseISODate(dateISO)
  const day = d.getDay() // Sun=0..Sat=6
  const diffToMonday = (day + 6) % 7
  d.setDate(d.getDate() - diffToMonday)
  return toISODate(d)
}

export default function Week() {
  const [anchorDate, setAnchorDate] = useState<string>(isoToday())
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)

  // Load profile BMR once
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

  const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate])
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

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const dow = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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
      const defVal = deficit(out, log.caloriesEaten)

      const met700 = defVal >= MIN_DEFICIT
      const met1000 = defVal >= BONUS_DEFICIT

      if (met700) metMinDays++
      if (met1000) dollars++

      return { date, hasLog: true, gym: log.gym, def: defVal, met700, met1000 }
    })

    const caloriesConsistent = metMinDays === 7
    const gymConsistent = gymDays >= GYM_MIN_PER_WEEK
    const weekSuccessful = caloriesConsistent && gymConsistent

    return { dayStatus, loggedDays, gymDays, metMinDays, dollars, caloriesConsistent, gymConsistent, weekSuccessful }
  }, [days, logsByDate, bmr])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Week</h2>
          <p className="mt-1 text-sm text-zinc-400">Mon → Sun · strict 7/7 on deficit</p>
        </div>
        {loading && (
          <div className="rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300">
            Loading…
          </div>
        )}
      </div>

      <div className={CARD}>
        <label className="block text-sm font-medium text-zinc-300">Pick any date in the week</label>
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
          className={INPUT}
        />
        <p className="mt-2 text-sm text-zinc-400">
          Week: <span className="text-zinc-200">{weekStart}</span> →{' '}
          <span className="text-zinc-200">{weekEnd}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">Using BMR: {bmr}</p>
      </div>

      <div className={CARD}>
        <div className="grid grid-cols-7 gap-2">
          {summary.dayStatus.map((d, i) => {
            const cls = !d.hasLog
              ? 'border-zinc-800 bg-zinc-950 text-zinc-500'
              : d.met1000
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                : d.met700
                  ? 'border-pink-400/40 bg-pink-500/15 text-pink-200'
                  : 'border-red-400/30 bg-red-500/10 text-red-200'

            const dayNum = d.date.slice(8, 10)

            return (
              <div
                key={d.date}
                className={[
                  'rounded-2xl border px-2 py-3 text-center transition',
                  cls,
                ].join(' ')}
              >
                <div className="text-[10px] font-semibold opacity-80">{dow[i]}</div>
                <div className="text-sm font-bold">{dayNum}</div>

                <div className="mt-1 flex justify-center gap-1 text-xs">
                  {d.hasLog && d.gym && <span title="Gym">🏋️</span>}
                  {d.hasLog && d.met1000 && <span title="+$1">💗</span>}
                  {d.hasLog && d.met700 && !d.met1000 && <span title="700 met">✓</span>}
                  {!d.hasLog && <span title="Not logged">—</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={CARD}>
          <p className="text-sm text-zinc-400">Logged</p>
          <p className="text-3xl font-bold tracking-tight">{summary.loggedDays}/7</p>
        </div>

        <div className={CARD}>
          <p className="text-sm text-zinc-400">Gym</p>
          <p className="text-3xl font-bold tracking-tight">{summary.gymDays}/{GYM_MIN_PER_WEEK}</p>
        </div>

        <div className={CARD}>
          <p className="text-sm text-zinc-400">700+ days</p>
          <p className="text-3xl font-bold tracking-tight">{summary.metMinDays}/7</p>
        </div>

        <div className={CARD}>
          <p className="text-sm text-zinc-400">+$ earned</p>
          <p className="text-3xl font-bold tracking-tight">{summary.dollars}</p>
        </div>
      </div>

      <div
        className={[
          'rounded-3xl border p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]',
          summary.weekSuccessful
            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
            : 'border-zinc-800 bg-zinc-900/40 text-zinc-200',
        ].join(' ')}
      >
        <p className="text-lg font-bold tracking-tight">
          {summary.weekSuccessful ? 'Week successful ✓' : 'Week not yet'}
        </p>
        <p className="mt-2 text-sm text-zinc-300">
          Calories: {summary.caloriesConsistent ? '7/7 met' : `${summary.metMinDays}/7 met`} · Gym:{' '}
          {summary.gymConsistent ? '3+ days met' : `${summary.gymDays}/3`}
        </p>
      </div>
    </div>
  )
}
