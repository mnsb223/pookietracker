import type { ReactNode } from 'react'

export default function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      {children}
    </div>
  )
}
