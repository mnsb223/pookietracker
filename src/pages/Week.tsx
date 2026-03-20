import { useEffect, useMemo, useState } from 'react'
import { getLogsInRange, getProfile, addDays, parseISODate, toISODate, todayISO } from '../data/store'
import type { DailyLog } from '../lib/types'
import {
  BONUS_DEFICIT,
  DEFAULT_BMR,
  GYM_MIN_PER_WEEK,
  MAX_CHEAT_DAYS_PER_WEEK,
  MIN_DEFICIT,
} from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'

function startOfWeekSunday(dateISO: string): string {
  const d = parseISODate(dateISO)
  d.setDate(d.getDate() - d.getDay())
  return toISODate(d)
}

export default function Week() {
  const [anchorDate, setAnchorDate] = useState<string>(todayISO())
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const profile = await getProfile()
      if (cancelled) return
      if (profile?.bmr) setBmr(profile.bmr)
    })()
    return () => { cancelled = true }
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
    ;(async () => {
      setLoading(true)
      const weekLogs = await getLogsInRange(weekStart, weekEnd)
      if (cancelled) return
      setLogs(weekLogs)
      setLoading(false)
    })()
    return () => { cancelled = true }
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
      if (!log) return { date, hasLog: false, gym: false, cheat: false, def: 0, met700: false, met1000: false }

      loggedDays++
      if (log.gym) gymDays++

      const isCheat = !!log.cheat
      if (isCheat) cheatDays++

      const out = caloriesOut(bmr, log.caloriesBurned ?? 0)
      const defValue = deficit(out, log.caloriesEaten ?? 0)
      const met700 = isCheat ? true : defValue >= MIN_DEFICIT
      const met1000 = !isCheat && defValue >= BONUS_DEFICIT

      if (met700) metDays++
      if (met1000) dollars++

      return { date, hasLog: true, gym: !!log.gym, cheat: isCheat, def: defValue, met700, met1000 }
    })

    const caloriesConsistent = metDays === 7 && cheatDays <= MAX_CHEAT_DAYS_PER_WEEK
    const gymConsistent = gymDays >= GYM_MIN_PER_WEEK

    return { dayStatus, loggedDays, gymDays, metDays, dollars, cheatDays, caloriesConsistent, gymConsistent, weekSuccessful: caloriesConsistent && gymConsistent }
  }, [days, logsByDate, bmr])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Week</h2>
        {loading && <span className="text-sm opacity-70">Loading...</span>}
      </div>

      <div className="rounded-2xl border p-5 y2k-card">
        <label className="block text-sm font-extrabold">Pick any date in the week</label>
        <input
          type="date"
          value={anchorDate}
          onChange={(e) => setAnchorDate(e.target.value)}
          className="mt-3 y2k-input"
        />
        <p className="mt-3 text-sm opacity-80">
          Week: <span className="font-extrabold">{weekStart}</span> →{' '}
          <span className="font-extrabold">{weekEnd}</span>
        </p>
        <p className="mt-1 text-xs opacity-80">Using BMR: {bmr}</p>
      </div>

      <div className="rounded-2xl border p-5 y2k-card">
        <div className="grid grid-cols-7 gap-3">
          {summary.dayStatus.map((d, i) => {
            const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] ?? ''
            const dayNum = d.date.slice(8, 10)

            return (
              <div
                key={d.date}
                className={`rounded-2xl border p-3 text-center font-extrabold flex flex-col justify-between min-h-[110px] ${!d.hasLog ? 'opacity-70' : ''}`}
              >
                <div>
                  <div className="text-[11px] opacity-80">{dow}</div>
                  <div className="text-xl leading-tight">{dayNum}</div>
                </div>

                <div className="mt-2">
                  {d.hasLog ? (
                    <div className="text-sm font-extrabold">Deficit {d.def.toFixed(0)}</div>
                  ) : (
                    <div className="text-sm opacity-80">Not logged</div>
                  )}
                </div>

                <div className="mt-2 flex justify-center gap-2 text-[12px] font-extrabold">
                  {d.hasLog ? (
                    <>
                      {d.gym && <span>Gym</span>}
                      {d.cheat && <span>Cheat</span>}
                      {d.met1000 && !d.cheat && <span>+1</span>}
                      {!d.cheat && d.met700 && !d.met1000 && <span>700</span>}
                      {!d.met700 && <span>Low</span>}
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border p-5 y2k-card">
          <p className="text-sm opacity-80">Logged</p>
          <p className="text-3xl font-extrabold">{summary.loggedDays}/7</p>
        </div>

        <div className="rounded-2xl border p-5 y2k-card">
          <p className="text-sm opacity-80">Gym</p>
          <p className="text-3xl font-extrabold">{summary.gymDays}/{GYM_MIN_PER_WEEK}</p>
        </div>

        <div className="rounded-2xl border p-5 y2k-card">
          <p className="text-sm opacity-80">700+ (or cheat)</p>
          <p className="text-3xl font-extrabold">{summary.metDays}/7</p>
        </div>

        <div className="rounded-2xl border p-5 y2k-card">
          <p className="text-sm opacity-80">Cheat days</p>
          <p className="text-3xl font-extrabold">{summary.cheatDays}/{MAX_CHEAT_DAYS_PER_WEEK}</p>
        </div>
      </div>

      <div className="rounded-2xl border p-5 y2k-card">
        <p className="font-extrabold">
          {summary.weekSuccessful ? 'Week successful' : 'Week not yet'}
        </p>
        <p className="mt-2 text-sm opacity-80">
          Calories: {summary.caloriesConsistent ? '7/7 met' : `${summary.metDays}/7 met`} · Gym:{' '}
          {summary.gymConsistent ? '3+ days met' : `${summary.gymDays}/3`}
        </p>
      </div>
    </div>
  )
}
