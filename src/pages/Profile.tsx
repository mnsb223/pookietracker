import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BMR, DEFAULT_GOAL_WEIGHT } from '../lib/config'
import type { Profile } from '../lib/types'
import { getProfile, saveProfile } from '../data/store'

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Profile</h2>
        {loading && <span className="text-sm text-zinc-400">Loading...</span>}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <div>
          <label className="block text-sm text-zinc-300">Sedentary BMR</label>
          <input
            inputMode="numeric"
            value={bmr}
            onChange={(e) => setBmr(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-500">Used to compute calories out: BMR + burned.</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-300">Goal weight</label>
          <input
            inputMode="numeric"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-300">Program start date</label>
          <input
            type="date"
            value={programStartDate}
            onChange={(e) => setProgramStartDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-1 w-full rounded-xl border border-pink-400/40 bg-pink-500/10 px-3 py-2 font-semibold text-pink-200 hover:bg-pink-500/15 transition"
        >
          Save profile
        </button>

        {saveState === 'saved' && (
          <p className="text-sm text-pink-200">Saved ✓</p>
        )}
      </div>
    </div>
  )
}
