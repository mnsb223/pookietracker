// types.ts
// This file defines the shape of our data

// User profile / settings
export type Profile = {
  bmr: number
  goalWeight: number
  programStartDate: string // ISO date string: "2026-02-07"
}

// One day of logged data
export type DailyLog = {
  date: string             // "YYYY-MM-DD"
  caloriesEaten: number
  caloriesBurned: number
  gym: boolean
  cheat?: boolean
}
