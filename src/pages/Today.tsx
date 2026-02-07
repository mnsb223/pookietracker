import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BMR, MIN_DEFICIT, BONUS_DEFICIT } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'
import type { DailyLog } from '../lib/types'
import { getDailyLog, getProfile, saveDailyLog } from '../data/store'

const CARD =
  'rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
const INPUT =
  'mt-2 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-pink-400/40'

function todayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Today(props: { selectedDate?: string }) {
  const [bmr, setBmr] = useState<number>(DEFAULT_BMR)
  const [date, setDate] = useState<string>(props.selectedDate ?? todayISO())

  const [eaten, setEaten] = useState<string>('')
  const [burned, setBurned] = useState<string>('')
  const [gym, setGym] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  // Sync date from History -> Today
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

  // Load saved day whenever date changes
  useEffect(() => {
    let cancelled = false

    async function loadDay() {
      setLoading(true)
      setSaveState('idle')

      const log = await getDailyLog(date)

      if (cancelled) return

      if (!log) {
        setEaten('')
        setBurned('')
        setGym(false)
      } else {
        setEaten(String(log.caloriesEaten))
        setBurned(String(log.caloriesBurned))
        setGym(log.gym)
      }

      setLoading(false)
    }

    loadDay()
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

  const met700 = def >= MIN_DEFICIT
  const met1000 = def >= BONUS_DEFICIT

  const pct700 = Math.max(0, Math.min(1, def / MIN_DEFICIT))

  async function handleSave() {
    const log: DailyLog = {
      date,
      caloriesEaten: eatenNum,
      caloriesBurned: burnedNum,
      gym,
    }

    await saveDailyLog(log)
    setSaveState('saved')
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Today</h2>
          <p className="mt-1 text-sm text-zinc-400">Log the day and hit save.</p>
        </div>

        {loading && (
          <div className="rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300">
            Loading…
          </div>
        )}
      </div>

      {/* Date */}
      <div className={CARD}>
        <label className="block text-sm font-medium text-zinc-300">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={INPUT}
        />
        <p className="mt-2 text-xs text-zinc-500">Tap a day to edit it later in History.</p>
      </div>

      {/* Inputs */}
      <div className={[CARD, 'space-y-4'].join(' ')}>
        <div>
          <label className="block text-sm font-medium text-zinc-300">Calories eaten</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 1600"
            value={eaten}
            onChange={(e) => setEaten(e.target.value)}
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Calories burned</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 300"
            value={burned}
            onChange={(e) => setBurned(e.target.value)}
            className={INPUT}
          />
          <p className="mt-1 text-xs text-zinc-500">Active calories only.</p>
        </div>

        <button
          type="button"
          onClick={() => setGym((v) => !v)}
          className={[
            'w-full rounded-2xl px-4 py-3 font-semibold transition active:scale-[0.99]',
            'border',
            gym
              ? 'border-pink-400/40 bg-pink-500/15 text-pink-200'
              : 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-900/60',
          ].join(' ')}
        >
          {gym ? '🏋️ Gym: Yes' : '🏋️ Gym: No'}
        </button>
      </div>

      {/* Results */}
      <div className={CARD}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Calories out</p>
            <p className="text-3xl font-bold tracking-tight">{out.toFixed(0)}</p>
            <p className="mt-1 text-xs text-zinc-500">BMR {bmr} + burned</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">Deficit</p>
            <p className="text-3xl font-bold tracking-tight">{def.toFixed(0)}</p>
            <p className="mt-1 text-xs text-zinc-500">out − eaten</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
              met700
                ? 'border-pink-400/40 bg-pink-500/15 text-pink-200'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300',
            ].join(' ')}
          >
            {met700 ? '✓ 700 met' : `Need ${MIN_DEFICIT}`}
          </span>

          <span
            className={[
              'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
              met1000
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300',
            ].join(' ')}
          >
            {met1000 ? '💗 +$1 earned' : `Bonus at ${BONUS_DEFICIT}`}
          </span>
        </div>

        {/* Progress to 700 */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Progress to 700</span>
            <span>{Math.round(pct700 * 100)}%</span>
          </div>

          <div className="mt-2 h-3 w-full overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
            <div
              className={[
                'h-full transition-all duration-300',
                met700 ? 'bg-pink-500/60' : 'bg-pink-500/30',
              ].join(' ')}
              style={{ width: `${pct700 * 100}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-5 w-full rounded-2xl border border-pink-400/40 bg-pink-500/15 px-4 py-3 font-semibold text-pink-200 transition hover:bg-pink-500/20 active:scale-[0.99]"
        >
          Save day
        </button>

        {saveState === 'saved' && (
          <p className="mt-2 text-sm font-semibold text-pink-200">Saved ✓</p>
        )}
      </div>
    </div>
  )
}
