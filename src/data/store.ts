import { get, set, del, keys } from 'idb-keyval'
import type { Profile, DailyLog } from '../lib/types'

/* ---------------- PROFILE ---------------- */

const PROFILE_KEY = 'profile'

export async function getProfile(): Promise<Profile | null> {
  const value = await get<Profile>(PROFILE_KEY)
  return value ?? null
}

export async function saveProfile(profile: Profile): Promise<void> {
  await set(PROFILE_KEY, profile)
}

/* ---------------- DAILY LOGS ---------------- */

function logKey(date: string): string {
  return `log:${date}` // e.g. log:2026-02-07
}

export async function getDailyLog(date: string): Promise<DailyLog | null> {
  const value = await get<DailyLog>(logKey(date))
  return value ?? null
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  await set(logKey(log.date), log)
}

export async function deleteDailyLog(date: string): Promise<void> {
  await del(logKey(date))
}

/* ---------------- WEEK / RANGE ---------------- */

export async function getLogsInRange(
  startDate: string,
  endDate: string
): Promise<DailyLog[]> {
  const allKeys = await keys()
  const logs: DailyLog[] = []

  for (const key of allKeys) {
    if (typeof key !== 'string') continue
    if (!key.startsWith('log:')) continue

    const date = key.replace('log:', '')

    if (date >= startDate && date <= endDate) {
      const log = await get<DailyLog>(key)
      if (log) logs.push(log)
    }
  }

  return logs
}
