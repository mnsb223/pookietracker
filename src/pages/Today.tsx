import { useEffect, useMemo, useState } from 'react'
import { BONUS_DEFICIT, DEFAULT_BMR, MIN_DEFICIT } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'
import type { DailyLog } from '../lib/types'
import { getDailyLog, getProfile, saveDailyLog } from '../data/store'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Today(props: { selectedDate?: string }) {
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)
  const [date, setDate] = useState<string>(props.selectedDate ?? todayISO())

  const [eaten, setEaten] = useState<string>('')   // string for input friendliness
  const [burned, setBurned] = useState<string>('') // string for input friendliness
  const [gym, setGym] = useState<boolean>(false)
  const [cheat, setCheat] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  // Keep date in sync when user taps a day in History
  useEffect(() => {
    if (props.selectedDate) setDate(props.selectedDate)
  }, [props.selectedDate])

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

  // Load log whenever date changes (for editing)
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

  // Cheat day behavior:
  // - counts as “met” for the day
  // - does NOT earn +$1
  const met700 = cheat ? true : def >= MIN_DEFICIT
  const met1000 = cheat ? false : def >= BONUS_DEFICIT

  async function handleSave() {
    const log: DailyLog = {
      date,
      caloriesEaten: eatenNum,
      caloriesBurned: burnedNum,
      gym,
      cheat,
    }

    await saveDailyLog(log)
    setSaveState('saved')
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Today</h2>
        {loading && <span className="text-sm opacity-70">Loading...</span>}
      </div>

      {/* Date */}
      <div className="rounded-2xl border p-4 y2k-card">
        <label className="block text-sm">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 y2k-input"
        />
        <p className="mt-2 text-xs opacity-80">Tap a day in History to edit it here.</p>
      </div>

      {/* Inputs */}
      <div className="rounded-2xl border p-4 space-y-3 y2k-card">
        <div>
          <label className="block text-sm">Calories eaten</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 1600"
            value={eaten}
            onChange={(e) => setEaten(e.target.value)}
            className="mt-2 y2k-input"
          />
        </div>

        <div>
          <label className="block text-sm">Calories burned (active)</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 300"
            value={burned}
            onChange={(e) => setBurned(e.target.value)}
            className="mt-2 y2k-input"
          />
          <p className="mt-1 text-xs opacity-80">Active calories only.</p>
        </div>

        <button
          type="button"
          onClick={() => setGym((v) => !v)}
          className="y2k-btn y2k-btn-ghost w-full"
        >
          {gym ? 'Gym: Yes' : 'Gym: No'}
        </button>

        <button
          type="button"
          onClick={() => setCheat((v) => !v)}
          className="y2k-btn w-full"
        >
          {cheat ? 'Cheat day: Yes' : 'Cheat day: No'}
        </button>
      </div>

      {/* Results */}
      <div className="rounded-2xl border p-4 y2k-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Calories out</p>
            <p className="text-2xl font-bold">{out.toFixed(0)}</p>
            <p className="text-xs opacity-80">BMR {bmr} + burned</p>
          </div>

          <div className="text-right">
            <p className="text-sm opacity-80">Deficit</p>
            <p className="text-2xl font-bold">{def.toFixed(0)}</p>
            <p className="text-xs opacity-80">out − eaten</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <span className="y2k-pill y2k-pill-mint">
            {cheat ? 'Cheat counts ✓' : met700 ? '700 met ✓' : `Need ${MIN_DEFICIT}`}
          </span>

          <span className="y2k-pill y2k-pill-pink">
            {met1000 ? '+$1 earned' : cheat ? 'No bonus on cheat' : `Bonus at ${BONUS_DEFICIT}`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 y2k-btn y2k-btn-primary w-full"
        >
          Save day
        </button>

        {saveState === 'saved' && <p className="mt-2 text-sm">Saved ✓</p>}
      </div>
    </div>
  )
}
