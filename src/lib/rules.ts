import {
  MIN_DEFICIT,
  BONUS_DEFICIT,
  GYM_MIN_PER_WEEK,
} from './config'

import type { DailyLog } from './types'

/* ---------- DAILY ---------- */

export function caloriesOut(bmr: number, burned: number): number {
  return bmr + burned
}

export function deficit(out: number, eaten: number): number {
  return out - eaten
}

export function metMinimum(def: number): boolean {
  return def >= MIN_DEFICIT
}

export function earnedDollar(def: number): boolean {
  return def >= BONUS_DEFICIT
}

/* ---------- WEEKLY ---------- */

export function weeklySummary(logs: DailyLog[]) {
  let gymDays = 0
  let metMinDays = 0
  let dollars = 0

  for (const log of logs) {
    if (log.gym) gymDays++

    const def = log.caloriesBurned + 0 - log.caloriesEaten // BMR handled earlier

    if (metMinimum(def)) metMinDays++
    if (earnedDollar(def)) dollars++
  }

  const calorieConsistent = metMinDays === 7
  const gymConsistent = gymDays >= GYM_MIN_PER_WEEK

  return {
    gymDays,
    metMinDays,
    dollars,
    calorieConsistent,
    gymConsistent,
    weekSuccessful: calorieConsistent && gymConsistent,
  }
}
