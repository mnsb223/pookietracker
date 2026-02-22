import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_BMR, DEFAULT_GOAL_WEIGHT, MIN_DEFICIT } from '../lib/config'
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
    return () => { cancelled = true }
  }, [])

  const bmrNum = useMemo(() => {
    const n = Number(bmr)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_BMR
  }, [bmr])

  const goalWeightNum = useMemo(() => {
    const n = Number(goalWeight)
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_GOAL_WEIGHT
  }, [goalWeight])

  const recommendedEatZeroBurn = useMemo(() => {
    return bmrNum - MIN_DEFICIT
  }, [bmrNum])

  const minCaloriesOutTarget = useMemo(() => {
    return bmrNum + MIN_DEFICIT
  }, [bmrNum])

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
          <h2 className="text-2xl font-extrabold tracking-tight y2k-title">Profile</h2>
          <p className="mt-1 text-sm y2k-subtitle">Make it cute, make it accurate.</p>
        </div>
        {loading && <div className="y2k-pill text-xs">Loading</div>}
      </div>

      <div className="y2k-card p-5 space-y-4">
        <div>
          <label className="block text-sm font-extrabold text-zinc-200">Sedentary BMR</label>
          <input
            inputMode="numeric"
            value={bmr}
            onChange={(e) => setBmr(e.target.value)}
            className="y2k-input mt-3"
          />
          <p className="mt-2 text-xs text-zinc-400">Used for calories out: BMR + burned.</p>
        </div>

        <div>
          <label className="block text-sm font-extrabold text-zinc-200">Goal weight</label>
          <input
            inputMode="numeric"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
            className="y2k-input mt-3"
          />
        </div>

        <div>
          <label className="block text-sm font-extrabold text-zinc-200">Program start date</label>
          <input
            type="date"
            value={programStartDate}
            onChange={(e) => setProgramStartDate(e.target.value)}
            className="y2k-input mt-3"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="y2k-btn y2k-btn-primary w-full"
        >
          Save profile
        </button>

        {saveState === 'saved' && (
          <p className="text-sm font-extrabold text-pink-200">Saved</p>
        )}

        <div className="y2k-card p-4 space-y-2">
          <p className="text-sm text-zinc-300">Effective BMR</p>
          <p className="text-2xl font-extrabold tracking-tight">{bmrNum}</p>
          <p className="text-sm text-zinc-300">Goal weight: {goalWeightNum}</p>
        </div>

        <div className="y2k-card p-4 space-y-2">
          <p className="text-sm font-extrabold">Recommended calories per day</p>
          <p className="text-sm opacity-90">
            To hit the minimum deficit with zero active burn, eat about{' '}
            <span className="font-extrabold">{recommendedEatZeroBurn.toFixed(0)}</span> calories per day.
          </p>
          <p className="text-xs opacity-80">
            Minimum calories-out target (BMR + minimum deficit): {minCaloriesOutTarget.toFixed(0)}.
          </p>
        </div>
      </div>
    </div>
  )
}