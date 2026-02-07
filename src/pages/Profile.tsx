import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BMR, DEFAULT_GOAL_WEIGHT } from '../lib/config'
import type { Profile } from '../lib/types'
import { getProfile, saveProfile } from '../data/store'

const CARD =
  'rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
const INPUT =
  'mt-2 block w-full min-w-0 max-w-full box-border ' +
  'rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-pink-400/40'

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Profile() {
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  const [bmr, setBmr] = useState<string>(String(DEFAULT_BMR))
  const [goalWeight, setGoalWeight] = useState<string>(String(DEFAULT_GOAL_WEIGHT))
  const [programStartDate, setProgramStartDate] = useState<string>(todayISO())

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const profile = await getProfile()
      if (cancelled) return

      if (profile) {
        setBmr(String(profile.bmr))
        setGoalWeight(String(profile.goalWeight))
        setProgramStartDate(profile.programStartDate)
      }

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const bmrNum = useMemo(() => {
    const n = Number(bmr)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_BMR
  }, [bmr])

  const goalWeightNum = useMemo(() => {
    const n = Number(goalWeight)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_GOAL_WEIGHT
  }, [goalWeight])

  async function handleSave() {
    const profile: Profile = {
      bmr: bmrNum,
      goalWeight: goalWeightNum,
      programStartDate,
    }

    await saveProfile(profile)
    setSaveState('saved')
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
          <p className="mt-1 text-sm text-zinc-400">These settings affect calculations.</p>
        </div>

        {loading && (
          <div className="rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300">
            Loading…
          </div>
        )}
      </div>

      <div className={[CARD, 'space-y-4'].join(' ')}>
        <div>
          <label className="block text-sm font-medium text-zinc-300">Sedentary BMR</label>
          <input
            inputMode="numeric"
            value={bmr}
            onChange={(e) => setBmr(e.target.value)}
            className={INPUT}
          />
          <p className="mt-1 text-xs text-zinc-500">Used for calories out: BMR + burned.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Goal weight</label>
          <input
            inputMode="numeric"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
            className={INPUT}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">Program start date</label>
          <input
            type="date"
            value={programStartDate}
            onChange={(e) => setProgramStartDate(e.target.value)}
            className={INPUT}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-2xl border border-pink-400/40 bg-pink-500/15 px-4 py-3 font-semibold text-pink-200 transition hover:bg-pink-500/20 active:scale-[0.99]"
        >
          Save profile
        </button>

        {saveState === 'saved' && (
          <p className="text-sm font-semibold text-pink-200">Saved ✓</p>
        )}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-300">Current effective BMR:</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{bmrNum}</p>
        </div>
      </div>
    </div>
  )
}
