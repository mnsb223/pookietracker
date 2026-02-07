import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BMR, MIN_DEFICIT, BONUS_DEFICIT } from '../lib/config'
import { caloriesOut, deficit } from '../lib/rules'
import type { DailyLog } from '../lib/types'
import { getDailyLog, saveDailyLog, getProfile } from '../data/store'

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

  // Inputs stored as strings for input friendliness
  const [eaten, setEaten] = useState<string>('')
  const [burned, setBurned] = useState<string>('')
  const [gym, setGym] = useState<boolean>(false)

  // UI state
  const [loading, setLoading] = useState<boolean>(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  // Convert strings -> numbers
  const eatenNum = useMemo(() => {
    const n = Number(eaten)
    return Number.isFinite(n) ? n : 0
  }, [eaten])

  const burnedNum = useMemo(() => {
    const n = Number(burned)
    return Number.isFinite(n) ? n : 0
  }, [burned])

  // Live calculations
  const out = useMemo(() => caloriesOut(bmr, burnedNum), [bmr, burnedNum])
  const def = useMemo(() => deficit(out, eatenNum), [out, eatenNum])

  const met700 = def >= MIN_DEFICIT
  const met1000 = def >= BONUS_DEFICIT

  // --- Load log when date changes ---
  useEffect(() => {
    if (props.selectedDate) {
      setDate(props.selectedDate)
    }
  }, [props.selectedDate])

  // --- Save current day ---
  async function handleSave() {
    const log: DailyLog = {
      date,
      caloriesEaten: eatenNum,
      caloriesBurned: burnedNum,
      gym,
    }

    await saveDailyLog(log)
    setSaveState('saved')

    // Hide "Saved" after 1.5s
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Today</h2>
        {loading && <span className="text-sm text-zinc-400">Loading...</span>}
      </div>

      {/* Date */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="block text-sm text-zinc-300">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
        />
      </div>

      {/* Inputs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <div>
          <label className="block text-sm text-zinc-300">Calories eaten</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 1600"
            value={eaten}
            onChange={(e) => setEaten(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300">Calories burned (active)</label>
          <input
            inputMode="numeric"
            placeholder="e.g. 300"
            value={burned}
            onChange={(e) => setBurned(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </div>

        <button
          type="button"
          onClick={() => setGym((v) => !v)}
          className={[
            'w-full rounded-xl border px-3 py-2 font-medium transition',
            gym
              ? 'border-pink-400/40 bg-pink-500/10 text-pink-200'
              : 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-900/60',
          ].join(' ')}
        >
          {gym ? 'Gym: Yes' : 'Gym: No'}
        </button>
      </div>

      {/* Results */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Calories out (BMR + burned)</p>
            <p className="text-2xl font-bold">{out.toFixed(0)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">Deficit</p>
            <p className="text-2xl font-bold">{def.toFixed(0)}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full border px-3 py-1 text-sm',
              met700
                ? 'border-pink-400/40 bg-pink-500/10 text-pink-200'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300',
            ].join(' ')}
          >
            {met700 ? `700 met ✓` : `Need ${MIN_DEFICIT}`}
          </span>

          <span
            className={[
              'inline-flex items-center rounded-full border px-3 py-1 text-sm',
              met1000
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300',
            ].join(' ')}
          >
            {met1000 ? '+$1 earned ✓' : `Bonus at ${BONUS_DEFICIT}`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-4 w-full rounded-xl border border-pink-400/40 bg-pink-500/10 px-3 py-2 font-semibold text-pink-200 hover:bg-pink-500/15 transition"
        >
          Save day
        </button>

        {saveState === 'saved' && (
          <p className="mt-2 text-sm text-pink-200">Saved ✓</p>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          Using BMR: {bmr}
        </p>
      </div>
    </div>
  )
}
