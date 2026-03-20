import { MIN_DEFICIT, BONUS_DEFICIT } from './config'

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
