import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

export default function Button({ variant = 'primary', className, ...props }: Props) {
  const base =
    'w-full rounded-2xl px-4 py-3 font-semibold transition active:scale-[0.99]'

  const styles =
    variant === 'primary'
      ? 'border border-pink-400/40 bg-pink-500/10 text-pink-200 hover:bg-pink-500/15'
      : 'border border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-900/60'

  return <button {...props} className={[base, styles, className ?? ''].join(' ')} />
}
