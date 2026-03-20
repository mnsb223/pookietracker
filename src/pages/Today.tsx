import { useEffect, useMemo, useState } from 'react'
import { BONUS_DEFICIT, COUNTDOWN_START, DEFAULT_BMR, MIN_DEFICIT } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'
import type { DailyLog } from '../lib/types'
import {
  getDailyLog,
  getProfile,
  rebuildCountdown,
  rebuildStreak,
  saveDailyLog,
  todayISO,
} from '../data/store'

export default function Today(props: { selectedDate?: string }) {
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)
  const [programStartDate, setProgramStartDate] = useState<string>(todayISO())
  const [date, setDate] = useState<string>(props.selectedDate ?? todayISO())

  const [eaten, setEaten] = useState<string>('')
  const [burned, setBurned] = useState<string>('')
  const [gym, setGym] = useState<boolean>(false)
  const [cheat, setCheat] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  const [streak, setStreak] = useState<number>(0)
  const [remaining, setRemaining] = useState<number>(COUNTDOWN_START)

  // Sync date from parent (History click-to-edit)
  useEffect(() => {
    if (props.selectedDate) setDate(props.selectedDate)
  }, [props.selectedDate])

  // Load profile, rebuild derived state, load log for the selected date
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const profile = await getProfile()
        if (cancelled) return

        const bmrValue = profile?.bmr ?? DEFAULT_BMR
        const startDate = profile?.programStartDate ?? todayISO()
        setBmr(bmrValue)
        setProgramStartDate(startDate)

        const [streakCount, newRemaining] = await Promise.all([
          rebuildStreak(bmrValue),
          rebuildCountdown(bmrValue, startDate),
        ])
        if (cancelled) return
        setStreak(streakCount)
        setRemaining(newRemaining)

        const log = await getDailyLog(date)
        if (cancelled) return
        if (log) {
          setEaten(String(log.caloriesEaten ?? ''))
          setBurned(String(log.caloriesBurned ?? ''))
          setGym(!!log.gym)
          setCheat(!!log.cheat)
        } else {
          setEaten('')
          setBurned('')
          setGym(false)
          setCheat(false)
        }
      } catch (err) {
        console.error('Failed to load Today', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [date])

  const eatenNum = useMemo(() => {
    const n = Number(eaten)
    return Number.isFinite(n) ? n : 0
  }, [eaten])

  const burnedNum = useMemo(() => {
    const n = Number(burned)
    return Number.isFinite(n) ? n : 0
  }, [burned])

  const out = useMemo(() => caloriesOut(bmr, burnedNum), [bmr, burnedNum])
  const def = useMemo(() => deficit(out, eatenNum), [out, eatenNum])

  const met700 = cheat ? true : def >= MIN_DEFICIT
  const met1000 = !cheat && def >= BONUS_DEFICIT

  const progress = useMemo(() => {
    return 1 - Math.max(0, Math.min(COUNTDOWN_START, remaining)) / COUNTDOWN_START
  }, [remaining])

  async function handleSave() {
    const log: DailyLog = {
      date,
      caloriesEaten: eatenNum,
      caloriesBurned: burnedNum,
      gym,
      cheat,
      bmr,
    }

    await saveDailyLog(log)

    // Always rebuild from all logs — no delta math, no drift
    const [streakCount, newRemaining] = await Promise.all([
      rebuildStreak(bmr),
      rebuildCountdown(bmr, programStartDate),
    ])
    setStreak(streakCount)
    setRemaining(newRemaining)

    setSaveState('saved')
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Today</h2>
        {loading && <span className="text-sm opacity-70">Loading...</span>}
      </div>

      <div className="rounded-2xl border p-5 y2k-card">
        <label className="block text-sm font-extrabold">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-3 y2k-input"
        />
        <p className="mt-2 text-xs opacity-80">Tap a day in History to edit it here.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="rounded-2xl border p-5 y2k-card">
          <p className="text-sm opacity-80">Current streak</p>
          <p className="text-3xl font-extrabold tracking-tight">{streak} days</p>
          <p className="mt-2 text-xs opacity-80">
            Streak increases when a saved day hits at least {MIN_DEFICIT} deficit (cheat days count).
          </p>
        </div>

        <div className="rounded-2xl border p-5 y2k-card">
          <p className="text-sm opacity-80">Calories remaining</p>
          <p className="text-3xl font-extrabold tracking-tight">{remaining.toFixed(0)}</p>
          <div className="mt-3">
            <div className="h-4 w-full rounded-full border bg-white/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-pink-400"
                style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs opacity-80">
              Countdown starts at {COUNTDOWN_START.toLocaleString()} on {programStartDate}. Each saved day subtracts that day&apos;s calories out.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-5 space-y-4 y2k-card">
        <div>
          <label className="block text-sm font-extrabold">Calories eaten</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 1600"
            value={eaten}
            onChange={(e) => setEaten(e.target.value)}
            className="mt-3 y2k-input"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold">Calories burned (active)</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 300"
            value={burned}
            onChange={(e) => setBurned(e.target.value)}
            className="mt-3 y2k-input"
          />
          <p className="mt-2 text-xs opacity-80">Active calories only.</p>
        </div>

        <button
          type="button"
          onClick={() => setGym((v) => !v)}
          className="y2k-btn y2k-btn-ghost w-full"
        >
          {gym ? 'Gym: Yes' : 'Gym: No'}
        </button>

        <button type="button" onClick={() => setCheat((v) => !v)} className="y2k-btn w-full">
          {cheat ? 'Cheat day: Yes' : 'Cheat day: No'}
        </button>
      </div>

      <div className="rounded-2xl border p-5 y2k-card">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm opacity-80">Calories out</p>
            <p className="text-3xl font-extrabold">{out.toFixed(0)}</p>
            <p className="text-xs opacity-80">BMR {bmr} + burned</p>
          </div>

          <div className="text-right">
            <p className="text-sm opacity-80">Deficit</p>
            <p className="text-3xl font-extrabold">{def.toFixed(0)}</p>
            <p className="text-xs opacity-80">out − eaten</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <span className="y2k-pill y2k-pill-mint">
              {cheat ? 'Cheat counts' : met700 ? '700 met' : `Need ${MIN_DEFICIT}`}
            </span>
            <span className="y2k-pill y2k-pill-pink">
              {met1000 ? 'Bonus earned' : cheat ? 'No bonus on cheat' : `Bonus at ${BONUS_DEFICIT}`}
            </span>
          </div>
        </div>

        <button type="button" onClick={handleSave} className="mt-5 y2k-btn y2k-btn-primary w-full">
          Save day
        </button>

        {saveState === 'saved' && <p className="mt-2 text-sm font-extrabold">Saved</p>}
      </div>
    </div>
  )
}
