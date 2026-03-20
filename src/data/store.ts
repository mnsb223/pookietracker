import { get, set, keys } from 'idb-keyval'
import type { DailyLog, Profile } from '../lib/types'
import { caloriesOut, deficit } from '../lib/rules'
import { MIN_DEFICIT, COUNTDOWN_START } from '../lib/config'

const PROFILE_KEY = 'profile'
const STREAK_KEY = 'streak'
const COUNTDOWN_KEY = 'countdown'

// --- Date utils (exported so pages don't duplicate them) ---

export function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateISO: string, days: number): string {
  const d = parseISODate(dateISO)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function todayISO(): string {
  return toISODate(new Date())
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function isValidISODate(s: string): boolean {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

// --- Profile ---

export async function getProfile(): Promise<Profile | null> {
  const value = await get<Profile>(PROFILE_KEY)
  return value ?? null
}

export async function saveProfile(profile: Profile): Promise<void> {
  await set(PROFILE_KEY, profile)
}

// --- Daily logs ---

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const value = await get<DailyLog>(`log:${date}`)
  return value ?? null
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  await set(`log:${log.date}`, log)
}

export async function getLogsInRange(startDate: string, endDate: string): Promise<DailyLog[]> {
  const allKeys = await keys()
  const logs: DailyLog[] = []
  for (const key of allKeys) {
    if (typeof key !== 'string' || !key.startsWith('log:')) continue
    const date = key.slice(4)
    if (date >= startDate && date <= endDate) {
      const log = await get<DailyLog>(key)
      if (log) logs.push(log)
    }
  }
  logs.sort((a, b) => a.date.localeCompare(b.date))
  return logs
}

export async function listLogDates(): Promise<string[]> {
  const allKeys = await keys()
  const dates: string[] = []
  for (const key of allKeys) {
    if (typeof key !== 'string' || !key.startsWith('log:')) continue
    dates.push(key.slice(4))
  }
  dates.sort((a, b) => b.localeCompare(a))
  return dates
}

// --- Streak ---
// Always recomputed from logs — no delta math, no drift.

export async function getStreak(): Promise<number> {
  const value = await get<number>(STREAK_KEY)
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

export async function rebuildStreak(bmr: number): Promise<number> {
  const end = todayISO()
  let cursor = end
  let lastQualifying: string | null = null

  // Walk backwards to find the most recent qualifying day
  for (let i = 0; i < 365; i++) {
    const log = await getDailyLog(cursor)
    if (log) {
      const effectiveBmr = log.bmr ?? bmr
      const out = caloriesOut(effectiveBmr, log.caloriesBurned ?? 0)
      const def = deficit(out, log.caloriesEaten ?? 0)
      if (log.cheat || def >= MIN_DEFICIT) {
        lastQualifying = cursor
        break
      }
    }
    cursor = addDays(cursor, -1)
  }

  if (!lastQualifying) {
    await set(STREAK_KEY, 0)
    return 0
  }

  // Count consecutive qualifying days backwards from lastQualifying
  let count = 0
  cursor = lastQualifying
  for (let i = 0; i < 365; i++) {
    const log = await getDailyLog(cursor)
    if (!log) break
    const effectiveBmr = log.bmr ?? bmr
    const out = caloriesOut(effectiveBmr, log.caloriesBurned ?? 0)
    const def = deficit(out, log.caloriesEaten ?? 0)
    if (!log.cheat && def < MIN_DEFICIT) break
    count++
    cursor = addDays(cursor, -1)
  }

  await set(STREAK_KEY, count)
  return count
}

// --- Countdown ---
// Always recomputed from logs — no delta math, no drift.

export async function getCountdown(): Promise<number> {
  const value = await get<number>(COUNTDOWN_KEY)
  if (typeof value !== 'number' || !Number.isFinite(value)) return COUNTDOWN_START
  return clamp(value, 0, COUNTDOWN_START)
}

export async function rebuildCountdown(bmr: number, startDate?: string): Promise<number> {
  const end = todayISO()
  const allKeys = await keys()
  let sumOut = 0

  for (const key of allKeys) {
    if (typeof key !== 'string' || !key.startsWith('log:')) continue
    const date = key.slice(4)
    if (!isValidISODate(date)) continue
    if (startDate && isValidISODate(startDate) && date < startDate) continue
    if (date > end) continue

    const log = await get<DailyLog>(key)
    if (!log) continue
    const effectiveBmr = log.bmr ?? bmr
    const out = caloriesOut(effectiveBmr, log.caloriesBurned ?? 0)
    if (Number.isFinite(out)) sumOut += out
  }

  const remaining = clamp(COUNTDOWN_START - sumOut, 0, COUNTDOWN_START)
  await set(COUNTDOWN_KEY, remaining)
  return remaining
}
