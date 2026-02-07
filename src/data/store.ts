import { get, set, keys } from 'idb-keyval'
import type { DailyLog } from '../lib/types'
import type { Profile } from '../lib/types'

const PROFILE_KEY = 'profile'

function logKey(date: string): string {
  return `log:${date}`
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

/**
 * Fetch all DailyLog entries where date is between startDate and endDate inclusive.
 * Dates must be in "YYYY-MM-DD" format for string comparisons to work.
 */
export async function getLogsInRange(startDate: string, endDate: string): Promise<DailyLog[]> {
  const allKeys = await keys()
  const logs: DailyLog[] = []

  for (const key of allKeys) {
    if (typeof key !== 'string') continue
    if (!key.startsWith('log:')) continue

    const date = key.slice(4) // remove "log:"
    if (date >= startDate && date <= endDate) {
      const log = await get<DailyLog>(key)
      if (log) logs.push(log)
    }
  }

  // Sort by date ascending
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

  // Newest first
  dates.sort((a, b) => b.localeCompare(a))
  return dates
}
