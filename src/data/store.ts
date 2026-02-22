import { get, set, keys } from 'idb-keyval'
import type { DailyLog, Profile } from '../lib/types'
import { caloriesOut, deficit } from '../lib/rules'
import { MIN_DEFICIT } from '../lib/config'

const PROFILE_KEY = 'profile'
const STREAK_KEY = 'streak'
const COUNTDOWN_KEY = 'countdown'
const COUNTDOWN_START = 45000

type StreakState = {
  count: number
  lastDate: string | null
}

function logKey(date: string): string {
  return `log:${date}`
}

function parseISODate(dateISO: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateISO: string, days: number): string {
  const d = parseISODate(dateISO)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function todayISO(): string {
  return toISODate(new Date())
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function isValidISODate(s: string): boolean {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export async function getProfile(): Promise<Profile | null> {
  const value = await get<Profile>(PROFILE_KEY)
  return value ?? null
}

export async function saveProfile(profile: Profile): Promise<void> {
  await set(PROFILE_KEY, profile)
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const value = await get<DailyLog>(logKey(date))
  return value ?? null
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  await set(logKey(log.date), log)
}

export async function getLogsInRange(startDate: string, endDate: string): Promise<DailyLog[]> {
  const allKeys = await keys()
  const logs: DailyLog[] = []
  for (const key of allKeys) {
    if (typeof key !== 'string') continue
    if (!key.startsWith('log:')) continue
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
    if (typeof key !== 'string') continue
    if (!key.startsWith('log:')) continue
    dates.push(key.slice(4))
  }
  dates.sort((a, b) => b.localeCompare(a))
  return dates
}

export async function getStreak(): Promise<StreakState> {
  const value = await get<StreakState>(STREAK_KEY)
  if (!value || typeof value.count !== 'number') return { count: 0, lastDate: null }
  return { count: value.count ?? 0, lastDate: value.lastDate ?? null }
}

export async function saveStreak(next: StreakState): Promise<void> {
  await set(STREAK_KEY, next)
}

export async function resetStreak(): Promise<void> {
  await set(STREAK_KEY, { count: 0, lastDate: null } satisfies StreakState)
}

export async function rebuildStreakFromLogs(args: {
  bmr: number
  endDate?: string
}): Promise<StreakState> {
  const endDate = args.endDate && isValidISODate(args.endDate) ? args.endDate : todayISO()
  let cursor = endDate
  let lastQualifying: string | null = null

  for (let i = 0; i < 365; i++) {
    const log = await getDailyLog(cursor)
    if (log) {
      const isCheat = !!log.cheat
      const out = caloriesOut(args.bmr, log.caloriesBurned ?? 0)
      const defValue = deficit(out, log.caloriesEaten ?? 0)
      const met = isCheat ? true : defValue >= MIN_DEFICIT
      if (met) {
        lastQualifying = cursor
        break
      }
    }
    cursor = addDays(cursor, -1)
  }

  if (!lastQualifying) {
    const next = { count: 0, lastDate: null }
    await saveStreak(next)
    return next
  }

  let count = 0
  cursor = lastQualifying

  for (let i = 0; i < 365; i++) {
    const log = await getDailyLog(cursor)
    if (!log) break
    const isCheat = !!log.cheat
    const out = caloriesOut(args.bmr, log.caloriesBurned ?? 0)
    const defValue = deficit(out, log.caloriesEaten ?? 0)
    const met = isCheat ? true : defValue >= MIN_DEFICIT
    if (!met) break
    count += 1
    cursor = addDays(cursor, -1)
  }

  const next: StreakState = { count, lastDate: lastQualifying }
  await saveStreak(next)
  return next
}

export async function getCountdown(): Promise<number> {
  const value = await get<number>(COUNTDOWN_KEY)
  if (typeof value !== 'number' || !Number.isFinite(value)) return COUNTDOWN_START
  return clamp(value, 0, COUNTDOWN_START)
}

export async function saveCountdown(next: number): Promise<void> {
  await set(COUNTDOWN_KEY, clamp(next, 0, COUNTDOWN_START))
}

export async function resetCountdown(): Promise<void> {
  await set(COUNTDOWN_KEY, COUNTDOWN_START)
}

export async function rebuildCountdownFromLogs(args: {
  bmr: number
  endDate?: string
}): Promise<number> {
  const endDate = args.endDate && isValidISODate(args.endDate) ? args.endDate : todayISO()
  const allKeys = await keys()
  let sumOut = 0

  for (const key of allKeys) {
    if (typeof key !== 'string') continue
    if (!key.startsWith('log:')) continue
    const date = key.slice(4)
    if (!isValidISODate(date)) continue
    if (date > endDate) continue
    const log = await get<DailyLog>(key)
    if (!log) continue
    const out = caloriesOut(args.bmr, log.caloriesBurned ?? 0)
    if (Number.isFinite(out)) sumOut += out
  }

  const remaining = clamp(COUNTDOWN_START - sumOut, 0, COUNTDOWN_START)
  await saveCountdown(remaining)
  return remaining
}

export async function applySaveEffects(args: {
  date: string
  bmr: number
  eaten: number
  burned: number
  cheat: boolean
}): Promise<{ streak: StreakState; countdown: number; dayDeficit: number; dayOut: number }> {
  const { date, bmr, eaten, burned, cheat } = args

  const prevLog = await getDailyLog(date)

  const newOut = caloriesOut(bmr, burned)
  const newDef = deficit(newOut, eaten)

  const oldOut = prevLog ? caloriesOut(bmr, prevLog.caloriesBurned ?? 0) : 0
  const deltaOut = newOut - oldOut

  const prevCountdown = await getCountdown()
  const nextCountdown = clamp(prevCountdown - deltaOut, 0, COUNTDOWN_START)
  await saveCountdown(nextCountdown)

  const prevStreak = await getStreak()
  const met = cheat ? true : newDef >= MIN_DEFICIT

  let nextStreak: StreakState = { ...prevStreak }

  if (!met) {
    if (prevStreak.lastDate === date) {
      nextStreak = { count: 0, lastDate: null }
    }
  } else {
    if (prevStreak.lastDate === date) {
      nextStreak = prevStreak
    } else if (prevStreak.lastDate && addDays(prevStreak.lastDate, 1) === date) {
      nextStreak = { count: (prevStreak.count ?? 0) + 1, lastDate: date }
    } else {
      nextStreak = { count: 1, lastDate: date }
    }
  }

  await saveStreak(nextStreak)

  return { streak: nextStreak, countdown: nextCountdown, dayDeficit: newDef, dayOut: newOut }
}