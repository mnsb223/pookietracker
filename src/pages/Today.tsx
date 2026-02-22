import { useEffect, useMemo, useState } from 'react'
import { BONUS_DEFICIT, DEFAULT_BMR, MIN_DEFICIT } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'
import type { DailyLog } from '../lib/types'
import {
  applySaveEffects,
  getDailyLog,
  getProfile,
  rebuildCountdownFromLogs,
  rebuildStreakFromLogs,
  resetStreak,
  saveDailyLog,
} from '../data/store'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const COUNTDOWN_START = 45000

export default function Today(props: { selectedDate?: string }) {
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)
  const [date, setDate] = useState<string>(props.selectedDate ?? todayISO())

  const [eaten, setEaten] = useState<string>('')
  const [burned, setBurned] = useState<string>('')
  const [gym, setGym] = useState<boolean>(false)
  const [cheat, setCheat] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  const [streak, setStreak] = useState<number>(0)
  const [remaining, setRemaining] = useState<number>(COUNTDOWN_START)

  useEffect(() => {
    if (props.selectedDate) setDate(props.selectedDate)
  }, [props.selectedDate])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const profile = await getProfile()
      if (cancelled) return
      const bmrValue = profile?.bmr ?? DEFAULT_BMR
      setBmr(bmrValue)

      const rebuiltStreak = await rebuildStreakFromLogs({ bmr: bmrValue })
      const rebuiltRemaining = await rebuildCountdownFromLogs({ bmr: bmrValue })

      if (cancelled) return
      setStreak(rebuiltStreak.count ?? 0)
      setRemaining(rebuiltRemaining)
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadLog() {
      setLoading(true)
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

      setLoading(false)
    }
    loadLog()
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
  const met1000 = cheat ? false : def >= BONUS_DEFICIT

  const recommendedEatZeroBurn = useMemo(() => bmr - MIN_DEFICIT, [bmr])
  const minCaloriesOutTarget = useMemo(() => bmr + MIN_DEFICIT, [bmr])

  const progress = useMemo(() => {
    const r = Math.max(0, Math.min(COUNTDOWN_START, remaining))
    return 1 - r / COUNTDOWN_START
  }, [remaining])

  async function handleSave() {
    const log: DailyLog = {
      date,
      caloriesEaten: eatenNum,
      caloriesBurned: burnedNum,
      gym,
      cheat,
    }

    await saveDailyLog(log)

    const effects = await applySaveEffects({
      date,
      bmr,
      eaten: eatenNum,
      burned: burnedNum,
      cheat,
    })

    setStreak(effects.streak.count ?? 0)
    setRemaining(effects.countdown)

    setSaveState('saved')
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  async function handleResetStreak() {
    await resetStreak()
    setStreak(0)
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
          <button
            type="button"
            onClick={handleResetStreak}
            className="mt-3 y2k-btn y2k-btn-ghost w-full"
          >
            Reset streak
          </button>
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
              Countdown starts at {COUNTDOWN_START}. Each saved day subtracts that day’s calories out.
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
          <div className="y2k-card p-4">
            <p className="text-sm font-extrabold">Recommended calories per day</p>
            <p className="mt-1 text-sm opacity-90">
              To hit the minimum deficit with zero active burn, eat about{' '}
              <span className="font-extrabold">{recommendedEatZeroBurn.toFixed(0)}</span> calories per day.
            </p>
            <p className="mt-2 text-xs opacity-80">
              Minimum calories-out target (BMR + minimum deficit): {minCaloriesOutTarget.toFixed(0)}.
              Active burn increases your allowance by the same amount.
            </p>
          </div>

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